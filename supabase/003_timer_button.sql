-- Book Dude Next: Pause and Resume from the grown-ups' screen-time alerts.
--
-- HOW TO USE: run supabase/001_foundation.sql first (once). Then paste this whole file into the Supabase SQL Editor
-- and press Run. It is safe to run again.
--
-- WHAT IT ADDS
--   One function, public.timer_button(pause_key, what), that pauses or resumes a reader's screen-time clock, or just
--   says where it is ('look'). It can be called without signing in, because a tap on a phone's notification has no
--   sign-in: what it needs instead is the reader's pause code, a long random code Book Dude makes when a grown-up turns
--   on screen-time alerts (kept in her "alerts" setting, and put only in the grown-ups' alerts, never her iPad's).
--
-- THE RULES, in plain words
--   * Without the right pause code it does nothing and says nothing.
--   * With it, it can only pause or resume that one reader's clock, never add minutes, stop it, or touch anything else.
--   * It answers with the clock and the reader's two alert topics, so the page that called it can send the alerts.

begin;

create or replace function public.timer_button(pause_key text, what text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  kid uuid;
  topics jsonb;
  t jsonb;
  who text;
  now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000);
  mins bigint;
  st bigint;
  used bigint;
  left_ms bigint;
  state text;
  changed boolean := false;
begin
  if pause_key is null or pause_key !~ '^[A-Za-z0-9_-]{24,64}$' or what is null or what not in ('pause', 'resume', 'look') then
    return jsonb_build_object('error', 'bad');
  end if;
  select i.kid_id, i.data -> 'v' into kid, topics from public.items i
    where i.kind = 'setting' and i.id = 'alerts' and not i.deleted and i.data -> 'v' ->> 'key' = pause_key
    limit 1;
  if kid is null then return jsonb_build_object('error', 'unknown'); end if;
  select k.name into who from public.kids k where k.id = kid;
  select i.data -> 'v' into t from public.items i where i.kid_id = kid and i.kind = 'setting' and i.id = 'timer' and not i.deleted;

  if t is null or jsonb_typeof(t) <> 'object' or coalesce((t ->> 'stopped')::boolean, false) then
    state := 'none';
  else
    mins := (t ->> 'minutes')::bigint;
    st := coalesce(round((t ->> 'start')::numeric), 0);
    used := coalesce(round((t ->> 'used')::numeric), 0);
    left_ms := greatest(0, mins * 60000 - used - case when st > 0 then greatest(0, now_ms - st) else 0 end);
    state := case when left_ms = 0 then 'up' when st > 0 then 'running' else 'paused' end;
    if (what = 'pause' and state = 'running') or (what = 'resume' and state = 'paused') then
      t := t || case when what = 'pause'
        then jsonb_build_object('start', 0, 'used', mins * 60000 - left_ms)
        else jsonb_build_object('start', now_ms) end
        || jsonb_build_object('at', to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
      -- A newer time than the clock's last change, so every device takes it (even one whose clock runs a little fast).
      update public.items i set data = jsonb_build_object('v', t), client_at = greatest(clock_timestamp(), i.client_at + interval '1 millisecond')
        where i.kid_id = kid and i.kind = 'setting' and i.id = 'timer';
      state := case when what = 'pause' then 'paused' else 'running' end;
      changed := true;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true, 'changed', changed, 'state', state, 'name', who,
    'id', t ->> 'id', 'minutes', mins, 'left', left_ms,
    'ends', case when state = 'running' then now_ms + left_ms else 0 end,
    'grown', topics ->> 'grown', 'kid', topics ->> 'kid');
end $$;

revoke all on function public.timer_button(text, text) from public;
grant execute on function public.timer_button(text, text) to anon, authenticated;

commit;
