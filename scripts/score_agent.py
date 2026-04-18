import os
import sys
from datetime import datetime, timedelta
import requests

# Configuration
SUPABASE_URL = "https://jffhhtbhecstgyhmiabn.supabase.co"
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_DB_PASSWORD") # We re-used the secret name

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

def run():
    if not SUPABASE_SERVICE_KEY:
        log("ERROR: SUPABASE_DB_PASSWORD (Service Key) missing.")
        sys.exit(1)
        
    # Fetch yesterday's games
    yesterday_date = datetime.now() - timedelta(days=1)
    date_str = yesterday_date.strftime('%Y%m%d')
    db_date_str = yesterday_date.strftime('%Y-%m-%d')
    
    log(f"Fetching games for {date_str} from ESPN API...")
    url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={date_str}"
    
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        log(f"Failed to fetch data from ESPN: {e}")
        sys.exit(1)
        
    events = data.get('events', [])
    if not events:
        log("No games found for this date.")
        sys.exit(0)
        
    log("Connecting to Supabase REST API...")
    supabase_api_url = f"{SUPABASE_URL}/rest/v1/nba_daily_ranks"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    log(f"Processing {len(events)} games...")
    inserted_count = 0
    
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
            
            payload = {
                "date": db_date_str,
                "home_team": home_team,
                "away_team": away_team,
                "excitement_score": excitement_score,
                "tags": tags,
                "final_score": final_score_str,
                "is_overtime": is_ot
            }
            
            # Insert into database using REST
            res = requests.post(supabase_api_url, headers=headers, json=payload)
            res.raise_for_status()
            
            inserted_count += 1
            log(f"Inserted: {home_team} vs {away_team} | Score: {excitement_score}")
            
        except Exception as e:
            log(f"Error processing game {event.get('shortName')}: {e}")
            continue
            
    log(f"Successfully inserted {inserted_count} games to database!")

if __name__ == "__main__":
    run()
