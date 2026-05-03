-- ─── Nitz Watchability Index breakdown ───────────────────────────────────────
-- Stores the four NWI sub-scores (gei, hsp, cm, ofi) plus the combined nwi,
-- all 0–100. The 0–10 excitement_score column continues to drive sorting and
-- legacy UI; nwi_breakdown powers the Game DNA tooltip and 0–100 ring.

alter table public.nba_daily_ranks
  add column if not exists nwi_breakdown jsonb;
