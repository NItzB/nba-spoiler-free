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
