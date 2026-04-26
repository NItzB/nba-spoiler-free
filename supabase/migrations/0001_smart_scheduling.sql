-- ─── Phase 2: Smart Scheduling ────────────────────────────────────────────────
-- Supabase pg_cron polls every minute and fires a GitHub repository_dispatch
-- webhook only when there are unfinished games whose estimated end has passed.
-- A cooldown prevents repeated firing while the GitHub Action is running.
--
-- Run this in the Supabase SQL Editor AFTER enabling pg_cron and pg_net in
-- Dashboard > Database > Extensions.

-- 1. Extensions (no-op if already enabled via Dashboard)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Config storage. RLS on, no policies = no access for anon/authenticated.
--    Only the postgres superuser (Dashboard SQL Editor) and SECURITY DEFINER
--    functions can read this table.
create table if not exists public.cron_config (
  key   text primary key,
  value text not null
);
alter table public.cron_config enable row level security;

-- 3. Cooldown state — single-row table.
create table if not exists public.cron_state (
  id                       int primary key default 1,
  last_score_agent_trigger timestamptz,
  constraint cron_state_singleton check (id = 1)
);
insert into public.cron_state (id) values (1) on conflict (id) do nothing;
alter table public.cron_state enable row level security;

-- 4. Trigger function. Called every minute by pg_cron.
create or replace function public.trigger_score_agent_if_needed()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending_count int;
  v_last_trigger  timestamptz;
  v_cooldown_min  int := 8;
  v_gh_owner      text;
  v_gh_repo       text;
  v_gh_token      text;
begin
  -- Any unfinished games whose estimated end (tipoff + 2.5h) has passed
  -- and that started within the last 12h?
  select count(*) into v_pending_count
  from public.nba_daily_ranks
  where status in ('scheduled', 'in_progress')
    and game_time_utc is not null
    and game_time_utc < now() - interval '2 hours 30 minutes'
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

  -- Mark trigger time BEFORE the HTTP call so concurrent ticks don't double-fire.
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

  raise notice 'Triggered score agent: % pending games', v_pending_count;
end;
$$;

-- 5. Schedule the job. Re-runnable: drop any existing job with the same name first.
do $$
begin
  perform cron.unschedule('trigger-score-agent');
exception when others then null;
end $$;

select cron.schedule(
  'trigger-score-agent',
  '* * * * *',
  $$ select public.trigger_score_agent_if_needed(); $$
);
