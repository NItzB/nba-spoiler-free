import os
import sys
import json
from datetime import datetime, timedelta
import requests

# Configuration
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_DB_PASSWORD") # user reused the same secret name
SUPABASE_URL = "https://jffhhtbhecstgyhmiabn.supabase.co"

def log(msg):
    print(f"[SCORE AGENT] {msg}", flush=True)

def calculate_excitement(home_score, away_score, is_ot):
    margin = abs(home_score - away_score)
    total_score = home_score + away_score
    
    score = 7.0
    tags = []
    
    # Overtime logic
    if is_ot:
        score += 1.5
        tags.append("OT")
        
    # Margin logic
    if margin <= 3:
        score += 2.0
        tags.append("Clutch Ending")
    elif margin <= 5:
        score += 1.0
        tags.append("Close Game")
    elif margin >= 20:
        score -= 2.0
        tags.append("Blowout")
        
    # High scoring logic
    if total_score >= 240:
        score += 0.5
        tags.append("High Scoring")
    elif total_score <= 180:
        score -= 1.0
        tags.append("Defensive Battle")
        
    # Cap score
    score = max(0.0, min(10.0, score))
    return round(score, 1), tags

def fetch_and_insert_for_date(target_date):
    date_str = target_date.strftime('%Y%m%d')
    db_date_str = target_date.strftime('%Y-%m-%d')
    
    log(f"--- Processing Date: {db_date_str} ---")
    url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={date_str}"
    
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        log(f"Failed to fetch data from ESPN: {e}")
        return
        
    events = data.get('events', [])
    if not events:
        log("No games found for this date.")
        return
    
    payload = []
    
    for event in events:
        try:
            competition = event['competitions'][0]
            status = competition['status']
            
            # Skip games that aren't completed
            if not status['type']['completed']:
                continue
                
            period = status['period']
            is_ot = period > 4
            
            home_team = None
            away_team = None
            home_score = 0
            away_score = 0
            
            for competitor in competition['competitors']:
                team_abbr = competitor['team']['abbreviation']
                score = int(competitor['score'])
                
                if competitor['homeAway'] == 'home':
                    home_team = team_abbr
                    home_score = score
                else:
                    away_team = team_abbr
                    away_score = score
            
            excitement_score, tags = calculate_excitement(home_score, away_score, is_ot)
            final_score_str = f"{home_score}-{away_score}"
            
            payload.append({
                "date": db_date_str,
                "home_team": home_team,
                "away_team": away_team,
                "excitement_score": excitement_score,
                "tags": tags,
                "final_score": final_score_str,
                "is_overtime": is_ot,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            })
            log(f"Prepared: {away_team} @ {home_team} | Score: {excitement_score}")
            
        except Exception as e:
            log(f"Error processing game {event.get('shortName')}: {e}")
            continue

    if not payload:
        log("No completed games to insert right now.")
        return

    # Delete existing records for this date to prevent duplicates (Idempotent update)
    rest_url = f"{SUPABASE_URL}/rest/v1/nba_daily_ranks"
    delete_url = f"{rest_url}?date=eq.{db_date_str}"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    try:
        # 1. Delete old
        requests.delete(delete_url, headers=headers, timeout=15)
        # 2. Insert new
        response = requests.post(rest_url, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        log(f"Successfully inserted/updated {len(payload)} games for {db_date_str}!")
    except Exception as e:
        log(f"Failed to update database: {e}")
        if hasattr(e, 'response') and e.response is not None:
             log(f"Response: {e.response.text}")

def run():
    if not SERVICE_ROLE_KEY:
        log("ERROR: SUPABASE_DB_PASSWORD (holding the service role key) missing.")
        sys.exit(1)
        
    utc_now = datetime.now()
    
    # We will check both Today and Yesterday to ensure we catch everything
    dates_to_check = [
        utc_now - timedelta(days=1), # Yesterday
        utc_now                      # Today
    ]
    
    for d in dates_to_check:
        fetch_and_insert_for_date(d)

if __name__ == "__main__":
    run()
