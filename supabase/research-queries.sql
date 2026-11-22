-- ==========================================================================
-- JUDGE Arena: research queries (run in the Supabase SQL editor only)
--
-- These are NOT part of the website and nothing here is exposed to the browser.
-- Paste one query at a time into the SQL editor and run it. Use "Download CSV"
-- under the results to save them. Change 'T1|25/26' to the cohort you want.
--
-- Usage events (worlds opened, question scores) exist only for players who agreed
-- to research. Deleted players have no data at all, only a flagged player code.
-- ==========================================================================

-- 1. Worlds each player took part in (opened) and completed, plus levels done.
select p.player_code,
       p.research_consent,
       count(distinct e.world_id) filter (where e.type = 'world_open')     as worlds_opened,
       count(distinct e.world_id) filter (where e.type = 'world_complete') as worlds_completed,
       coalesce((select count(*) from jsonb_each(coalesce(p.progress->'levels', '{}'::jsonb)) l
                  where l.value->>'done' = 'true'), 0)                     as levels_done
  from public.judge_players p
  left join public.judge_events e on e.player_id = p.id
 where p.cohort = 'T1|25/26' and p.player_code is not null and p.deleted_at is null
 group by p.id
 order by p.player_code;

-- 2. Which worlds each player opened (one row per player and world).
select p.player_code, e.world_id, min(e.created_at) as first_opened
  from public.judge_events e
  join public.judge_players p on p.id = e.player_id
 where p.cohort = 'T1|25/26' and e.type = 'world_open' and p.deleted_at is null
 group by p.player_code, e.world_id
 order by p.player_code, e.world_id;

-- 3. Score for each question, latest attempt (one row per player, level and question).
--    question_no starts at 1.
select p.player_code, w.level_id, w.question_no, w.points, w.max_points
  from (select distinct on (e.player_id, e.level_id, e.payload->>'item_index')
               e.player_id, e.level_id,
               (e.payload->>'item_index')::int + 1 as question_no,
               (e.payload->>'item_points')::numeric as points,
               (e.payload->>'item_max')::numeric    as max_points
          from public.judge_events e
         where e.type = 'item_done' and e.level_id is not null
           and (e.payload->>'item_index') ~ '^[0-9]+$'
         order by e.player_id, e.level_id, e.payload->>'item_index', e.id desc) w
  join public.judge_players p on p.id = w.player_id
 where p.cohort = 'T1|25/26' and p.deleted_at is null
 order by p.player_code, w.level_id, w.question_no;

-- 4. The same, one row per player with a column for every level and question.
--    (Question scores are numbers; blank means the player has not reached it.)
select p.player_code,
       jsonb_object_agg(w.level_id || '_q' || w.question_no, w.points) as scores
  from (select distinct on (e.player_id, e.level_id, e.payload->>'item_index')
               e.player_id, e.level_id,
               (e.payload->>'item_index')::int + 1 as question_no,
               (e.payload->>'item_points')::numeric as points
          from public.judge_events e
         where e.type = 'item_done' and e.level_id is not null
           and (e.payload->>'item_index') ~ '^[0-9]+$'
         order by e.player_id, e.level_id, e.payload->>'item_index', e.id desc) w
  join public.judge_players p on p.id = w.player_id
 where p.cohort = 'T1|25/26' and p.deleted_at is null
 group by p.player_code
 order by p.player_code;

-- 5. Player codes that were deleted by their owner (only the code and date remain).
select player_code, cohort, deleted_at
  from public.judge_players
 where deleted_at is not null
 order by deleted_at desc;
