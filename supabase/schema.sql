-- NBA Daily Ranks table schema
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS nba_daily_ranks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date            DATE NOT NULL,
  home_team       VARCHAR(3) NOT NULL,   -- 3-letter NBA team abbreviation e.g. "LAL"
  away_team       VARCHAR(3) NOT NULL,   -- 3-letter NBA team abbreviation e.g. "BOS"
  excitement_score FLOAT NOT NULL DEFAULT 5.0 CHECK (excitement_score >= 0 AND excitement_score <= 10),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  final_score     TEXT,                  -- e.g. "112-108" — hidden by default in UI
  is_overtime     BOOLEAN NOT NULL DEFAULT FALSE,
  highlights_url  TEXT,
  full_game_url   TEXT,
  game_time_utc   TIMESTAMPTZ,           -- Original game start time in UTC
  winprobability_data JSONB,             -- Array of {homeWinPercentage, playId} from ESPN
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups by date
CREATE INDEX IF NOT EXISTS idx_nba_daily_ranks_date
  ON nba_daily_ranks(date DESC);

-- Composite index for date + score ordering (most common query)
CREATE INDEX IF NOT EXISTS idx_nba_daily_ranks_date_score
  ON nba_daily_ranks(date DESC, excitement_score DESC);

-- Enable Row Level Security
ALTER TABLE nba_daily_ranks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous public reads (safe for a spoiler-free dashboard)
CREATE POLICY "Allow public read access" ON nba_daily_ranks
  FOR SELECT
  USING (true);

-- Only authenticated users / service role can write (for n8n agent)
CREATE POLICY "Allow authenticated inserts" ON nba_daily_ranks
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated updates" ON nba_daily_ranks
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- ─── Playoff bracket table ────────────────────────────────────────────────────
-- Run this migration in Supabase SQL editor to enable the bracket page

CREATE TABLE IF NOT EXISTS playoff_series (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season         INT NOT NULL,
  conference     VARCHAR(10) NOT NULL,   -- 'East', 'West', 'Finals'
  round          INT NOT NULL,           -- 1=First Round, 2=Semis, 3=Conf Finals, 4=Finals
  series_id      VARCHAR(50),
  team1          VARCHAR(3),             -- higher seed team abbreviation
  team2          VARCHAR(3),             -- lower seed team abbreviation
  seed1          INT,                    -- team1 seed number
  seed2          INT,                    -- team2 seed number
  wins1          INT NOT NULL DEFAULT 0,
  wins2          INT NOT NULL DEFAULT 0,
  status         VARCHAR(10) NOT NULL DEFAULT 'pre',  -- pre, in, post
  winner         VARCHAR(3),
  last_game_date DATE,                   -- most recent game date (for spoiler detection)
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playoff_series_season_round
  ON playoff_series(season DESC, round ASC);

ALTER TABLE playoff_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read playoff" ON playoff_series
  FOR SELECT USING (true);

CREATE POLICY "Allow service role write playoff" ON playoff_series
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Migration: plays_data ────────────────────────────────────────────────────
-- Stores a slimmed array of plays from ESPN summary endpoint, indexed by play
-- id, so the Probabilities modal can show "what happened" at each win-prob
-- point as the user scrubs the chart.
ALTER TABLE nba_daily_ranks
  ADD COLUMN IF NOT EXISTS plays_data JSONB;

-- ─── Migration: nwi_breakdown ─────────────────────────────────────────────────
-- Nitz Watchability Index sub-scores (gei, hsp, cm, ofi, nwi) — all 0–100.
-- Powers the Game DNA tooltip and the 0–100 ring display.
ALTER TABLE nba_daily_ranks
  ADD COLUMN IF NOT EXISTS nwi_breakdown JSONB;
