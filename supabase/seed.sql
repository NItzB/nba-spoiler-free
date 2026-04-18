-- Seed data for nba_daily_ranks
-- Replace 'YYYY-MM-DD' with today's actual date

INSERT INTO nba_daily_ranks (date, home_team, away_team, excitement_score, tags, final_score, is_overtime, highlights_url, full_game_url, game_time_utc)
VALUES
  (CURRENT_DATE, 'BOS', 'LAL', 9.4, ARRAY['Clutch Ending', 'Rivalry', 'Historic Performance'], '118-115', false,
   'https://www.youtube.com/results?search_query=NBA+Celtics+Lakers+highlights',
   'https://www.nba.com/watch', NOW() - INTERVAL '8 hours'),

  (CURRENT_DATE, 'GSW', 'OKC', 8.1, ARRAY['High Scoring', 'Close Game', 'OT'], '142-138', true,
   'https://www.youtube.com/results?search_query=NBA+Warriors+Thunder+highlights',
   'https://www.nba.com/watch', NOW() - INTERVAL '5 hours'),

  (CURRENT_DATE, 'MIA', 'NYK', 7.5, ARRAY['Defensive Battle', 'Comeback', 'Playoff Implications'], '98-94', false,
   'https://www.youtube.com/results?search_query=NBA+Heat+Knicks+highlights',
   'https://www.nba.com/watch', NOW() - INTERVAL '9 hours'),

  (CURRENT_DATE, 'MIN', 'DAL', 7.8, ARRAY['OT', 'Clutch Ending', 'Playoff Implications'], '109-107', true,
   'https://www.youtube.com/results?search_query=NBA+Timberwolves+Mavericks+highlights',
   'https://www.nba.com/watch', NOW() - INTERVAL '6 hours'),

  (CURRENT_DATE, 'DEN', 'PHX', 6.2, ARRAY['High Scoring'], '125-119', false,
   'https://www.youtube.com/results?search_query=NBA+Nuggets+Suns+highlights',
   'https://www.nba.com/watch', NOW() - INTERVAL '7 hours'),

  (CURRENT_DATE, 'CHI', 'DET', 3.8, ARRAY['Blowout'], '134-98', false,
   null,
   'https://www.nba.com/watch', NOW() - INTERVAL '9 hours');
