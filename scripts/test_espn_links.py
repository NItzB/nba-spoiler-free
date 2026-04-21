#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

# Fetch a recent completed game to inspect the API response structure
utc_now = datetime.now()
dates_to_check = [utc_now - timedelta(days=1), utc_now, utc_now + timedelta(days=1)]

for target_date in dates_to_check:
    date_str = target_date.strftime('%Y%m%d')
    url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={date_str}"

    print(f"\n{'='*60}")
    print(f"Checking date: {date_str}")
    print(f"{'='*60}\n")

    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        events = data.get('events', [])

        if not events:
            print("No games found")
            continue

        for event in events:
            try:
                comp = event['competitions'][0]
                status = comp['status']['type']['name']

                # Only look at completed games
                if status != 'STATUS_FINAL':
                    continue

                away_team = comp['competitors'][1]['team']['abbreviation']
                home_team = comp['competitors'][0]['team']['abbreviation']

                print(f"Game: {away_team} @ {home_team} ({status})")
                print(f"\nHeadlines structure:")

                headlines = comp.get('headlines', []) or event.get('headlines', [])
                if headlines:
                    h = headlines[0]
                    print(json.dumps({
                        'description': h.get('description'),
                        'shortLinkText': h.get('shortLinkText'),
                        'links': h.get('links'),
                    }, indent=2))
                else:
                    print("No headlines found")

                # Check highlights field in competition
                print(f"\n\nHighlights field in competition:")
                highlights = comp.get('highlights', [])
                if highlights:
                    print(json.dumps(highlights[:2], indent=2))
                else:
                    print("No highlights found")

                # Check event-level links
                print(f"\n\nEvent-level links:")
                event_links = event.get('links', [])
                if event_links:
                    print(json.dumps(event_links[:3], indent=2))
                else:
                    print("No event links found")

                print(f"\nFull competition keys: {list(comp.keys())}")
                print(f"\nFull event keys: {list(event.keys())}")

            except Exception as e:
                pass

    except Exception as e:
        print(f"Error: {e}")
