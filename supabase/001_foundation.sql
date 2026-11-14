-- Book Dude Next: the database foundation (schema version 2).
--
-- HOW TO USE: paste this whole file into the Supabase SQL Editor and press Run. It is safe to run again: it only
-- adds what is missing and refreshes the rules. It never deletes a family, a reader or anything they saved.
--
-- WHAT IT SETS UP
--   Families. Each family has grown-ups and readers (kids). Every family's data is private to that family.
--   Grown-ups sign up with an email, a password and a one-time invite code. No code, no account.
--   Readers sign in on a device with a username and a password their grown-up set. A reader has no email.
--   Items: what the app saves for a reader (her book records, the books she added, her settings), with the newest
--   copy winning when two devices disagree.
--
-- THE RULES (row level security), in plain words
--   * Someone who is not signed in can do two things: ping (the daily check-in) and ask whether an invite code is
--     good. They can read nothing.
--   * A reader's device can read and write that reader's items, and nothing else.
--   * A grown-up can read and write the items of the readers in their own family, and manage those readers.
--   * An admin (the people who run this Book Dude) can also make invite codes and see the list of families.
--   * Passwords and invite codes are stored only as fingerprints, in tables the website can never read.
--
-- Nothing here is a secret. The secrets (the database password, the service key) are never needed by Book Dude.

begin;

create extension if not exists pgcrypto with schema extensions;

-- Private helpers and secrets live in their own schema, which the website's API never exposes.
create schema if not exists bookdude;
revoke all on schema bookdude from public;

------------------------------------------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------------------------------------------

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  -- COBOL (the Claude chat) is for one family only. It is switched on here by the owner, never from the website.
  cobol boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.grownups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 40),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists grownups_family on public.grownups (family_id);

create table if not exists public.kids (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9_.-]{2,23}$'),
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);
create index if not exists kids_family on public.kids (family_id);

-- A device signed in as a reader. The device has its own nameless sign-in (an "anonymous" user) and this row says
-- which reader it is. Removing the row signs that device out.
create table if not exists public.kid_devices (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists kid_devices_kid on public.kid_devices (kid_id);

-- What the app saves for a reader. kind 'record' is one book's journal entry, 'book' is a book she added herself,
-- 'setting' is one of her settings. `data` is the app's own JSON. `client_at` is when the device saved it: the
-- newest copy wins. `deleted` marks something she removed (kept as an empty row so other devices hear about it).
-- `rev` goes up with every change, so a device can ask for "everything since the last time I looked".
create table if not exists public.items (
  kid_id uuid not null references public.kids (id) on delete cascade,
  kind text not null check (kind in ('record', 'book', 'setting')),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb not null,
  client_at timestamptz not null,
  deleted boolean not null default false,
  rev bigint not null default 0,
  primary key (kid_id, kind, id),
  constraint items_size check (octet_length(data::text) <= case kind when 'record' then 20000 when 'book' then 450000 else 200000 end)
);
create index if not exists items_pull on public.items (kid_id, rev);

-- Private: reader passwords (as bcrypt fingerprints) and wrong-guess counts.
create table if not exists bookdude.kid_secrets (
  kid_id uuid primary key references public.kids (id) on delete cascade,
  pass_hash text not null,
  fails int not null default 0,
  locked_until timestamptz
);

-- Private: invite codes (as fingerprints). An invite starts a new family (family_name) or joins one (family_id).
create table if not exists bookdude.invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  family_id uuid references public.families (id) on delete cascade,
  family_name text check (char_length(family_name) between 1 and 60),
  is_admin boolean not null default false,
  cobol boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid,
  constraint invites_target check ((family_id is null) <> (family_name is null))
);

-- Private: how much each reader has stored, so one account can never fill the database.
create table if not exists bookdude.usage (
  kid_id uuid primary key references public.kids (id) on delete cascade,
  bytes bigint not null default 0
);

-- Private: small facts about this database (when it last tidied up).
create table if not exists bookdude.meta (
  key text primary key,
  at timestamptz not null
);

create sequence if not exists bookdude.rev;

------------------------------------------------------------------------------------------------------------------
-- Who is asking? (used by the rules below)
------------------------------------------------------------------------------------------------------------------

-- The family of the signed-in grown-up, or null.
create or replace function bookdude.grownup_family() returns uuid
language sql stable security definer set search_path = '' as $$
  select g.family_id from public.grownups g where g.user_id = (select auth.uid());
$$;

create or replace function bookdude.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select g.is_admin from public.grownups g where g.user_id = (select auth.uid())), false);
$$;

-- The readers this sign-in may use: the one reader a device is signed in as, or all the readers in a grown-up's family.
create or replace function bookdude.my_kids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select d.kid_id from public.kid_devices d where d.user_id = (select auth.uid())
  union
  select k.id from public.kids k where k.family_id = (select bookdude.grownup_family());
$$;

-- The family this sign-in belongs to: a grown-up's, or the family of the reader a device is signed in as.
create or replace function bookdude.my_family() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select bookdude.grownup_family()),
    (select k.family_id from public.kid_devices d join public.kids k on k.id = d.kid_id where d.user_id = (select auth.uid())));
$$;

------------------------------------------------------------------------------------------------------------------
-- The rules: who can see and change what
------------------------------------------------------------------------------------------------------------------

alter table public.families enable row level security;
alter table public.grownups enable row level security;
alter table public.kids enable row level security;
alter table public.kid_devices enable row level security;
alter table public.items enable row level security;
alter table bookdude.kid_secrets enable row level security;
alter table bookdude.invites enable row level security;
alter table bookdude.usage enable row level security;
alter table bookdude.meta enable row level security;

-- Start from nothing, then give back exactly what the app needs. Changes to families, grown-ups, readers and
-- devices only happen through the functions further down, never by writing to the tables.
revoke all on public.families, public.grownups, public.kids, public.kid_devices, public.items from public, anon, authenticated;
revoke all on bookdude.kid_secrets, bookdude.invites, bookdude.usage, bookdude.meta from public, anon, authenticated;
revoke all on sequence bookdude.rev from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant usage on schema bookdude to authenticated;
grant select on public.families, public.grownups, public.kids, public.kid_devices to authenticated;
grant select, insert, update on public.items to authenticated;

drop policy if exists "own family, or an admin" on public.families;
create policy "own family, or an admin" on public.families for select to authenticated
  using (id = (select bookdude.my_family()) or (select bookdude.is_admin()));

drop policy if exists "grown-ups of the same family, or an admin" on public.grownups;
create policy "grown-ups of the same family, or an admin" on public.grownups for select to authenticated
  using (family_id = (select bookdude.grownup_family()) or (select bookdude.is_admin()));

drop policy if exists "the reader herself, or her family's grown-ups" on public.kids;
create policy "the reader herself, or her family's grown-ups" on public.kids for select to authenticated
  using (id in (select bookdude.my_kids()));

drop policy if exists "this device, or the reader's grown-ups" on public.kid_devices;
create policy "this device, or the reader's grown-ups" on public.kid_devices for select to authenticated
  using (user_id = (select auth.uid())
    or kid_id in (select k.id from public.kids k where k.family_id = (select bookdude.grownup_family())));

drop policy if exists "read a reader's items" on public.items;
create policy "read a reader's items" on public.items for select to authenticated
  using (kid_id in (select bookdude.my_kids()));

drop policy if exists "add a reader's items" on public.items;
create policy "add a reader's items" on public.items for insert to authenticated
  with check (kid_id in (select bookdude.my_kids()));

drop policy if exists "change a reader's items" on public.items;
create policy "change a reader's items" on public.items for update to authenticated
  using (kid_id in (select bookdude.my_kids()))
  with check (kid_id in (select bookdude.my_kids()));

------------------------------------------------------------------------------------------------------------------
-- Saving items: the newest copy wins, every change gets the next number, and no reader can fill the database
------------------------------------------------------------------------------------------------------------------

-- Before a save: an older copy never replaces a newer one, and the change gets the next number. This runs before the
-- rules decide whether the save is allowed, so it must not touch anything else.
create or replace function bookdude.stamp_item() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.client_at <= old.client_at then return null; end if;   -- quietly skipped
    new.kid_id := old.kid_id; new.kind := old.kind; new.id := old.id;
  end if;
  -- A device whose clock is wrong can't claim a time in the future and win every argument after that.
  if new.client_at > now() + interval '5 minutes' then new.client_at := now(); end if;
  new.rev := nextval('bookdude.rev');
  return new;
end $$;

-- After a save that the rules allowed: count what the reader has stored, and refuse the save if she is over the limit.
create or replace function bookdude.count_item() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  delta bigint := octet_length(new.data::text) - case when tg_op = 'UPDATE' then octet_length(old.data::text) else 0 end;
  total bigint;
begin
  insert into bookdude.usage as u (kid_id, bytes) values (new.kid_id, greatest(delta, 0))
    on conflict (kid_id) do update set bytes = greatest(0, u.bytes + delta)
    returning u.bytes into total;
  if total > 40000000 then
    raise exception 'Book Dude: this reader''s storage is full.' using errcode = '54000';
  end if;
  return null;
end $$;

drop trigger if exists stamp_item on public.items;
create trigger stamp_item before insert or update on public.items
  for each row execute function bookdude.stamp_item();

drop trigger if exists count_item on public.items;
create trigger count_item after insert or update on public.items
  for each row execute function bookdude.count_item();

------------------------------------------------------------------------------------------------------------------
-- Invite codes and signing up
------------------------------------------------------------------------------------------------------------------

-- A code as typed, tidied: letters and digits only, capitals.
create or replace function bookdude.tidy_code(code text) returns text
language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function bookdude.code_hash(code text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(bookdude.tidy_code(code), 'UTF8')), 'hex');
$$;

-- Makes an invite and returns its code, like 'K7WQ2-MX9PD'. The code is shown once and only its fingerprint is kept.
-- No letter O or I and no digit 0 or 1, so it survives being read out loud.
create or replace function bookdude.new_invite(family uuid, family_name text, admin boolean, cobol boolean, maker uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw bytea := extensions.gen_random_bytes(10);
  code text := '';
begin
  for i in 0..9 loop
    code := code || substr(alphabet, (get_byte(raw, i) & 31) + 1, 1);
  end loop;
  insert into bookdude.invites (code_hash, family_id, family_name, is_admin, cobol, created_by, expires_at)
    values (bookdude.code_hash(code), new_invite.family, new_invite.family_name, new_invite.admin, new_invite.cobol, new_invite.maker, now() + interval '14 days');
  return substr(code, 1, 5) || '-' || substr(code, 6);
end $$;

-- FOR THE OWNER, from the SQL Editor only (the website cannot call it):
--   select bookdude.owner_invite('Our family', true);
-- Returns an invite code for an admin grown-up. If a family with that name exists the code joins it; otherwise the
-- code starts that family (with COBOL on or off). This is how the very first grown-up gets in, and the way back in
-- if every admin forgets their password.
create or replace function bookdude.owner_invite(family_name text, cobol boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare
  fam uuid;
begin
  select f.id into fam from public.families f where f.name = btrim(owner_invite.family_name) order by f.created_at limit 1;
  if fam is not null then
    return bookdude.new_invite(fam, null, true, false, null);
  end if;
  return bookdude.new_invite(null, btrim(owner_invite.family_name), true, owner_invite.cobol, null);
end $$;

-- Nobody gets an account without a valid invite code. This runs inside Supabase's own sign-up, before the account
-- exists. A device's nameless sign-in (used only so a reader can then sign in on it) is let through: on its own it
-- can see nothing.
create or replace function bookdude.gate_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv bookdude.invites;
begin
  if new.is_anonymous then return new; end if;
  select * into inv from bookdude.invites i
    where i.code_hash = bookdude.code_hash(new.raw_user_meta_data ->> 'invite')
      and i.used_at is null and i.expires_at > now()
    for update;
  if not found then
    raise exception 'Book Dude: a valid invite code is needed to sign up.' using errcode = '42501';
  end if;
  update bookdude.invites set used_at = now(), used_by = new.id where id = inv.id;
  return new;
end $$;

-- Once the account exists, seat it: start the new family or join the existing one, as the invite said.
create or replace function bookdude.seat_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv bookdude.invites;
  fam uuid;
begin
  if new.is_anonymous then return new; end if;
  select * into inv from bookdude.invites i where i.used_by = new.id order by i.used_at desc limit 1;
  if not found then return new; end if;
  if inv.family_id is null then
    insert into public.families (name, cobol) values (inv.family_name, inv.cobol) returning id into fam;
  else
    fam := inv.family_id;
  end if;
  insert into public.grownups (user_id, family_id, name, is_admin)
    values (new.id, fam, left(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), 40), inv.is_admin);
  return new;
end $$;

-- A device's nameless sign-in stays nameless: it can never be turned into an email account, which would be a way
-- around the invite code (and a way to grab someone's email address before they sign up).
create or replace function bookdude.keep_device_nameless() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.is_anonymous and (new.is_anonymous is not true
      or coalesce(new.email, '') <> coalesce(old.email, '')
      or coalesce(new.phone, '') <> coalesce(old.phone, '')) then
    raise exception 'Book Dude: a device sign-in cannot become an account.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists bookdude_keep_device_nameless on auth.users;
create trigger bookdude_keep_device_nameless before update on auth.users
  for each row execute function bookdude.keep_device_nameless();

drop trigger if exists bookdude_gate_new_user on auth.users;
create trigger bookdude_gate_new_user before insert on auth.users
  for each row execute function bookdude.gate_new_user();

drop trigger if exists bookdude_seat_new_user on auth.users;
create trigger bookdude_seat_new_user after insert on auth.users
  for each row execute function bookdude.seat_new_user();

------------------------------------------------------------------------------------------------------------------
-- What the website can call
------------------------------------------------------------------------------------------------------------------

-- The daily check-in that keeps the free project awake. Anyone may call it; it tells them nothing. Once a day it
-- also tidies up: nameless device sign-ins that never became a reader, and invites that are long finished.
create or replace function public.ping() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  due boolean;
begin
  insert into bookdude.meta as m (key, at) values ('tidied', now())
    on conflict (key) do update set at = now() where m.at < now() - interval '20 hours'
    returning true into due;
  if due then
    begin
      delete from auth.users u
        where u.is_anonymous and u.created_at < now() - interval '7 days'
          and not exists (select 1 from public.kid_devices d where d.user_id = u.id);
      delete from bookdude.invites i
        where coalesce(i.used_at, i.expires_at) < now() - interval '60 days';
    exception when others then
      null; -- tidying is a courtesy: the check-in still counts
    end;
  end if;
  return jsonb_build_object('ok', true, 'schema', 2);
end $$;

-- Is this invite code good? The sign-up screen asks before it sends anything, so a mistyped code gets a clear
-- answer. Codes are ten random characters, so asking can't be used to guess one.
create or replace function public.invite_ok(code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from bookdude.invites i
    where i.code_hash = bookdude.code_hash(invite_ok.code) and i.used_at is null and i.expires_at > now());
$$;

-- Who am I? What the app asks right after signing in.
create or replace function public.me() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'schema', 2,
    'user', (select auth.uid()),
    'grownup', (select jsonb_build_object('name', g.name, 'admin', g.is_admin)
                from public.grownups g where g.user_id = (select auth.uid())),
    'family', (select jsonb_build_object('id', f.id, 'name', f.name, 'cobol', f.cobol)
               from public.families f where f.id = (select bookdude.my_family())),
    'kid', (select jsonb_build_object('id', k.id, 'name', k.name, 'username', k.username)
            from public.kid_devices d join public.kids k on k.id = d.kid_id where d.user_id = (select auth.uid())),
    'kids', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'name', k.name, 'username', k.username) order by k.created_at)
                      from public.kids k where k.id in (select bookdude.my_kids())), '[]'::jsonb));
$$;

-- A reader signs in on this device with her username and password. Five wrong guesses lock the username for 15
-- minutes, and the wait doubles with every five after that (up to a day), so guessing gets nowhere. A grown-up
-- setting a new password clears the lock.
create or replace function public.kid_sign_in(username text, password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  k public.kids;
  s bookdude.kid_secrets;
  wrong int;
begin
  if me is null then return jsonb_build_object('ok', false, 'why', 'session'); end if;
  if exists (select 1 from public.grownups g where g.user_id = me) then
    return jsonb_build_object('ok', false, 'why', 'grownup');
  end if;
  select * into k from public.kids c where c.username = lower(btrim(coalesce(kid_sign_in.username, '')));
  if not found then
    -- The same work as checking a real password, so a wrong username and a wrong password look alike.
    perform extensions.crypt(coalesce(kid_sign_in.password, ''), extensions.gen_salt('bf', 10));
    return jsonb_build_object('ok', false, 'why', 'no');
  end if;
  select * into s from bookdude.kid_secrets x where x.kid_id = k.id for update;
  if not found then return jsonb_build_object('ok', false, 'why', 'no'); end if;
  if s.locked_until is not null and s.locked_until > now() then
    return jsonb_build_object('ok', false, 'why', 'locked', 'until', s.locked_until);
  end if;
  if s.pass_hash <> extensions.crypt(coalesce(kid_sign_in.password, ''), s.pass_hash) then
    wrong := s.fails + 1;
    update bookdude.kid_secrets set fails = wrong,
      locked_until = case when wrong % 5 = 0
        then now() + least(interval '1 day', interval '15 minutes' * power(2, least(wrong / 5 - 1, 10))::int)
        else null end
      where kid_id = k.id;
    return jsonb_build_object('ok', false, 'why', 'no');
  end if;
  update bookdude.kid_secrets set fails = 0, locked_until = null where kid_id = k.id;
  insert into public.kid_devices (user_id, kid_id) values (me, k.id)
    on conflict (user_id) do update set kid_id = excluded.kid_id, created_at = now();
  -- At most ten devices per reader: the oldest sign-ins fall off.
  delete from public.kid_devices d where d.kid_id = k.id and d.user_id not in (
    select x.user_id from public.kid_devices x where x.kid_id = k.id order by x.created_at desc limit 10);
  return jsonb_build_object('ok', true, 'kid', jsonb_build_object('id', k.id, 'name', k.name, 'username', k.username));
end $$;

-- This device stops being a reader's device.
create or replace function public.kid_sign_out() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.kid_devices d where d.user_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- A grown-up adds a reader to their family, with the username and password she will sign in with.
create or replace function public.create_kid(name text, username text, password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  fam uuid := bookdude.grownup_family();
  n text := btrim(coalesce(create_kid.name, ''));
  u text := lower(btrim(coalesce(create_kid.username, '')));
  kid uuid;
begin
  if fam is null then raise exception 'Only a grown-up can add a reader.' using errcode = '42501'; end if;
  if n = '' or char_length(n) > 40 then return jsonb_build_object('ok', false, 'why', 'name'); end if;
  if u !~ '^[a-z0-9][a-z0-9_.-]{2,23}$' then return jsonb_build_object('ok', false, 'why', 'username'); end if;
  if char_length(coalesce(create_kid.password, '')) not between 6 and 72 then return jsonb_build_object('ok', false, 'why', 'password'); end if;
  if (select count(*) from public.kids c where c.family_id = fam) >= 12 then return jsonb_build_object('ok', false, 'why', 'full'); end if;
  begin
    insert into public.kids (family_id, username, name) values (fam, u, n) returning id into kid;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'why', 'taken');
  end;
  insert into bookdude.kid_secrets (kid_id, pass_hash)
    values (kid, extensions.crypt(create_kid.password, extensions.gen_salt('bf', 10)));
  return jsonb_build_object('ok', true, 'kid', jsonb_build_object('id', kid, 'name', n, 'username', u));
end $$;

-- A grown-up sets a new password for a reader in their family. Every device signed in as her is signed out, and any
-- lock from wrong guesses is cleared.
create or replace function public.set_kid_password(kid uuid, password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  fam uuid := bookdude.grownup_family();
begin
  if fam is null or not exists (select 1 from public.kids c where c.id = set_kid_password.kid and c.family_id = fam) then
    raise exception 'Only a grown-up in her family can change a reader''s password.' using errcode = '42501';
  end if;
  if char_length(coalesce(set_kid_password.password, '')) not between 6 and 72 then return jsonb_build_object('ok', false, 'why', 'password'); end if;
  insert into bookdude.kid_secrets as s (kid_id, pass_hash)
    values (set_kid_password.kid, extensions.crypt(set_kid_password.password, extensions.gen_salt('bf', 10)))
    on conflict (kid_id) do update set pass_hash = excluded.pass_hash, fails = 0, locked_until = null;
  delete from public.kid_devices d where d.kid_id = set_kid_password.kid;
  return jsonb_build_object('ok', true);
end $$;

-- A grown-up signs a reader out everywhere (a lost iPad). Her password stays the same.
create or replace function public.sign_out_kid(kid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  fam uuid := bookdude.grownup_family();
begin
  if fam is null or not exists (select 1 from public.kids c where c.id = sign_out_kid.kid and c.family_id = fam) then
    raise exception 'Only a grown-up in her family can sign a reader out.' using errcode = '42501';
  end if;
  delete from public.kid_devices d where d.kid_id = sign_out_kid.kid;
  return jsonb_build_object('ok', true);
end $$;

-- An admin makes an invite code. With nothing filled in it invites another grown-up into the admin's own family
-- (`admin` true makes them an admin too). `family` invites a grown-up into that family; `new_family` starts one.
-- Grown-ups of other families are never admins.
create or replace function public.create_invite(family uuid default null, new_family text default null, admin boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  mine uuid := bookdude.grownup_family();
  named text := nullif(btrim(coalesce(create_invite.new_family, '')), '');
  target uuid := create_invite.family;
begin
  if not bookdude.is_admin() then raise exception 'Only an admin can invite.' using errcode = '42501'; end if;
  if target is not null and named is not null then return jsonb_build_object('ok', false, 'why', 'both'); end if;
  if named is not null and char_length(named) > 60 then return jsonb_build_object('ok', false, 'why', 'name'); end if;
  if target is null and named is null then target := mine; end if;
  if target is not null and not exists (select 1 from public.families f where f.id = target) then
    return jsonb_build_object('ok', false, 'why', 'family');
  end if;
  if (select count(*) from bookdude.invites i where i.used_at is null and i.expires_at > now()) >= 25 then
    return jsonb_build_object('ok', false, 'why', 'many');
  end if;
  return jsonb_build_object('ok', true, 'code',
    bookdude.new_invite(target, named, coalesce(create_invite.admin, false) and target is not distinct from mine, false, auth.uid()));
end $$;

-- An admin resets a grown-up who forgot their password: the old sign-in is removed, and the code that comes back
-- lets them sign up again (same email, new password) into the same family. Nothing their family saved is touched.
create or replace function public.reset_grownup(grownup uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g public.grownups;
begin
  if not bookdude.is_admin() then raise exception 'Only an admin can reset a grown-up.' using errcode = '42501'; end if;
  if reset_grownup.grownup = auth.uid() then return jsonb_build_object('ok', false, 'why', 'self'); end if;
  select * into g from public.grownups x where x.user_id = reset_grownup.grownup;
  if not found then return jsonb_build_object('ok', false, 'why', 'who'); end if;
  delete from auth.users u where u.id = g.user_id;
  return jsonb_build_object('ok', true, 'code', bookdude.new_invite(g.family_id, null, g.is_admin, false, auth.uid()));
end $$;

------------------------------------------------------------------------------------------------------------------
-- Who may call what
------------------------------------------------------------------------------------------------------------------

revoke all on all functions in schema bookdude from public, anon, authenticated;
grant execute on function bookdude.grownup_family(), bookdude.is_admin(), bookdude.my_kids(), bookdude.my_family() to authenticated;

revoke all on function public.ping(), public.invite_ok(text), public.me(), public.kid_sign_in(text, text), public.kid_sign_out(),
  public.create_kid(text, text, text), public.set_kid_password(uuid, text), public.sign_out_kid(uuid),
  public.create_invite(uuid, text, boolean), public.reset_grownup(uuid) from public, anon, authenticated;
grant execute on function public.ping(), public.invite_ok(text) to anon, authenticated;
grant execute on function public.me(), public.kid_sign_in(text, text), public.kid_sign_out(),
  public.create_kid(text, text, text), public.set_kid_password(uuid, text), public.sign_out_kid(uuid),
  public.create_invite(uuid, text, boolean), public.reset_grownup(uuid) to authenticated;

commit;
