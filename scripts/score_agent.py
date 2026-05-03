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

# Motion Station YouTube channel — fan aggregator. Titles include the score
# ("Game Recap: Raptors 112, Cavaliers 110") so we can match by score+teams.
# Geo-blocks vary by video; we keep this as one source among several.
MOTION_STATION_CHANNEL_ID = "UCLd4dSmXdrJykO_hgOzbfPw"
MOTION_STATION_RSS_URL = (
    f"https://www.youtube.com/feeds/videos.xml?channel_id={MOTION_STATION_CHANNEL_ID}"
)

# NBA Official — the league's own channel. Titles don't include the score, so
# we match by team nicknames + date instead. Less geo-restricted than fan
# aggregators in most regions.
NBA_OFFICIAL_CHANNEL_ID = "UCWJ2lWNubArHWmf3FIHbfcQ"
NBA_OFFICIAL_RSS_URL = (
    f"https://www.youtube.com/feeds/videos.xml?channel_id={NBA_OFFICIAL_CHANNEL_ID}"
)

# Matches NBA-official "FULL GAME HIGHLIGHTS" titles. Examples:
#   "EXTENDED: #7 76ERS at #2 CELTICS | FULL GAME 7 HIGHLIGHTS | May 2, 2026"
#   "76ERS at CELTICS | FULL GAME HIGHLIGHTS | May 2, 2026"
NBA_HIGHLIGHTS_RE = re.compile(
    r"^(?:EXTENDED:\s+)?"
    r"(?:#\d+\s+)?(.+?)\s+at\s+(?:#\d+\s+)?(.+?)"   # away  at  home
    r"\s*\|\s*FULL\s+GAME(?:\s+\d+)?\s+HIGHLIGHTS"
    r"\s*\|\s*(.+?)\s*$",                             # date
    re.IGNORECASE,
)

# Month-name → number, for parsing "May 2, 2026" without locale gymnastics.
_NBA_MONTHS = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
}

def _parse_nba_date(s):
    """Parse 'May 2, 2026' → ISO 'YYYY-MM-DD' string. Returns None on failure."""
    try:
        cleaned = s.strip().rstrip('.').replace(',', '').split()
        if len(cleaned) != 3:
            return None
        m = _NBA_MONTHS.get(cleaned[0].lower())
        d = int(cleaned[1])
        y = int(cleaned[2])
        if not m or not (1 <= d <= 31) or y < 2000:
            return None
        return f"{y:04d}-{m:02d}-{d:02d}"
    except (ValueError, IndexError):
        return None

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

# ─── Nitz Watchability Index (NWI) ────────────────────────────────────────────
# Weighted blend of four play-by-play metrics:
#   GEI 40% — sum of |Δ win prob| across the game
#   HSP 30% — % of Q4 wall-clock time within ≤5 points
#   CM  20% — (max lead − final margin) / max lead
#   OFI 10% — combined points vs. league-average band
# Sub-scores are 0–100; the weighted blend is also 0–100.

def _nwi_gei(winprob_data):
    """Sum of |Δ home win pct| × 100, normalized so a typical good game ≈ 70.
    Reference: an Inpredictable-style "ExciteIndex" of ~10 is a great game."""
    if not isinstance(winprob_data, list) or len(winprob_data) < 2:
        return None
    total = 0.0
    prev = None
    for p in winprob_data:
        wp = p.get("homeWinPercentage") if isinstance(p, dict) else None
        if not isinstance(wp, (int, float)):
            continue
        if prev is not None:
            total += abs(wp - prev)
        prev = wp
    # raw is in WP-units (0..1 each), so a sum of 6 ≈ very swingy game.
    # Map raw 0→0, 8→100, clamp.
    return max(0.0, min(100.0, (total / 8.0) * 100.0))


def _parse_clock_to_sec(clock):
    if not clock:
        return 0.0
    try:
        s = str(clock)
        if ':' in s:
            m, sec = s.split(':', 1)
            return float(m) * 60 + float(sec)
        return float(s)
    except Exception:
        return 0.0


def _nwi_hsp(plays_data):
    """% of Q4 wall-clock time where |home−away| ≤ 5.
    Walks Q4 plays in order; the gap between consecutive plays is attributed to
    the score state at the start of the gap (the score that's currently visible
    to the broadcast)."""
    if not isinstance(plays_data, list) or not plays_data:
        return None
    q4 = [p for p in plays_data if isinstance(p, dict) and p.get("period") == 4]
    if len(q4) < 2:
        return None
    Q4_LEN = 12 * 60
    competitive = 0.0
    for i in range(len(q4) - 1):
        a = q4[i]
        b = q4[i + 1]
        a_rem = _parse_clock_to_sec(a.get("clock"))
        b_rem = _parse_clock_to_sec(b.get("clock"))
        # ESPN reports clock as time remaining in the period — descending.
        gap = max(0.0, a_rem - b_rem)
        h = a.get("homeScore")
        aw = a.get("awayScore")
        if isinstance(h, (int, float)) and isinstance(aw, (int, float)):
            if abs(h - aw) <= 5:
                competitive += gap
    return max(0.0, min(100.0, (competitive / Q4_LEN) * 100.0))


def _nwi_cm(plays_data, final_home, final_away):
    """Drama signal — the larger of:
      • comeback: max deficit the eventual winner overcame (a 20-pt comeback = 100)
      • erosion: how much of the largest lead disappeared by the final whistle
    Small leads get down-weighted so flat back-and-forth doesn't read as drama."""
    if not isinstance(plays_data, list) or not plays_data:
        return None
    if final_home == final_away:
        return None
    winner_was_home = final_home > final_away
    max_lead = 0
    max_winner_deficit = 0
    for p in plays_data:
        if not isinstance(p, dict):
            continue
        h = p.get("homeScore")
        a = p.get("awayScore")
        if not (isinstance(h, (int, float)) and isinstance(a, (int, float))):
            continue
        d = abs(h - a)
        if d > max_lead:
            max_lead = d
        deficit = (a - h) if winner_was_home else (h - a)
        if deficit > max_winner_deficit:
            max_winner_deficit = deficit
    if max_lead == 0:
        return 0.0
    final_margin = abs(final_home - final_away)
    comeback = max_winner_deficit / 20.0 * 100.0
    significance = min(1.0, max_lead / 12.0)
    erosion = (max_lead - final_margin) / max_lead * significance * 100.0
    return max(0.0, min(100.0, max(comeback, erosion)))


def _nwi_ofi(total_score):
    """Combined points vs. league band: 200→0, 250→100."""
    if total_score is None or total_score <= 0:
        return None
    return max(0.0, min(100.0, (total_score - 200.0) / 50.0 * 100.0))


def _record_pct(rec):
    if not rec or '-' not in rec:
        return 0.5
    try:
        w, l = map(int, rec.split('-'))
        return w / (w + l) if (w + l) > 0 else 0.5
    except (ValueError, ZeroDivisionError):
        return 0.5


def _upset_bonus(home_score, away_score, home_record, away_record):
    """0–10 bonus when the winner had the worse season record."""
    h_pct = _record_pct(home_record)
    a_pct = _record_pct(away_record)
    if home_score > away_score:
        gap = a_pct - h_pct
        is_road = False
    elif away_score > home_score:
        gap = h_pct - a_pct
        is_road = True
    else:
        return 0.0
    if gap < 0.05:
        return 0.0
    raw = gap * 30.0
    if is_road:
        raw *= 1.5
    return round(min(raw, 10.0), 1)


def _star_bonus(leaders):
    """0–10 bonus from max single-game points."""
    if not leaders:
        return 0
    max_pts = 0
    for leader in leaders:
        if not isinstance(leader, dict):
            continue
        try:
            val = leader.get('displayValue', '0')
            if ' ' in val:
                val = val.split()[0]
            max_pts = max(max_pts, int(val))
        except (ValueError, AttributeError):
            pass
    if max_pts >= 45: return 10
    if max_pts >= 40: return 8
    if max_pts >= 35: return 6
    if max_pts >= 30: return 3
    return 0


def _clutch_finish_bonus(home_score, away_score):
    """+3 if final margin ≤3, +1 if ≤5, else 0. Rewards ended-close games beyond
    HSP's Q4 wall-clock measure — a buzzer-beater 2-pt finish is its own signal."""
    margin = abs((home_score or 0) - (away_score or 0))
    if margin <= 3: return 3
    if margin <= 5: return 1
    return 0


def _stakes_bonus(notes, series_summary):
    """Playoff stakes bonus inferred from ESPN's notes + series summary.
       +7: series clincher, Game 7, or post-game 3-3 (forced G7 / elim survival).
       +4: Game 6 (one team always faces elimination going in).
       +2: any other playoff game.
       0:  regular season."""
    notes_text = " ".join(
        n.get("headline", "") for n in (notes or []) if isinstance(n, dict)
    ).lower()
    series_text = (series_summary or "").lower()

    is_playoff = any(k in notes_text for k in ["round", "finals", "conference"]) \
                 or any(k in series_text for k in ["series", "tied"])
    if not is_playoff:
        return 0

    if "wins series" in series_text or "win series" in series_text:
        return 7

    rec = re.search(r"(\d)\s*-\s*(\d)", series_text)
    if rec:
        a, b = int(rec.group(1)), int(rec.group(2))
        hi, lo = max(a, b), min(a, b)
        if hi >= 4:
            return 7
        if hi == 3 and lo == 3:
            return 7

    g = re.search(r"game\s+(\d)", notes_text)
    if g:
        gn = int(g.group(1))
        if gn == 7:
            return 7
        if gn == 6:
            return 4

    return 2


def calculate_nwi(
    winprob_data, plays_data, home_score, away_score,
    is_overtime=False,
    home_record="0-0", away_record="0-0",
    leaders=None, notes=None, series_summary=None,
):
    """Returns (final_score_0_100, breakdown_dict) or (None, None) if no signal.
    final = nwi_base (weighted blend of gameplay sub-scores)
          + ot + upset + star + stakes (narrative bonuses)
          clamped to [0, 100]."""
    gei = _nwi_gei(winprob_data)
    hsp = _nwi_hsp(plays_data)
    cm  = _nwi_cm(plays_data, home_score, away_score)
    ofi = _nwi_ofi((home_score or 0) + (away_score or 0))

    if gei is None and hsp is None and cm is None:
        return None, None

    g = gei if gei is not None else 50.0
    h = hsp if hsp is not None else 50.0
    c = cm  if cm  is not None else 0.0
    o = ofi if ofi is not None else 50.0

    nwi_base = g * 0.40 + h * 0.30 + c * 0.25 + o * 0.05

    ot     = 5 if is_overtime else 0
    upset  = _upset_bonus(home_score, away_score, home_record, away_record)
    star   = _star_bonus(leaders)
    stakes = _stakes_bonus(notes, series_summary)
    clutch = _clutch_finish_bonus(home_score, away_score)

    final = max(0.0, min(100.0, nwi_base + ot + upset + star + stakes + clutch))

    breakdown = {
        "nwi": round(final, 1),
        "nwi_base": round(nwi_base, 1),
        "gei": round(g, 1) if gei is not None else None,
        "hsp": round(h, 1) if hsp is not None else None,
        "cm":  round(c, 1) if cm  is not None else None,
        "ofi": round(o, 1) if ofi is not None else None,
        "bonuses": {
            "ot": ot,
            "upset": upset,
            "star": star,
            "stakes": stakes,
            "clutch": clutch,
        },
    }
    return round(final, 1), breakdown


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
# Partial form — Motion Station occasionally typos titles and drops the second
# score (e.g. "Game Recap: Raptors 112, Cavaliers"). We still want to match
# those as long as we can reconcile via teams + the single score we have.
RECAP_TITLE_PARTIAL_RE = re.compile(r"^Game Recap:\s*(.+?)\s+(\d+),\s*(.+?)\s*$")

def fetch_motion_station_recaps():
    """Fetch latest videos from Motion Station and return two lookup tables:
      - "full":    (frozenset(teams), frozenset(scores)) → videoId
      - "partial": (frozenset(teams), single_score)      → videoId
    The partial table catches typo'd titles missing one score."""
    empty = {"full": {}, "partial": {}}
    try:
        resp = requests.get(MOTION_STATION_RSS_URL, timeout=10)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
    except Exception as e:
        log(f"Motion Station RSS fetch failed: {e}")
        return empty

    ns = {"atom": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
    full = {}
    partial = {}
    for entry in root.findall("atom:entry", ns):
        title_el = entry.find("atom:title", ns)
        vid_el = entry.find("yt:videoId", ns)
        if title_el is None or vid_el is None:
            continue
        title = title_el.text or ""
        m = RECAP_TITLE_RE.match(title)
        if m:
            team_a, score_a, team_b, score_b = m.group(1).lower(), int(m.group(2)), m.group(3).lower(), int(m.group(4))
            full[(frozenset({team_a, team_b}), frozenset({score_a, score_b}))] = vid_el.text
            continue
        mp = RECAP_TITLE_PARTIAL_RE.match(title)
        if mp:
            team_a, score_a, team_b = mp.group(1).lower(), int(mp.group(2)), mp.group(3).lower()
            partial[(frozenset({team_a, team_b}), score_a)] = vid_el.text
    log(f"Motion Station: parsed {len(full)} full + {len(partial)} partial recap videos from RSS")
    return {"full": full, "partial": partial}

def match_recap_video_id(recaps, away_abbr, home_abbr, away_score, home_score):
    away_nick = team_nickname(away_abbr)
    home_nick = team_nickname(home_abbr)
    if not away_nick or not home_nick:
        return None
    teams = frozenset({away_nick, home_nick})
    full = recaps.get("full", {})
    partial = recaps.get("partial", {})
    hit = full.get((teams, frozenset({away_score, home_score})))
    if hit:
        return hit
    # Title was missing one score — match on teams + either score we know.
    for s in (away_score, home_score):
        hit = partial.get((teams, s))
        if hit:
            return hit
    return None


def fetch_nba_official_recaps():
    """Fetch NBA-official channel feed; return {(teams_frozenset, iso_date): videoId}.
    Titles don't include the score, so we key by teams + game date instead."""
    out = {}
    try:
        resp = requests.get(NBA_OFFICIAL_RSS_URL, timeout=10)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
    except Exception as e:
        log(f"NBA Official RSS fetch failed: {e}")
        return out

    ns = {"atom": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
    for entry in root.findall("atom:entry", ns):
        title_el = entry.find("atom:title", ns)
        vid_el = entry.find("yt:videoId", ns)
        if title_el is None or vid_el is None:
            continue
        m = NBA_HIGHLIGHTS_RE.match(title_el.text or "")
        if not m:
            continue
        away_raw, home_raw, date_raw = m.group(1), m.group(2), m.group(3)
        iso = _parse_nba_date(date_raw)
        if not iso:
            continue
        # NBA uses team nicknames in CAPS — match against our lowercase TEAM_NICKNAMES values.
        away_nick = away_raw.strip().lower()
        home_nick = home_raw.strip().lower()
        out[(frozenset({away_nick, home_nick}), iso)] = vid_el.text
    log(f"NBA Official: parsed {len(out)} recap videos from RSS")
    return out


def match_nba_official_recap(nba_recaps, away_abbr, home_abbr, iso_date):
    away_nick = team_nickname(away_abbr)
    home_nick = team_nickname(home_abbr)
    if not away_nick or not home_nick or not iso_date:
        return None
    return nba_recaps.get((frozenset({away_nick, home_nick}), iso_date))


def fetch_and_insert_for_date(target_date, recaps=None, nba_recaps=None):
    if recaps is None:
        recaps = {"full": {}, "partial": {}}
    if nba_recaps is None:
        nba_recaps = {}
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

            # Calculate excitement and tags. NWI override happens later, once
            # winprobability + plays data are fetched from the summary endpoint.
            excitement_score = 0
            nwi_breakdown = None
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
            recap_sources = []
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
                # Collect recap candidates from each source. Order doesn't matter
                # in the DB — the UI picks priority by region. Motion Station
                # first because it's been the established source; NBA Official
                # added as a less geo-restricted backup.
                ms_id = match_recap_video_id(
                    recaps, away_team, home_team, away_score, home_score
                )
                if ms_id:
                    recap_sources.append({"source": "motion-station", "video_id": ms_id})
                nba_id = match_nba_official_recap(
                    nba_recaps, away_team, home_team, db_date_str
                )
                if nba_id:
                    recap_sources.append({"source": "nba-official", "video_id": nba_id})
                # Back-compat: keep recap_video_id pointing at the first source.
                recap_video_id = recap_sources[0]["video_id"] if recap_sources else None

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

            # Override excitement_score with NWI when we have play-by-play signal.
            # Only for completed games — partial NWI on a live game would mislead.
            if game_status == 'completed':
                nwi, breakdown = calculate_nwi(
                    winprobability_data, plays_data, home_score, away_score,
                    is_overtime=is_ot,
                    home_record=home_record, away_record=away_record,
                    leaders=all_points_leaders,
                    notes=competition.get('notes', []),
                    series_summary=series_summary,
                )
                if nwi is not None:
                    excitement_score = round(nwi / 10.0, 1)
                    nwi_breakdown = breakdown

            payload.append({
                "date": db_date_str,
                "home_team": home_team,
                "away_team": away_team,
                "excitement_score": excitement_score,
                "nwi_breakdown": nwi_breakdown,
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
                "recap_sources": recap_sources or None,
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

    # BACKFILL_DAYS=N overrides the default 3-day window and walks back N days
    # from today (inclusive). Useful for refilling history after a schema change.
    backfill_days_raw = os.environ.get("BACKFILL_DAYS")
    if backfill_days_raw:
        try:
            n = int(backfill_days_raw)
            if n < 1:
                raise ValueError("BACKFILL_DAYS must be >= 1")
            dates_to_check = [utc_now - timedelta(days=i) for i in range(n)]
            log(f"Backfill mode: re-scraping last {n} day(s) from today.")
        except ValueError as e:
            log(f"Invalid BACKFILL_DAYS={backfill_days_raw!r}: {e}. Falling back to default window.")
            dates_to_check = [utc_now - timedelta(days=1), utc_now, utc_now + timedelta(days=1)]
    else:
        dates_to_check = [utc_now - timedelta(days=1), utc_now, utc_now + timedelta(days=1)]

    recaps = fetch_motion_station_recaps()
    nba_recaps = fetch_nba_official_recaps()

    for d in dates_to_check:
        fetch_and_insert_for_date(d, recaps=recaps, nba_recaps=nba_recaps)

    fetch_playoff_bracket()

if __name__ == "__main__":
    run()
