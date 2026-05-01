import os
import re
import sys
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import requests

# Configuration
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_DB_PASSWORD") # user reused the same secret name
SUPABASE_URL = "https://jffhhtbhecstgyhmiabn.supabase.co"

# Motion Station YouTube channel — source of "Game Recap: …" videos.
MOTION_STATION_CHANNEL_ID = "UCLd4dSmXdrJykO_hgOzbfPw"
MOTION_STATION_RSS_URL = (
    f"https://www.youtube.com/feeds/videos.xml?channel_id={MOTION_STATION_CHANNEL_ID}"
)

# ESPN abbr → team nickname (lowercase, as it appears in Motion Station titles).
# Aliases (NY/SA/NO) are normalized before lookup.
TEAM_NICKNAMES = {
    "ATL": "hawks", "BOS": "celtics", "BKN": "nets", "CHA": "hornets", "CHI": "bulls",
    "CLE": "cavaliers", "DAL": "mavericks", "DEN": "nuggets", "DET": "pistons",
    "GSW": "warriors", "HOU": "rockets", "IND": "pacers", "LAC": "clippers",
    "LAL": "lakers", "MEM": "grizzlies", "MIA": "heat", "MIL": "bucks",
    "MIN": "timberwolves", "NOP": "pelicans", "NYK": "knicks", "OKC": "thunder",
    "ORL": "magic", "PHI": "76ers", "PHX": "suns", "POR": "trail blazers",
    "SAC": "kings", "SAS": "spurs", "TOR": "raptors", "UTA": "jazz", "WAS": "wizards",
}
ABBR_ALIASES = {"NY": "NYK", "SA": "SAS", "NO": "NOP"}

def team_nickname(abbr):
    return TEAM_NICKNAMES.get(ABBR_ALIASES.get(abbr, abbr), "").lower()

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

# ─── Motion Station YouTube recap matching ───────────────────────────────────
# RSS returns the latest 15 uploads — fetched once per scraper run and reused
# across all dates we process.
RECAP_TITLE_RE = re.compile(r"^Game Recap:\s*(.+?)\s+(\d+),\s*(.+?)\s+(\d+)\s*$")

def fetch_motion_station_recaps():
    """Fetch latest videos from Motion Station and return parsed (teams,scores)→videoId.

    Each entry is keyed by frozenset({team_nick_a, team_nick_b}, score_a, score_b)
    so order doesn't matter when matching against our DB row.
    """
    try:
        resp = requests.get(MOTION_STATION_RSS_URL, timeout=10)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
    except Exception as e:
        log(f"Motion Station RSS fetch failed: {e}")
        return {}

    ns = {"atom": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
    matches = {}
    for entry in root.findall("atom:entry", ns):
        title_el = entry.find("atom:title", ns)
        vid_el = entry.find("yt:videoId", ns)
        if title_el is None or vid_el is None:
            continue
        m = RECAP_TITLE_RE.match(title_el.text or "")
        if not m:
            continue
        team_a, score_a, team_b, score_b = m.group(1).lower(), int(m.group(2)), m.group(3).lower(), int(m.group(4))
        key = (frozenset({team_a, team_b}), frozenset({score_a, score_b}))
        matches[key] = vid_el.text
    log(f"Motion Station: parsed {len(matches)} recap videos from RSS")
    return matches

def match_recap_video_id(recaps, away_abbr, home_abbr, away_score, home_score):
    away_nick = team_nickname(away_abbr)
    home_nick = team_nickname(home_abbr)
    if not away_nick or not home_nick:
        return None
    key = (frozenset({away_nick, home_nick}), frozenset({away_score, home_score}))
    return recaps.get(key)


def fetch_and_insert_for_date(target_date, recaps=None):
    if recaps is None:
        recaps = {}
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

            if game_status == 'completed':
                excitement_score, tags = calculate_excitement(
                    home_score, away_score, is_ot,
                    leaders=all_points_leaders,
                    home_record=home_record, away_record=away_record
                )
            elif game_status == 'in_progress':
                # Watchability tags require the final score — partial-game numbers
                # produce false positives like "Clutch Ending" in Q1.
                excitement_score = 0
                tags = ['Live']
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
            game_recap = headlines[0].get('description') if headlines else None

            # Extract video URLs from event links (only for completed games)
            highlights_url = None
            full_game_url = None
            recap_video_id = None
            if game_status == 'completed':
                event_links = event.get('links', [])
                for link in event_links:
                    rel = link.get('rel', [])
                    url = link.get('href')
                    if url:
                        if 'highlights' in rel:
                            highlights_url = url
                        elif 'summary' in rel:
                            full_game_url = url
                recap_video_id = match_recap_video_id(
                    recaps, away_team, home_team, away_score, home_score
                )

            # Fetch Boxscore and Probabilities
            boxscore_data = None
            winprobability_data = None
            plays_data = None
            if game_status in ['in_progress', 'completed']:
                game_id = event.get('id')
                log(f"Fetching boxscore for {game_id}...")
                boxscore_data = fetch_boxscore(game_id)

                # Fetch win probability + plays from the summary endpoint
                try:
                    summary_url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}"
                    summary_resp = requests.get(summary_url, timeout=10)
                    summary_data = summary_resp.json()
                    winprobability_data = summary_data.get('winprobability')

                    # Slim the plays array to just the fields the chart hover card needs.
                    # Indexed by play id so the modal can match against winprobability.playId.
                    raw_plays = summary_data.get('plays') or []
                    plays_data = [
                        {
                            "id": p.get("id"),
                            "type": (p.get("type") or {}).get("text"),
                            "text": p.get("text"),
                            "clock": (p.get("clock") or {}).get("displayValue"),
                            "period": (p.get("period") or {}).get("number"),
                            "homeScore": p.get("homeScore"),
                            "awayScore": p.get("awayScore"),
                            "scoringPlay": p.get("scoringPlay"),
                        }
                        for p in raw_plays
                        if p.get("id") is not None
                    ]
                except Exception as e:
                    log(f"Note: Could not fetch win probability for {game_id}: {e}")

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
                "highlights_url": highlights_url,
                "full_game_url": full_game_url,
                "recap_video_id": recap_video_id,
                "winprobability_data": winprobability_data,
                "plays_data": plays_data,
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

def parse_series_headline(headline):
    """Parse conference and round from ESPN notes headline.
    Real formats observed:
      R1: 'East 1st Round - Game 1'
      R2: 'East Semifinals - Game 2'
      R3: 'West Finals - Game 1'  (NOT 'Conference Finals')
      R4: 'NBA Finals - Game 1'
    """
    h = headline.lower()
    if 'nba finals' in h:
        return 'Finals', 4
    conference = 'East' if 'east' in h else 'West'
    if '1st round' in h or 'first round' in h:
        round_num = 1
    elif 'semifinal' in h or 'second round' in h:
        round_num = 2
    elif 'finals' in h:  # catches 'West Finals', 'East Finals', 'Conference Finals'
        round_num = 3
    else:
        round_num = 1
    return conference, round_num


def fetch_playoff_bracket():
    """Build playoff bracket by scanning recent scoreboard dates for playoff series data."""
    season = datetime.now().year
    try:
        utc_now = datetime.now()
        # Playoffs start mid-April — scan from Apr 12 through tomorrow
        start = datetime(utc_now.year, 4, 12)
        end = utc_now + timedelta(days=2)

        # series_map key = sorted team pair e.g. "BOS-PHI"
        # We scan oldest→newest so last write per key = most recent game state
        series_map = {}

        current = start
        while current <= end:
            date_str = current.strftime('%Y%m%d')
            try:
                url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={date_str}"
                resp = requests.get(url, timeout=10)
                data = resp.json()

                for event in data.get('events', []):
                    try:
                        comp = event['competitions'][0]
                        series = comp.get('series', {})
                        if series.get('type') != 'playoff':
                            continue

                        notes = comp.get('notes', [])
                        headline = notes[0].get('headline', '') if notes else ''
                        conference, round_num = parse_series_headline(headline)

                        # Map ESPN team ID → abbreviation from the game's competitor data
                        id_to_abbr = {
                            c['team']['id']: c['team']['abbreviation']
                            for c in comp['competitors']
                        }

                        wins_map = {}
                        for sc in series.get('competitors', []):
                            abbr = id_to_abbr.get(sc['id'])
                            if abbr:
                                wins_map[abbr] = int(sc.get('wins') or 0)

                        if len(wins_map) < 2:
                            continue

                        teams = sorted(wins_map.keys())
                        team1, team2 = teams[0], teams[1]
                        key = f"{team1}-{team2}"

                        series_done = series.get('completed', False)
                        status = 'post' if series_done else 'in'
                        winner = max(wins_map, key=wins_map.get) if series_done else None

                        game_done = comp['status']['type'].get('completed', False)
                        last_game_date = current.strftime('%Y-%m-%d') if game_done else None

                        entry = {
                            "season": season,
                            "conference": conference,
                            "round": round_num,
                            "series_id": None,
                            "team1": team1,
                            "team2": team2,
                            "seed1": None,
                            "seed2": None,
                            "wins1": wins_map.get(team1, 0),
                            "wins2": wins_map.get(team2, 0),
                            "status": status,
                            "winner": winner,
                            "last_game_date": last_game_date,
                            "updated_at": datetime.now().isoformat()
                        }

                        # Keep existing last_game_date if new game not yet completed
                        if key in series_map and last_game_date is None:
                            entry['last_game_date'] = series_map[key].get('last_game_date')

                        series_map[key] = entry

                    except Exception as ex:
                        log(f"Error processing playoff game: {ex}")

            except Exception as ex:
                log(f"Error fetching {date_str}: {ex}")

            current += timedelta(days=1)

        if not series_map:
            log("No playoff series found in scoreboard data.")
            return

        series_payload = list(series_map.values())
        log(f"Found {len(series_payload)} playoff series")
        for s in series_payload:
            log(f"  {s['team1']}({s['wins1']}) vs {s['team2']}({s['wins2']}) | {s['conference']} R{s['round']} | {s['status']}")

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

    recaps = fetch_motion_station_recaps()

    for d in dates_to_check:
        fetch_and_insert_for_date(d, recaps=recaps)

    fetch_playoff_bracket()

if __name__ == "__main__":
    run()
