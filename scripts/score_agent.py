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

def fetch_boxscore(game_id):
    """Fetches full player box score from ESPN Summary API"""
    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}"
        resp = requests.get(url, timeout=10)
        data = resp.json()
        
        boxscore = data.get('boxscore', {})
        players_data = boxscore.get('players', [])
        
        teams_stats = []
        for team_box in players_data:
            team_info = team_box.get('team', {})
            stats_list = team_box.get('statistics', [])
            if not stats_list: continue
            
            # Usually index 0 is the main player stats
            main_stats = stats_list[0]
            labels = main_stats.get('labels', [])
            athletes = main_stats.get('athletes', [])
            
            processed_players = []
            for entry in athletes:
                player = entry.get('athlete', {})
                stats = entry.get('stats', [])
                
                # Create a simple stats dictionary
                stat_dict = {
                    "name": player.get('displayName'),
                    "active": entry.get('active', True),
                    "pos": player.get('position', {}).get('abbreviation')
                }
                # Map headers (MIN, PTS, etc) to lower case keys
                for i, label in enumerate(labels):
                    if i < len(stats):
                        stat_dict[label.lower().replace('+/-', 'plus_minus')] = stats[i]
                
                processed_players.append(stat_dict)
                
            teams_stats.append({
                "team": team_info.get('abbreviation'),
                "players": processed_players
            })
        return teams_stats
    except Exception as e:
        log(f"Error fetching boxscore for {game_id}: {e}")
        return None

def calculate_excitement(home_score, away_score, is_ot, leaders=None):
    margin = abs(home_score - away_score)
    total_score = home_score + away_score
    
    score = 7.0
    tags = []
    
    # Overtime logic
    if is_ot:
        score += 1.5
        tags.append("OT")
        
    score = 6.5  # Base score (Decent+)
    tags = []
    
    margin = abs(home_score - away_score)
    total_score = home_score + away_score
    
    if is_ot:
        score += 1.5
        tags.append("OT")
        
    # 1. Margin-based excitement (Bonuses and Reductions)
    if margin <= 3:
        score += 2.0
        tags.append("Clutch Ending")
    elif margin <= 5:
        score += 1.0
        tags.append("Close Game")
    elif margin >= 25:
        score -= 3.0
        tags.append("Blowout")
    elif margin >= 15:
        score -= 1.5
        tags.append("Blowout")

    # 2. Score intensity
    if total_score >= 235:
        score += 1.0
        tags.append("High Scoring")
    elif total_score <= 185 and total_score > 0:
        score -= 0.5
        tags.append("Defensive Battle")

    # 3. Individual performances
    if leaders:
        max_pts = 0
        for leader_group in leaders:
            if leader_group and 'stat' in leader_group:
                try:
                    pts = int(leader_group['stat'].split()[0])
                    max_pts = max(max_pts, pts)
                except:
                    pass
        
        if max_pts >= 45:
            score += 2.0
            tags.append("Star Performance")
        elif max_pts >= 35:
            score += 1.0
            tags.append("Star Performance")
        elif max_pts >= 30:
            score += 0.5
            tags.append("Top Performer")
        
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
            status_type = status['type']['name']
            
            game_time_utc = event.get('date') # ISO timestamp of game start
            
            # Types: STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_HALFTIME, STATUS_FINAL
            if status_type == 'STATUS_SCHEDULED':
                is_completed = False
                game_status = 'scheduled'
            else:
                is_completed = status['type']['completed']
                game_status = 'completed' if is_completed else 'in_progress'
                
            period = status.get('period', 0)
            is_ot = period > 4
            
            home_team = None
            away_team = None
            home_score = 0
            away_score = 0
            
            for competitor in competition['competitors']:
                team_abbr = competitor['team']['abbreviation']
                score_str = competitor.get('score', '0')
                score = int(score_str) if score_str else 0
                
                if competitor['homeAway'] == 'home':
                    home_team = team_abbr
                    home_score = score
                else:
                    away_team = team_abbr
                    away_score = score
            
            notes = competition.get('notes', [])
            game_note = notes[0].get('headline') if notes else None
            
            # Compute excitement and tags for completed AND live games
            if game_status in ['completed', 'in_progress']:
                excitement_score, tags = calculate_excitement(home_score, away_score, is_ot)
                final_score_str = f"{home_score}-{away_score}"
                if game_status == 'in_progress' and 'Live' not in tags:
                    tags.append('Live')
            else:
                excitement_score = 0
                tags = ['Upcoming']
                final_score_str = None
                
            if game_note:
                tags.append(game_note)
                
            series_summary = None
            series_info = competition.get('series')
            if series_info and 'summary' in series_info:
                series_summary = series_info['summary']
            
            venue_name = competition.get('venue', {}).get('fullName')
            live_clock = status.get('displayClock')
            live_period = status.get('period')
            
            game_recap = None
            headlines = competition.get('headlines', [])
            if not headlines:
                headlines = event.get('headlines', [])
            
            if headlines:
                game_recap = headlines[0].get('shortLinkText') or headlines[0].get('description')

            home_record = ""
            away_record = ""
            home_leaders = {}
            away_leaders = {}
            home_line = []
            away_line = []

            for comp in competition['competitors']:
                # Record
                rec_summary = ""
                recs = comp.get('records', [])
                if recs:
                    rec_summary = recs[0].get('summary', "")
                
                # leaders
                leader_obj = {}
                leaders_cats = comp.get('leaders', [])
                if leaders_cats:
                    # Look for points category (or rating for more stats)
                    pts_cat = next((c for c in leaders_cats if c.get('name') == 'points'), None)
                    if pts_cat and pts_cat.get('leaders'):
                        top_leader = pts_cat['leaders'][0]
                        leader_obj = {
                            "name": top_leader.get('athlete', {}).get('displayName'),
                            "stat": top_leader.get('displayValue'),
                            "headshot": top_leader.get('athlete', {}).get('headshot')
                        }
                
                # Linescores
                lines = [ls.get('value') for ls in comp.get('linescores', [])]

                if comp['homeAway'] == 'home':
                    home_record = rec_summary
                    home_leaders = leader_obj
                    home_line = lines
                else:
                    away_record = rec_summary
                    away_leaders = leader_obj
                    away_line = lines

            # Fetch full boxscore for in_progress or completed games
            boxscore_data = None
            if game_status in ['in_progress', 'completed']:
                log(f"Fetching boxscore for {event.get('id')}...")
                boxscore_data = fetch_boxscore(event.get('id'))

            # Re-calculating excitement with leaders if completed
            if game_status == 'completed':
                excitement_score, tags = calculate_excitement(home_score, away_score, is_ot, [home_leaders, away_leaders])
            
            # Clean up duplicate status tags for UI
            if game_status == 'in_progress' and 'Live' not in tags:
                tags.append('Live')
            elif game_status == 'scheduled' and 'Upcoming' not in tags:
                tags.append('Upcoming')

            # Add context tags from ESPN notes/headlines (e.g., "Game 7", "Play-In")
            if game_note:
                if game_note not in tags: 
                    tags.append(game_note)

            payload.append({
                "date": db_date_str,
                "home_team": home_team,
                "away_team": away_team,
                "excitement_score": excitement_score,
                "tags": tags,
                "final_score": final_score_str,
                "game_time_utc": game_time_utc,
                "is_overtime": is_ot,
                "status": game_status,
                "series_summary": series_summary,
                "home_record": home_record,
                "away_record": away_record,
                "venue_name": venue_name,
                "live_period": live_period,
                "live_clock": live_clock,
                "game_recap": game_recap,
                "home_leaders": home_leaders,
                "away_leaders": away_leaders,
                "home_line": home_line,
                "away_line": away_line,
                "boxscore_data": boxscore_data,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            })
            log(f"Prepared: {away_team} @ {home_team} | Status: {game_status} | Score: {excitement_score}")
            
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
