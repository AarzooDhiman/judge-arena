-- ==========================================================================
-- JUDGE Arena — Supabase backend (version 2)
--
-- Run this whole script in the Supabase SQL editor. It is idempotent: you can
-- run it again after an update, and it keeps the tables and data you already
-- have (it adds columns and tables, and replaces the functions).
--
-- Students never get email accounts. A new player picks a cohort (trimester and
-- academic year) and a 4-digit PIN; the server makes an anonymous player code
-- like JA-7K3P. To come back they use cohort + player code + PIN.
--
-- Every table has row level security ON with NO policies, so the browser cannot
-- read or write any table directly. All access is through the SECURITY DEFINER
-- functions at the bottom of this file.
--
-- Before you run it the FIRST time: change 'CHANGE-ME' (the staff code) below.
-- ==========================================================================

create extension if not exists pgcrypto with schema extensions;

-- --------------------------------------------------------------------------
-- Players. A progress SUMMARY is stored, never answers or in-level drafts.
-- --------------------------------------------------------------------------
create table if not exists public.judge_players (
  id          uuid primary key default gen_random_uuid(),
  class_code  text,                      -- legacy (version 1); not used any more
  nickname    text,                      -- legacy (version 1); not used any more
  pin_hash    text not null,
  token       uuid not null default gen_random_uuid(),
  state       jsonb not null default '{}'::jsonb,   -- legacy (version 1); cleared below
  xp          integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.judge_players
  add column if not exists cohort           text,
  add column if not exists player_code      text,
  add column if not exists progress         jsonb not null default '{}'::jsonb,
  add column if not exists first_seen       timestamptz not null default now(),
  add column if not exists last_seen        timestamptz not null default now(),
  add column if not exists visit_count      integer not null default 0,
  add column if not exists research_consent boolean,
  add column if not exists consent_at       timestamptz,
  add column if not exists deleted_at       timestamptz;   -- set when the player erases their data

alter table public.judge_players alter column class_code drop not null;
alter table public.judge_players alter column nickname   drop not null;

create unique index if not exists judge_players_token       on public.judge_players (token);
create unique index if not exists judge_players_player_code on public.judge_players (player_code);
create index        if not exists judge_players_cohort      on public.judge_players (cohort);
alter table public.judge_players enable row level security;   -- no policies: browser can't read it directly

-- Version 1 stored the whole game state here, including typed answers. Clear it.
update public.judge_players set state = '{}'::jsonb where state <> '{}'::jsonb;

-- --------------------------------------------------------------------------
-- Settings and (optional) the cohorts the server accepts.
-- --------------------------------------------------------------------------
create table if not exists public.judge_settings (
  key   text primary key,
  value text not null
);
alter table public.judge_settings enable row level security;

-- Staff code for the dashboard and exports. CHANGE 'CHANGE-ME' before the first run.
insert into public.judge_settings (key, value)
values ('staff_code_hash', extensions.crypt('CHANGE-ME', extensions.gen_salt('bf')))
on conflict (key) do nothing;

-- Optional allow-list of cohort keys such as 'T1|25/26'. Leave EMPTY to accept any
-- well-formed cohort. Example:
--   insert into public.judge_classes (code, label) values ('T1|25/26', 'Trimester 1, 2025/26');
create table if not exists public.judge_classes (
  code  text primary key,
  label text
);
alter table public.judge_classes enable row level security;

-- --------------------------------------------------------------------------
-- Feedback (star ratings, comments and the final questionnaire).
-- --------------------------------------------------------------------------
create table if not exists public.judge_feedback (
  id         bigserial primary key,
  player_id  uuid not null references public.judge_players (id) on delete cascade,
  cohort     text,
  kind       text not null check (kind in ('world', 'final')),
  world_id   text not null default '',
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, kind, world_id)
);
alter table public.judge_feedback enable row level security;

-- --------------------------------------------------------------------------
-- Engagement events. Only written for players who agreed, and only through
-- judge_log_events, which keeps a fixed list of fields per event type.
-- --------------------------------------------------------------------------
create table if not exists public.judge_events (
  id         bigserial primary key,
  player_id  uuid not null references public.judge_players (id) on delete cascade,
  session_id uuid,
  cohort     text,
  type       text not null,
  world_id   text,
  level_id   text,
  payload    jsonb not null default '{}'::jsonb,
  client_ts  timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists judge_events_cohort_type on public.judge_events (cohort, type);
create index if not exists judge_events_player      on public.judge_events (player_id);
alter table public.judge_events enable row level security;

-- ==========================================================================
-- Functions (SECURITY DEFINER; these are the only way in)
-- ==========================================================================

-- Functions whose argument names or return type changed since version 1.
drop function if exists public.judge_login(text, text, text);
drop function if exists public.judge_save(uuid, jsonb, integer);
drop function if exists public.judge_leaderboard(text);
drop function if exists public.judge_class_progress(text, text);

-- ---- internal helpers (not callable from the browser) ---------------------

create or replace function public.judge_check_staff(p_staff text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare h text;
begin
  select value into h from public.judge_settings where key = 'staff_code_hash';
  return h is not null and h = crypt(coalesce(p_staff, ''), h);
end;
$$;

create or replace function public.judge_cohort_ok(p_cohort text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_cohort is null or p_cohort !~ '^[A-Za-z0-9]{1,4}\|[A-Za-z0-9/ -]{1,12}$' then
    return false;
  end if;
  if exists (select 1 from public.judge_classes) then
    return exists (select 1 from public.judge_classes where code = p_cohort);
  end if;
  return true;
end;
$$;

-- Keeps only the fields each event type is allowed to carry, and only short
-- scalar values. This is what guarantees no answer content is ever stored.
create or replace function public.judge_clean_payload(p_type text, p_payload jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(jsonb_object_agg(t.k, t.v), '{}'::jsonb)
    from jsonb_each(case when jsonb_typeof(p_payload) = 'object' then p_payload else '{}'::jsonb end) as t(k, v)
   where t.k = any (case p_type
           when 'session_start'      then array['device', 'viewport_w', 'entry', 'local_hour', 'timers_on', 'visit_number']
           when 'session_end'        then array['active_s', 'total_s']
           when 'world_open'         then array['world_id', 'unlocked']
           when 'level_start'        then array['attempt_no', 'from_checkpoint', 'item_index']
           when 'item_done'          then array['item_index', 'item_points', 'item_max', 'item_active_s']
           when 'level_exit'         then array['item_index', 'active_s']
           when 'level_complete'     then array['score', 'max', 'stars', 'attempt_no', 'active_s', 'total_s', 'items']
           when 'world_complete'     then array['world_id', 'total_active_s']
           when 'copy_attempt'       then array['level_id', 'allowed', 'count_so_far']
           when 'paste'              then array['level_id', 'chars', 'blocked']
           when 'tab_hidden'         then array['level_id', 'hidden_s']
           when 'badge'              then array['badge_id']
           when 'checkpoint_resume'  then array['level_id', 'item_index', 'minutes_since_save']
           when 'feedback'           then array['kind', 'world_id', 'rating', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']
           else array[]::text[] end)
     and (jsonb_typeof(t.v) in ('number', 'boolean')
          or (jsonb_typeof(t.v) = 'string' and length(t.v #>> '{}') <= 80)
          or (p_type = 'feedback' and t.k = 'q5' and jsonb_typeof(t.v) = 'array' and length(t.v::text) <= 400));
$$;

-- ---- sign-up and sign-in --------------------------------------------------

-- New player: the server makes a unique anonymous player code.
create or replace function public.judge_register(p_cohort text, p_pin text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cohort text := trim(coalesce(p_cohort, ''));
  v_chars  constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code   text;
  v_tries  integer := 0;
  r        public.judge_players;
begin
  if p_pin is null or p_pin !~ '^\d{4}$' or not public.judge_cohort_ok(v_cohort) then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  loop
    v_code := 'JA-';
    for i in 1..4 loop
      v_code := v_code || substr(v_chars, 1 + (get_byte(gen_random_bytes(1), 0) % 32), 1);   -- 256 % 32 = 0: no bias
    end loop;
    begin
      insert into public.judge_players (cohort, player_code, pin_hash)
      values (v_cohort, v_code, crypt(p_pin, gen_salt('bf')))
      returning * into r;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries > 25 then
        return json_build_object('ok', false, 'error', 'busy');
      end if;
    end;
  end loop;
  return json_build_object('ok', true, 'player_code', r.player_code, 'token', r.token);
end;
$$;

-- Returning player: cohort + player code + PIN.
-- Returns the progress summary, the research-consent choice and any feedback already given.
create or replace function public.judge_login(p_cohort text, p_player_code text, p_pin text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.judge_players;
  v_worlds json;
  v_final  jsonb;
begin
  select * into r from public.judge_players
   where cohort = trim(coalesce(p_cohort, '')) and player_code = upper(trim(coalesce(p_player_code, '')));
  -- one message for "no such player" and "wrong PIN", so codes can't be probed
  if not found or p_pin is null or r.pin_hash <> crypt(p_pin, r.pin_hash) then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  if r.deleted_at is not null then
    return json_build_object('ok', false, 'error', 'deleted');
  end if;

  select coalesce(json_object_agg(f.world_id, json_build_object(
           'rating', (f.payload->>'rating')::int, 'comment', coalesce(f.payload->>'comment', ''),
           'at', (extract(epoch from f.updated_at) * 1000)::bigint)), '{}'::json)
    into v_worlds
    from public.judge_feedback f where f.player_id = r.id and f.kind = 'world';
  select f.payload into v_final from public.judge_feedback f where f.player_id = r.id and f.kind = 'final';

  return json_build_object(
    'ok', true, 'token', r.token, 'progress', r.progress,
    'research_consent', r.research_consent,
    'feedback', json_build_object('worlds', v_worlds, 'final', v_final));
end;
$$;

-- ---- progress and leaderboard ---------------------------------------------

-- p_progress = { levels: {id: {done, best, max, stars, attempts}}, badges: [ids], worlds_done: n }
create or replace function public.judge_save(p_token uuid, p_progress jsonb, p_xp integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_progress is null or jsonb_typeof(p_progress) <> 'object' or length(p_progress::text) > 20000 then
    raise exception 'bad progress';
  end if;
  update public.judge_players
     set progress = jsonb_build_object(
           'levels',      case when jsonb_typeof(p_progress->'levels') = 'object' then p_progress->'levels' else '{}'::jsonb end,
           'badges',      case when jsonb_typeof(p_progress->'badges') = 'array'  then p_progress->'badges' else '[]'::jsonb end,
           'worlds_done', coalesce(nullif(p_progress->>'worlds_done', '')::int, 0)),
         xp = greatest(0, least(coalesce(p_xp, 0), 100000)),
         updated_at = now()
   where token = p_token and deleted_at is null;
end;
$$;

-- One leaderboard for everyone, across all cohorts. Players with no XP and deleted players
-- are left out. Only a shortened player code (first five characters, then **) and XP are
-- returned, so the public list can't be used to guess full codes.
create or replace function public.judge_leaderboard(p_limit integer default 10)
returns table (player_code text, xp integer)
language sql
security definer
set search_path = public, extensions
as $$
  select left(player_code, 5) || '**', xp from public.judge_players
   where player_code is not null and deleted_at is null and xp > 0
   order by xp desc, updated_at asc
   limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

-- ---- research consent -----------------------------------------------------

create or replace function public.judge_set_consent(p_token uuid, p_consent boolean)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update public.judge_players
     set research_consent = p_consent, consent_at = now()
   where token = p_token and deleted_at is null;
$$;

-- ---- feedback -------------------------------------------------------------

-- p_kind 'world' (p_world = 'w1'..'w5') or 'final' (p_world null). Comment text lives here only.
create or replace function public.judge_feedback(p_token uuid, p_kind text, p_world text, p_payload jsonb)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare r public.judge_players; v_world text := coalesce(p_world, '');
begin
  select * into r from public.judge_players where token = p_token and deleted_at is null;
  if not found then return json_build_object('ok', false, 'error', 'unknown_player'); end if;
  if p_kind not in ('world', 'final')
     or (p_kind = 'world' and v_world !~ '^[a-z0-9-]{1,12}$')
     or (p_kind = 'final' and v_world <> '')
     or p_payload is null or jsonb_typeof(p_payload) <> 'object' or length(p_payload::text) > 6000 then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  insert into public.judge_feedback (player_id, cohort, kind, world_id, payload)
  values (r.id, r.cohort, p_kind, v_world, p_payload)
  on conflict (player_id, kind, world_id)
  do update set payload = excluded.payload, updated_at = now();
  return json_build_object('ok', true);
end;
$$;

-- ---- engagement events ----------------------------------------------------

-- A batch of at most 50 events, each payload under 2 KB. Rejected if the player
-- has not agreed. Unknown event types are ignored.
create or replace function public.judge_log_events(p_token uuid, p_events jsonb)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  p        public.judge_players;
  ev       jsonb;
  n        integer := 0;
  v_type   text;
  v_payload jsonb;
  v_ts     timestamptz;
  v_sid    uuid;
  v_now    timestamptz := now();
  v_world  text;
  v_level  text;
  v_types  constant text[] := array['session_start', 'session_end', 'world_open', 'level_start', 'item_done',
                                    'level_exit', 'level_complete', 'world_complete', 'copy_attempt', 'paste',
                                    'tab_hidden', 'badge', 'checkpoint_resume', 'feedback'];
begin
  select * into p from public.judge_players where token = p_token and deleted_at is null;
  if not found then return json_build_object('ok', false, 'error', 'unknown_player'); end if;
  if p.research_consent is not true then return json_build_object('ok', false, 'error', 'no_consent'); end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 50 then
    return json_build_object('ok', false, 'error', 'bad_batch');
  end if;
  for ev in select * from jsonb_array_elements(p_events) loop
    if length(coalesce(ev->'payload', '{}'::jsonb)::text) >= 2048 then
      return json_build_object('ok', false, 'error', 'payload_too_large');
    end if;
  end loop;

  for ev in select * from jsonb_array_elements(p_events) loop
    v_type := ev->>'type';
    continue when v_type is null or not (v_type = any (v_types));
    v_payload := public.judge_clean_payload(v_type, coalesce(ev->'payload', '{}'::jsonb));
    begin v_ts := (ev->>'client_ts')::timestamptz; exception when others then v_ts := v_now; end;
    begin v_sid := (ev->>'session_id')::uuid; exception when others then v_sid := null; end;
    v_world := case when (ev->>'world_id') ~ '^[a-z0-9-]{1,12}$' then ev->>'world_id' end;
    v_level := case when (ev->>'level_id') ~ '^[a-z0-9-]{1,20}$' then ev->>'level_id' end;

    if v_type = 'session_start' then
      -- a new visit is a session starting more than 30 minutes after the last activity
      if p.visit_count = 0 or v_now - p.last_seen > interval '30 minutes' then
        p.visit_count := p.visit_count + 1;
        update public.judge_players set visit_count = p.visit_count where id = p.id;
      end if;
      p.last_seen := v_now;
      v_payload := v_payload || jsonb_build_object('visit_number', p.visit_count);
    end if;

    insert into public.judge_events (player_id, session_id, cohort, type, world_id, level_id, payload, client_ts)
    values (p.id, v_sid, p.cohort, v_type, v_world, v_level, v_payload, v_ts);
    n := n + 1;
  end loop;

  update public.judge_players set last_seen = v_now where id = p.id;
  return json_build_object('ok', true, 'stored', n);
end;
$$;

-- ---- erase my data --------------------------------------------------------

-- The player deletes their account. Progress, feedback and usage events are removed and
-- research consent is withdrawn. Only the player code stays, flagged deleted in the
-- judge_players table (visible in Supabase only, not on the website). The code can
-- no longer be signed in to, saves nothing new and is left off the leaderboard.
create or replace function public.judge_erase(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare r public.judge_players;
begin
  select * into r from public.judge_players where token = p_token;
  if not found then return json_build_object('ok', false, 'error', 'unknown_player'); end if;
  delete from public.judge_events   where player_id = r.id;
  delete from public.judge_feedback where player_id = r.id;
  update public.judge_players
     set progress = '{}'::jsonb, state = '{}'::jsonb, xp = 0, visit_count = 0,
         research_consent = false, consent_at = now(),
         deleted_at = coalesce(deleted_at, now()), updated_at = now()
   where id = r.id;
  return json_build_object('ok', true);
end;
$$;

-- ---- instructor: dashboard, feedback summary, exports (all need the staff code) ----

create or replace function public.judge_class_progress(p_cohort text, p_staff_code text)
returns table (player_code text, xp integer, levels_done integer, badges integer, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.judge_check_staff(p_staff_code) then raise exception 'not authorised'; end if;
  return query
    select p.player_code, p.xp,
           coalesce((select count(*) from jsonb_each(coalesce(p.progress->'levels', '{}'::jsonb)) l where l.value->>'done' = 'true'), 0)::int,
           coalesce(jsonb_array_length(case when jsonb_typeof(p.progress->'badges') = 'array' then p.progress->'badges' else '[]'::jsonb end), 0)::int,
           p.updated_at
      from public.judge_players p
     where p.cohort = trim(p_cohort) and p.player_code is not null and p.deleted_at is null
     order by p.xp desc;
end;
$$;

-- Average stars per world and how many chose each option of each final question.
create or replace function public.judge_feedback_summary(p_cohort text, p_staff_code text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_worlds json; v_final json;
begin
  if not public.judge_check_staff(p_staff_code) then raise exception 'not authorised'; end if;

  select coalesce(json_agg(json_build_object('world_id', world_id, 'avg', avg_rating, 'n', n) order by world_id), '[]'::json)
    into v_worlds
    from (select f.world_id, round(avg((f.payload->>'rating')::numeric), 2) as avg_rating, count(*) as n
            from public.judge_feedback f
           where f.kind = 'world' and f.cohort = trim(p_cohort) and (f.payload->>'rating') ~ '^[1-5]$'
           group by f.world_id) w;

  with answers as (
    select a.key as q, a.value #>> '{}' as opt
      from public.judge_feedback f, jsonb_each(f.payload) a
     where f.kind = 'final' and f.cohort = trim(p_cohort)
       and a.key in ('q1', 'q2', 'q3', 'q4', 'q6', 'q7', 'q8') and jsonb_typeof(a.value) = 'string'
    union all
    select 'q5', o
      from public.judge_feedback f, jsonb_array_elements_text(case when jsonb_typeof(f.payload->'q5') = 'array' then f.payload->'q5' else '[]'::jsonb end) o
     where f.kind = 'final' and f.cohort = trim(p_cohort)
  ), counted as (
    select q, opt, count(*) as n from answers group by q, opt
  )
  select coalesce(json_object_agg(q, opts), '{}'::json)
    into v_final
    from (select q, json_object_agg(opt, n) as opts from counted group by q) x;

  return json_build_object('worlds', v_worlds, 'final', v_final);
end;
$$;

-- Raw events for players who agreed (and still agree). Returned as a JSON array.
create or replace function public.judge_export_events(p_cohort text, p_staff_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.judge_check_staff(p_staff_code) then raise exception 'not authorised'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', e.id, 'player_code', p.player_code, 'session_id', e.session_id, 'cohort', e.cohort,
             'type', e.type, 'world_id', e.world_id, 'level_id', e.level_id, 'payload', e.payload,
             'client_ts', e.client_ts, 'created_at', e.created_at) order by e.id)
      from public.judge_events e
      join public.judge_players p on p.id = e.player_id
     where e.cohort = trim(p_cohort) and p.research_consent is true), '[]'::jsonb);
end;
$$;

-- One row per player. Everyone gets progress; engagement and feedback only for players who agreed.
create or replace function public.judge_export_summary(p_cohort text, p_staff_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.judge_check_staff(p_staff_code) then raise exception 'not authorised'; end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'player_code', p.player_code,
        'research_consent', p.research_consent,
        'levels_done', (select count(*) from jsonb_each(coalesce(p.progress->'levels', '{}'::jsonb)) l where l.value->>'done' = 'true'),
        'levels', coalesce((select jsonb_object_agg(l.key, jsonb_build_object('best', l.value->'best', 'max', l.value->'max')) from jsonb_each(coalesce(p.progress->'levels', '{}'::jsonb)) l), '{}'::jsonb))
      ||
      case when p.research_consent is true then jsonb_build_object(
        'visits', p.visit_count,
        'total_active_s', coalesce((select sum((e.payload->>'active_s')::numeric) from public.judge_events e where e.player_id = p.id and e.type = 'session_end'), 0),
        'level_active_s', coalesce((select jsonb_object_agg(x.level_id, x.s)
                                      from (select e.level_id, sum((e.payload->>'active_s')::numeric) as s
                                              from public.judge_events e
                                             where e.player_id = p.id and e.type in ('level_complete', 'level_exit') and e.level_id is not null
                                             group by e.level_id) x), '{}'::jsonb),
        'copy_attempts', (select count(*) from public.judge_events e where e.player_id = p.id and e.type = 'copy_attempt'),
        'copies_blocked', (select count(*) from public.judge_events e where e.player_id = p.id and e.type = 'copy_attempt' and e.payload->>'allowed' = 'false'),
        'pastes', (select count(*) from public.judge_events e where e.player_id = p.id and e.type = 'paste'),
        'world_ratings', coalesce((select jsonb_object_agg(f.world_id, f.payload->'rating') from public.judge_feedback f where f.player_id = p.id and f.kind = 'world'), '{}'::jsonb),
        'final', coalesce((select f.payload from public.judge_feedback f where f.player_id = p.id and f.kind = 'final'), '{}'::jsonb))
      else '{}'::jsonb end
      order by p.player_code)
      from public.judge_players p
     where p.cohort = trim(p_cohort) and p.player_code is not null and p.deleted_at is null), '[]'::jsonb);
end;
$$;

-- ---- who may call what ----------------------------------------------------

revoke all on function public.judge_check_staff(text)                          from public;
revoke all on function public.judge_cohort_ok(text)                            from public;
revoke all on function public.judge_clean_payload(text, jsonb)                 from public;
revoke all on function public.judge_register(text, text)                       from public;
revoke all on function public.judge_login(text, text, text)                    from public;
revoke all on function public.judge_save(uuid, jsonb, integer)                 from public;
revoke all on function public.judge_leaderboard(integer)                       from public;
revoke all on function public.judge_set_consent(uuid, boolean)                 from public;
revoke all on function public.judge_erase(uuid)                                from public;
revoke all on function public.judge_feedback(uuid, text, text, jsonb)          from public;
revoke all on function public.judge_log_events(uuid, jsonb)                    from public;
revoke all on function public.judge_class_progress(text, text)                 from public;
revoke all on function public.judge_feedback_summary(text, text)               from public;
revoke all on function public.judge_export_events(text, text)                  from public;
revoke all on function public.judge_export_summary(text, text)                 from public;

grant execute on function public.judge_register(text, text)                    to anon, authenticated;
grant execute on function public.judge_login(text, text, text)                 to anon, authenticated;
grant execute on function public.judge_save(uuid, jsonb, integer)              to anon, authenticated;
grant execute on function public.judge_leaderboard(integer)                    to anon, authenticated;
grant execute on function public.judge_set_consent(uuid, boolean)              to anon, authenticated;
grant execute on function public.judge_erase(uuid)                             to anon, authenticated;
grant execute on function public.judge_feedback(uuid, text, text, jsonb)       to anon, authenticated;
grant execute on function public.judge_log_events(uuid, jsonb)                 to anon, authenticated;
grant execute on function public.judge_class_progress(text, text)              to anon, authenticated;
grant execute on function public.judge_feedback_summary(text, text)            to anon, authenticated;
grant execute on function public.judge_export_events(text, text)               to anon, authenticated;
grant execute on function public.judge_export_summary(text, text)              to anon, authenticated;

-- To change the staff code later:
--   update public.judge_settings set value = extensions.crypt('NEW-CODE', extensions.gen_salt('bf')) where key = 'staff_code_hash';
-- To remove a whole cohort after a session:
--   delete from public.judge_players where cohort = 'T1|25/26';
-- To delete one player's usage events (for example if they withdraw consent):
--   delete from public.judge_events where player_id = (select id from public.judge_players where player_code = 'JA-7K3P');
