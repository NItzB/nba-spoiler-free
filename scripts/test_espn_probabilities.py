#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

# Check what data ESPN provides for game probabilities/flow
utc_now = datetime.now()
target_date = utc_now - timedelta(days=1)
date_str = target_date.strftime('%Y%m%d')

# Try the summary endpoint which might have more detailed game data
url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={date_str}"

try:
    resp = requests.get(url, timeout=10)
    data = resp.json()
    events = data.get('events', [])

    if events:
        event = events[0]
        game_id = event.get('id')

        print(f"Game ID: {game_id}\n")

        # Check scoreboard event for probabilities
        comp = event['competitions'][0]
        print("Scoreboard competition keys:")
        print(json.dumps(sorted(comp.keys()), indent=2))

        # Try fetching the summary endpoint for this specific game
        summary_url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}"
        print(f"\n\nFetching summary endpoint: {summary_url}\n")

        summary_resp = requests.get(summary_url, timeout=10)
        summary_data = summary_resp.json()

        print("Summary root keys:")
        print(json.dumps(sorted(summary_data.keys()), indent=2))

        # Check for probabilities in various places
        if 'gamecast' in summary_data:
            print("\n\nGamecast keys:")
            print(json.dumps(sorted(summary_data['gamecast'].keys()), indent=2))

        if 'boxscore' in summary_data:
            print("\n\nBoxscore keys:")
            print(json.dumps(sorted(summary_data['boxscore'].keys()), indent=2))

        # Check for any probabilities data
        if 'probabilities' in summary_data:
            print("\n\nProbabilities found!")
            print(json.dumps(summary_data['probabilities'][:2], indent=2))

        # Check article/content for probabilities
        if 'articles' in summary_data:
            print("\n\nArticles found (first 1):")
            print(json.dumps(summary_data['articles'][:1], indent=2))

except Exception as e:
    print(f"Error: {e}")
