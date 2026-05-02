-- ─── Phase 3: Mid-game live polling ───────────────────────────────────────────
-- The original trigger only fired once a game's estimated end time had passed,
-- so live period/clock stayed stuck mid-game until ESPN reported "completed".
-- This migration replaces the function to also fire while a game is live
-- (tipoff has passed, DB still says scheduled/in_progress), so quarter and
-- clock updates flow through every ~5 minutes during the broadcast.
--
-- Run in the Supabase SQL Editor.

create or replace function public.trigger_score_agent_if_needed()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending_count int;
  v_last_trigger  timestamptz;
  v_cooldown_min  int := 5;
  v_gh_owner      text;
  v_gh_repo       text;
  v_gh_token      text;
begin
  -- Any game whose tipoff has passed and DB hasn't moved to 'completed' yet?
  -- The 12h cap ages out games stuck in scheduled/in_progress (cancellations,
  -- ESPN quirks) so they don't trigger forever.
  select count(*) into v_pending_count
  from public.nba_daily_ranks
  where status in ('scheduled', 'in_progress')
    and game_time_utc is not null
    and game_time_utc < now()
    and game_time_utc > now() - interval '12 hours';

  if v_pending_count = 0 then
    return;
  end if;

  -- Cooldown: don't re-fire while a previous run is likely still in flight.
  select last_score_agent_trigger into v_last_trigger from public.cron_state where id = 1;
  if v_last_trigger is not null
     and v_last_trigger > now() - make_interval(mins => v_cooldown_min) then
    return;
  end if;

  select value into v_gh_owner from public.cron_config where key = 'gh_owner';
  select value into v_gh_repo  from public.cron_config where key = 'gh_repo';
  select value into v_gh_token from public.cron_config where key = 'gh_token';

  if v_gh_owner is null or v_gh_repo is null or v_gh_token is null then
    raise notice 'cron_config missing required keys (gh_owner, gh_repo, gh_token)';
    return;
  end if;

  update public.cron_state set last_score_agent_trigger = now() where id = 1;

  perform net.http_post(
    url     := format('https://api.github.com/repos/%s/%s/dispatches', v_gh_owner, v_gh_repo),
    headers := jsonb_build_object(
      'Authorization',        'Bearer ' || v_gh_token,
      'Accept',               'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent',           'supabase-pg-cron'
    ),
    body := jsonb_build_object(
      'event_type', 'score-agent-trigger',
      'client_payload', jsonb_build_object(
        'source',        'pg-cron',
        'pending_games', v_pending_count,
        'triggered_at',  now()
      )
    )
  );

  raise notice 'Triggered score agent: % active games', v_pending_count;
end;
$$;
