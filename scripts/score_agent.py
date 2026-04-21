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
                    "starter": entry.get('starter', False),
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

def calculate_excitement(home_score, away_score, is_ot, leaders=None, home_record="0-0", away_record="0-0"):
    margin = abs(home_score - away_score)
    total_score = home_score + away_score
    
    score = 6.5 # Robust base for production look
    tags = []
    
    # 1. Underdog / Upset Logic (Spoiler-Free)
    def get_win_pct(record_str):
        try:
            if not record_str or '-' not in record_str: return 0.5
            w, l = map(int, record_str.split('-'))
            if w + l == 0: return 0.5
            return w / (w + l)
        except: return 0.5

    home_win_pct = get_win_pct(home_record)
    away_win_pct = get_win_pct(away_record)

    winner_was_underdog = False
    upset_gap = 0
    is_away_winner = False

    if home_score > away_score:
        if away_win_pct > home_win_pct + 0.05:
            winner_was_underdog = True
            upset_gap = away_win_pct - home_win_pct
    elif away_score > home_score:
        is_away_winner = True
        if home_win_pct > away_win_pct + 0.05:
            winner_was_underdog = True
            upset_gap = home_win_pct - away_win_pct

    if winner_was_underdog:
        # Scale upset gap (e.g., 0.15 gap * 10 = 1.5 bonus)
        upset_bonus = upset_gap * 10
        if is_away_winner: upset_bonus *= 1.5 # Road upsets are significantly more exciting
        score += min(upset_bonus, 3.5) # Cap upset bonus so it doesn't break the scale
        
    # 2. Overtime logic
    if is_ot:
        score += 2.5
        tags.append("OT Thriller")
        
    # 3. Margin-based excitement
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

    # 4. Score intensity
    if total_score >= 235:
        score += 1.0
        tags.append("High Scoring")
    elif total_score <= 185 and total_score > 0:
        score -= 0.5
        tags.append("Defensive Battle")

    # 5. Individual performances
    if leaders:
        max_pts = 0
        for leader in leaders:
            try:
                # leader can be a dict (from local leaders_list) or raw ESPN leader
                val_str = leader.get('displayValue', '0')
                if ' ' in val_str: val_str = val_str.split()[0]
                pts = int(val_str)
                max_pts = max(max_pts, pts)
            except: pass
        
        if max_pts >= 45:
            score += 2.0
            tags.append("Star Performance")
        elif max_pts >= 35:
            score += 1.0
            tags.append("Star Performance")
        elif max_pts >= 30:
            score += 0.5
            tags.append("Top Performer")
        
    # Clamp and Round
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
            game_time_utc = event.get('date')
            
            # Types: STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_HALFTIME, STATUS_FINAL
            if status_type == 'STATUS_SCHEDULED':
                is_completed = False
                game_status = 'scheduled'
            else:
                is_completed = status['type']['completed']
                game_status = 'completed' if is_completed else 'in_progress'
                
            period = status.get('period', 0)
            is_ot = period > 4
            
            home_team = away_team = None
            home_score = away_score = 0
            home_record = away_record = "0-0"
            home_leaders = away_leaders = {}
            home_line = away_line = []
            
            # Leader list for excitement calculation
            all_points_leaders = []

            for comp in competition['competitors']:
                team_abbr = comp['team']['abbreviation']
                score_val = int(comp.get('score', '0') or 0)
                
                # Fetch Record
                rec_summary = "0-0"
                for r in comp.get('records', []):
                    if r.get('type') == 'total' or r.get('name') == 'overall':
                        rec_summary = r.get('summary', "0-0")
                        break
                
                # Fetch Points Leader for Card
                pts_leader = {}
                leaders_cats = comp.get('leaders', [])
                for cat in leaders_cats:
                    if cat.get('name') == 'points' and cat.get('leaders'):
                        top = cat['leaders'][0]
                        pts_leader = {
                            "name": top.get('athlete', {}).get('displayName'),
                            "stat": top.get('displayValue'),
                            "headshot": top.get('athlete', {}).get('headshot')
                        }
                        all_points_leaders.append(top)
                        break

                # Linescores
                lines = [ls.get('value') for ls in comp.get('linescores', [])]

                if comp['homeAway'] == 'home':
                    home_team, home_score, home_record, home_leaders, home_line = team_abbr, score_val, rec_summary, pts_leader, lines
                else:
                    away_team, away_score, away_record, away_leaders, away_line = team_abbr, score_val, rec_summary, pts_leader, lines

            # Calculate excitement and tags
            excitement_score = 0
            tags = []
            final_score_str = f"{away_score}-{home_score}"

            if game_status in ['completed', 'in_progress']:
                excitement_score, tags = calculate_excitement(
                    home_score, away_score, is_ot, 
                    leaders=all_points_leaders,
                    home_record=home_record, away_record=away_record
                )
                if game_status == 'in_progress':
                    tags.append('Live')
            else:
                tags = ['Upcoming']
                final_score_str = None

            # Add context tags from ESPN notes
            notes = competition.get('notes', [])
            if notes:
                n_tag = notes[0].get('headline')
                if n_tag and n_tag not in tags: tags.append(n_tag)

            # Metadata
            series_summary = competition.get('series', {}).get('summary')
            venue_name = competition.get('venue', {}).get('fullName')
            live_clock = status.get('displayClock')
            live_period = status.get('period')
            
            # Headlines/Recap
            headlines = competition.get('headlines', []) or event.get('headlines', [])
            game_recap = headlines[0].get('shortLinkText') or headlines[0].get('description') if headlines else None

            # Fetch Boxscore
            boxscore_data = None
            if game_status in ['in_progress', 'completed']:
                log(f"Fetching boxscore for {event.get('id')}...")
                boxscore_data = fetch_boxscore(event.get('id'))

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
            log(f"Prepared: {away_team} @ {home_team} | Score: {excitement_score} | Status: {game_status}")
            
        except Exception as e:
            log(f"Error processing game {event.get('shortName', 'ID:'+event.get('id', '?'))}: {e}")
            continue

    if not payload:
        log("No games to insert for this date.")
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
        requests.delete(delete_url, headers=headers, timeout=15)
        response = requests.post(rest_url, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        log(f"Successfully updated {len(payload)} games for {db_date_str}!")
    except Exception as e:
        log(f"Failed to update database: {e}")

def fetch_playoff_bracket():
    """Fetch and store current NBA playoff bracket from ESPN v2 API"""
    season = datetime.now().year
    try:
        url = "https://site.api.espn.com/apis/v2/sports/basketball/nba/playoffs"
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        log(f"Playoff API top-level keys: {list(data.keys())}")

        series_payload = []

        # ESPN v2 structure: full_rounds -> legs -> bracket_group -> series
        full_rounds = data.get('full_rounds', data.get('rounds', []))

        for rnd in full_rounds:
            round_num = rnd.get('number', 0)
            legs = rnd.get('legs', [])

            for leg in legs:
                conf_name = leg.get('name', '')
                if 'east' in conf_name.lower():
                    conference = 'East'
                elif 'west' in conf_name.lower():
                    conference = 'West'
                else:
                    conference = 'Finals'

                bracket_group = leg.get('bracket_group', {})
                for series in bracket_group.get('series', []):
                    competitors = series.get('competitors', [])
                    if len(competitors) < 2:
                        continue

                    c1, c2 = competitors[0], competitors[1]
                    team1 = c1.get('team', {}).get('abbreviation')
                    team2 = c2.get('team', {}).get('abbreviation')
                    seed1 = (c1.get('seed') or {}).get('rank')
                    seed2 = (c2.get('seed') or {}).get('rank')
                    wins1 = int(c1.get('wins') or 0)
                    wins2 = int(c2.get('wins') or 0)

                    status_state = (series.get('status') or {}).get('type', {}).get('state', 'pre')

                    winner = None
                    if status_state == 'post':
                        winner = team1 if wins1 > wins2 else team2

                    last_game_date = None
                    last_event_date = (series.get('lastEvent') or {}).get('date')
                    if last_event_date:
                        try:
                            last_game_date = last_event_date[:10]
                        except Exception:
                            pass

                    series_payload.append({
                        "season": season,
                        "conference": conference,
                        "round": round_num,
                        "series_id": series.get('uid') or series.get('id'),
                        "team1": team1,
                        "team2": team2,
                        "seed1": seed1,
                        "seed2": seed2,
                        "wins1": wins1,
                        "wins2": wins2,
                        "status": status_state,
                        "winner": winner,
                        "last_game_date": last_game_date,
                        "updated_at": datetime.now().isoformat()
                    })
                    log(f"Series: {team1}({wins1}) vs {team2}({wins2}) | {conference} R{round_num} | {status_state}")

        if not series_payload:
            log("No playoff series found — API structure may have changed.")
            log(f"Raw sample: {str(data)[:500]}")
            return

        rest_url = f"{SUPABASE_URL}/rest/v1/playoff_series"
        headers = {
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        requests.delete(f"{rest_url}?season=eq.{season}", headers=headers, timeout=15)
        response = requests.post(rest_url, headers=headers, json=series_payload, timeout=15)
        response.raise_for_status()
        log(f"Playoff bracket updated: {len(series_payload)} series for {season}")

    except Exception as e:
        log(f"Error updating playoff bracket: {e}")


def run():
    if not SERVICE_ROLE_KEY:
        log("ERROR: SUPABASE_DB_PASSWORD missing.")
        sys.exit(1)

    utc_now = datetime.now()
    dates_to_check = [utc_now - timedelta(days=1), utc_now, utc_now + timedelta(days=1)]

    for d in dates_to_check:
        fetch_and_insert_for_date(d)

    fetch_playoff_bracket()

if __name__ == "__main__":
    run()
