-- Minimal Supabase Auth surface for an isolated PostgreSQL CI database.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
-- Include the Auth identity fields used by invitation acceptance.
create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  email_confirmed_at timestamptz
);
alter table auth.users add column if not exists email text unique;
alter table auth.users add column if not exists email_confirmed_at timestamptz;
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
