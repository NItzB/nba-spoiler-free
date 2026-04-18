import json
from datetime import datetime, timedelta
from nba_api.stats.endpoints import scoreboardv2

def run():
    yesterday_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    print(f"Fetching games for {yesterday_str}...")
    try:
        board = scoreboardv2.ScoreboardV2(game_date=yesterday_str)
        games_json = board.get_json()
        games_dict = json.loads(games_json)
        print("Success! Got result")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    run()
