-- Stands in for what every Supabase project already has, so supabase/001_foundation.sql can be tested on a plain
-- Postgres: the roles the website's requests arrive as, the auth schema with its users table, auth.uid(), and the
-- extensions schema. Only the parts Book Dude touches. Used by tests/db.test.cjs, never by the real project.

do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
end $$;

create schema auth;
create schema extensions;
grant usage on schema auth to anon, authenticated, supabase_auth_admin;
grant usage on schema extensions to anon, authenticated;

-- Supabase's sign-up service (GoTrue) keeps accounts here and writes to it as supabase_auth_admin.
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text unique,
  encrypted_password text,
  is_anonymous boolean not null default false,
  raw_user_meta_data jsonb,
  created_at timestamptz default now()
);
grant all on auth.users to supabase_auth_admin;

-- The signed-in user's id, from the token the API passes along with each request.
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid;
$$;
grant execute on function auth.uid() to anon, authenticated;

-- "Automatically expose new tables" is switched off in the real project, so nothing in public is granted by default.
revoke all on schema public from public;
