-- Book Dude Next: the arcade scoreboard.
--
-- HOW TO USE: run supabase/001_foundation.sql first (once). Then paste this whole file into the Supabase SQL Editor
-- and press Run. It is safe to run again: it only adds what is missing and refreshes the rules.
--
-- WHAT IT SETS UP
--   Scores: each player's best result on each level of each game. A player is a reader, or a grown-up playing as
--   themselves. A score only ever gets better: saving a worse one changes nothing.
--   The scoreboard: the best results of everyone in the asker's own family, by first name.
--
-- THE RULES, in plain words
--   * Nobody can read or write the scores table from the website. Two functions are the only way in.
--   * save_scores saves the asker's own scores, never anyone else's: a reader's device saves that reader's, a
--     signed-in grown-up saves their own.
--   * scoreboard shows first names, stars and scores for the asker's own family, and nothing else about anyone.
--     (To let every invited family play against each other later, only the scoreboard function has to change.)

begin;

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  kid_id uuid references public.kids (id) on delete cascade,
  grownup_id uuid references auth.users (id) on delete cascade,
  game text not null check (game ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  level text not null check (level ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  stars int not null check (stars between 0 and 3),
  score numeric not null,
  at timestamptz not null default now(),
  constraint scores_one_player check ((kid_id is null) <> (grownup_id is null))
);
create unique index if not exists scores_kid on public.scores (kid_id, game, level) where kid_id is not null;
create unique index if not exists scores_grownup on public.scores (grownup_id, game, level) where grownup_id is not null;

alter table public.scores enable row level security;
revoke all on public.scores from public, anon, authenticated;

-- Saves the asker's own scores, given as { game: { level: { stars, score } } }, keeping the better result on each
-- level (more stars, then the higher score), and answers with all of the asker's best scores in the same shape, so
-- a device also learns what its player did on other devices.
create or replace function public.save_scores(scores jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  grownup uuid;
  kid uuid;
  g record;
  l record;
  seen int := 0;
  s int;
  n numeric;
begin
  select x.user_id into grownup from public.grownups x where x.user_id = me;
  if grownup is null then
    select d.kid_id into kid from public.kid_devices d where d.user_id = me;
  end if;
  if grownup is null and kid is null then
    raise exception 'Only a signed-in reader or grown-up has scores.' using errcode = '42501';
  end if;
  if jsonb_typeof(save_scores.scores) = 'object' then
    for g in select key, value from jsonb_each(save_scores.scores) loop
      continue when g.key !~ '^[a-z0-9][a-z0-9-]{0,39}$' or jsonb_typeof(g.value) <> 'object';
      for l in select key, value from jsonb_each(g.value) loop
        seen := seen + 1;
        exit when seen > 300;
        continue when l.key !~ '^[a-z0-9][a-z0-9-]{0,39}$' or jsonb_typeof(l.value) <> 'object'
          or jsonb_typeof(l.value -> 'stars') <> 'number' or jsonb_typeof(l.value -> 'score') <> 'number';
        n := (l.value ->> 'stars')::numeric;
        continue when n <> trunc(n) or n < 0 or n > 3;
        s := n::int;
        n := round((l.value ->> 'score')::numeric, 2);
        continue when abs(n) > 1000000000;
        if kid is not null then
          insert into public.scores as t (kid_id, game, level, stars, score) values (kid, g.key, l.key, s, n)
            on conflict (kid_id, game, level) where kid_id is not null
            do update set stars = excluded.stars, score = excluded.score, at = now()
            where (excluded.stars, excluded.score) > (t.stars, t.score);
        else
          insert into public.scores as t (grownup_id, game, level, stars, score) values (grownup, g.key, l.key, s, n)
            on conflict (grownup_id, game, level) where grownup_id is not null
            do update set stars = excluded.stars, score = excluded.score, at = now()
            where (excluded.stars, excluded.score) > (t.stars, t.score);
        end if;
      end loop;
    end loop;
  end if;
  return coalesce((
    select jsonb_object_agg(x.game, x.levels) from (
      select t.game, jsonb_object_agg(t.level, jsonb_build_object('stars', t.stars, 'score', t.score)) as levels
      from public.scores t
      where (kid is not null and t.kid_id = kid) or (grownup is not null and t.grownup_id = grownup)
      group by t.game) x), '{}'::jsonb);
end $$;

-- The scoreboard for one game: everyone in the asker's own family who has a score, as
-- [{ name, me, level, stars, score }], best first on each level. First names only.
create or replace function public.scoreboard(game text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', p.name, 'me', p.me, 'level', t.level, 'stars', t.stars, 'score', t.score)
      order by t.level, t.stars desc, t.score desc, t.at), '[]'::jsonb)
  from public.scores t
  join (
    select k.id as kid_id, null::uuid as grownup_id, k.name,
      exists (select 1 from public.kid_devices d where d.kid_id = k.id and d.user_id = (select auth.uid())) as me
    from public.kids k where k.family_id = (select bookdude.my_family())
    union all
    select null::uuid, g.user_id, g.name, g.user_id = (select auth.uid())
    from public.grownups g where g.family_id = (select bookdude.my_family())
  ) p on p.kid_id = t.kid_id or p.grownup_id = t.grownup_id
  where t.game = scoreboard.game;
$$;

revoke all on function public.save_scores(jsonb), public.scoreboard(text) from public, anon, authenticated;
grant execute on function public.save_scores(jsonb), public.scoreboard(text) to authenticated;

commit;
