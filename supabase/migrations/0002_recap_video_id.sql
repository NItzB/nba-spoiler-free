-- ─── Recap video ID ──────────────────────────────────────────────────────────
-- Stores the YouTube video ID for the Motion Station "Game Recap: …" video
-- so we can embed it directly in the site instead of redirecting to YouTube.

alter table public.nba_daily_ranks
  add column if not exists recap_video_id text;
