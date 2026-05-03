-- ─── 0005: Multi-source recap pipeline ──────────────────────────────────────
-- Stores an ordered array of YouTube recap sources per game, e.g.
--   [{"source": "motion-station", "video_id": "abc123"},
--    {"source": "nba-official",   "video_id": "def456"}]
-- The UI tries them in order (region-aware) and falls back if YouTube
-- geo-blocks the embed. `recap_video_id` (singular) is kept for back-compat
-- and mirrors the first entry.
ALTER TABLE nba_daily_ranks
  ADD COLUMN IF NOT EXISTS recap_sources JSONB;
