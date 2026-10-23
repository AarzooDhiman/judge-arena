-- ==========================================================================
-- JUDGE Arena — optional Supabase backend
-- Run this once in the Supabase SQL editor (or via the Supabase MCP / CLI).
-- Students never get email accounts. They sign in with class code + nickname
-- + 4-digit PIN through the functions below. The table itself is closed to
-- the browser (RLS on, no policies); only these functions can touch it.
-- ==========================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.judge_players (
  id          uuid primary key default gen_random_uuid(),
  class_code  text not null,
  nickname    text not null,
  pin_hash    text not null,
  token       uuid not null default gen_random_uuid(),
  state       jsonb not null default '{}'::jsonb,
  xp          integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists judge_players_class_nick on public.judge_players (class_code, lower(nickname));
create unique index if not exists judge_players_token on public.judge_players (token);
alter table public.judge_players enable row level security;   -- no policies: browser can't read it directly

create table if not exists public.judge_settings (
  key   text primary key,
  value text not null
);
alter table public.judge_settings enable row level security;

-- Staff code for the class dashboard. CHANGE 'CHANGE-ME' before running.
insert into public.judge_settings (key, value)
values ('staff_code_hash', extensions.crypt('CHANGE-ME', extensions.gen_salt('bf')))
on conflict (key) do nothing;

-- Optional: the class codes the server accepts. Leave empty to accept any.
create table if not exists public.judge_classes (
  code  text primary key,
  label text
);
alter table public.judge_classes enable row level security;

-- --------------------------------------------------------------------------
-- Sign in or create a player. Returns {ok, token, state} or {ok:false}.
-- --------------------------------------------------------------------------
create or replace function public.judge_login(p_class text, p_nick text, p_pin text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.judge_players;
  v_class text := upper(trim(p_class));
  v_nick  text := trim(p_nick);
begin
  if length(v_nick) < 2 or length(v_nick) > 20 or p_pin !~ '^\d{4}$' then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  if exists (select 1 from public.judge_classes)
     and not exists (select 1 from public.judge_classes where code = v_class) then
    return json_build_object('ok', false, 'error', 'unknown_class');
  end if;

  select * into r from public.judge_players
   where class_code = v_class and lower(nickname) = lower(v_nick);

  if not found then
    insert into public.judge_players (class_code, nickname, pin_hash)
    values (v_class, v_nick, crypt(p_pin, gen_salt('bf')))
    returning * into r;
  elsif r.pin_hash <> crypt(p_pin, r.pin_hash) then
    return json_build_object('ok', false, 'error', 'wrong_pin');
  end if;

  return json_build_object('ok', true, 'token', r.token, 'state', r.state);
end;
$$;

-- --------------------------------------------------------------------------
-- Save progress (called by the app after each level).
-- --------------------------------------------------------------------------
create or replace function public.judge_save(p_token uuid, p_state jsonb, p_xp integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if length(p_state::text) > 200000 then
    raise exception 'state too large';
  end if;
  update public.judge_players
     set state = p_state, xp = greatest(0, least(p_xp, 100000)), updated_at = now()
   where token = p_token;
end;
$$;

-- --------------------------------------------------------------------------
-- Class leaderboard: nicknames and XP only.
-- --------------------------------------------------------------------------
create or replace function public.judge_leaderboard(p_class text)
returns table (nickname text, xp integer)
language sql
security definer
set search_path = public, extensions
as $$
  select nickname, xp from public.judge_players
   where class_code = upper(trim(p_class))
   order by xp desc, updated_at asc
   limit 50;
$$;

-- --------------------------------------------------------------------------
-- Instructor dashboard: per-player progress, needs the staff code.
-- --------------------------------------------------------------------------
create or replace function public.judge_class_progress(p_class text, p_staff_code text)
returns table (nickname text, xp integer, levels_done integer, badges integer, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare h text;
begin
  select value into h from public.judge_settings where key = 'staff_code_hash';
  if h is null or h <> crypt(p_staff_code, h) then
    raise exception 'not authorised';
  end if;
  return query
    select p.nickname, p.xp,
           coalesce((select count(*) from jsonb_object_keys(coalesce(p.state->'levels', '{}'::jsonb)))::int, 0),
           coalesce((select count(*) from jsonb_object_keys(coalesce(p.state->'badges', '{}'::jsonb)))::int, 0),
           p.updated_at
      from public.judge_players p
     where p.class_code = upper(trim(p_class))
     order by p.xp desc;
end;
$$;

revoke all on function public.judge_login(text, text, text) from public;
revoke all on function public.judge_save(uuid, jsonb, integer) from public;
revoke all on function public.judge_leaderboard(text) from public;
revoke all on function public.judge_class_progress(text, text) from public;
grant execute on function public.judge_login(text, text, text) to anon, authenticated;
grant execute on function public.judge_save(uuid, jsonb, integer) to anon, authenticated;
grant execute on function public.judge_leaderboard(text) to anon, authenticated;
grant execute on function public.judge_class_progress(text, text) to anon, authenticated;

-- To change the staff code later:
-- update public.judge_settings set value = extensions.crypt('NEW-CODE', extensions.gen_salt('bf')) where key = 'staff_code_hash';
-- To reset a class after a session:
-- delete from public.judge_players where class_code = 'AAI-WK9';
