-- Sillon SaaS foundation — PostgreSQL / Supabase
-- This migration is NOT wired to the current Netlify application.
-- Apply only in a dedicated Supabase project after reviewing the security model.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'rse_lead', 'contributor', 'reader')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists memberships_user_idx on public.organization_memberships(user_id);

create table if not exists public.dossiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'Dossier RSE' check (length(trim(name)) between 1 and 160),
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index if not exists dossiers_org_updated_idx on public.dossiers(organization_id, updated_at desc);

-- Audit metadata only: never duplicate dossier contents, secrets or uploaded documents here.
create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dossier_id uuid,
  actor_id uuid,
  event_type text not null check (event_type in ('dossier.created', 'dossier.updated', 'dossier.deleted')),
  dossier_version bigint,
  occurred_at timestamptz not null default now()
);
create index if not exists audit_org_time_idx on public.audit_events(organization_id, occurred_at desc);

create or replace function private.has_org_role(p_org uuid, p_roles text[])
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.role = any(p_roles)
  );
$$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;

-- Users cannot create an organization and then self-assign arbitrary membership rows.
-- This RPC atomically creates the organization and its first admin membership.
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_name is null or length(trim(p_name)) < 2 or length(trim(p_name)) > 160 then
    raise exception 'invalid_organization_name' using errcode = '22023';
  end if;
  insert into public.organizations(name) values (trim(p_name)) returning id into v_org;
  insert into public.organization_memberships(organization_id, user_id, role)
    values (v_org, auth.uid(), 'admin');
  return v_org;
end;
$$;
revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

create or replace function private.audit_dossier_change()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_id uuid;
  v_version bigint;
  v_event text;
begin
  if tg_op = 'DELETE' then
    v_org := old.organization_id; v_id := old.id; v_version := old.version; v_event := 'dossier.deleted';
  elsif tg_op = 'INSERT' then
    v_org := new.organization_id; v_id := new.id; v_version := new.version; v_event := 'dossier.created';
  else
    v_org := new.organization_id; v_id := new.id; v_version := new.version; v_event := 'dossier.updated';
  end if;
  insert into public.audit_events(organization_id, dossier_id, actor_id, event_type, dossier_version)
  values (v_org, v_id, auth.uid(), v_event, v_version);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists dossiers_audit on public.dossiers;
create trigger dossiers_audit
after insert or update or delete on public.dossiers
for each row execute function private.audit_dossier_change();

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.dossiers enable row level security;
alter table public.audit_events enable row level security;

create policy organizations_read_member on public.organizations
for select to authenticated
using (private.has_org_role(id, array['admin','rse_lead','contributor','reader']));

create policy memberships_read_member on public.organization_memberships
for select to authenticated
using (
  user_id = auth.uid()
  or private.has_org_role(organization_id, array['admin','rse_lead'])
);

create policy dossiers_read_member on public.dossiers
for select to authenticated
using (private.has_org_role(organization_id, array['admin','rse_lead','contributor','reader']));

create policy dossiers_insert_editor on public.dossiers
for insert to authenticated
with check (
  private.has_org_role(organization_id, array['admin','rse_lead','contributor'])
  and created_by = auth.uid() and updated_by = auth.uid()
);

create policy dossiers_update_editor on public.dossiers
for update to authenticated
using (private.has_org_role(organization_id, array['admin','rse_lead','contributor']))
with check (
  private.has_org_role(organization_id, array['admin','rse_lead','contributor'])
  and updated_by = auth.uid()
);

create policy dossiers_delete_admin_lead on public.dossiers
for delete to authenticated
using (private.has_org_role(organization_id, array['admin','rse_lead']));

create policy audit_read_admin_lead on public.audit_events
for select to authenticated
using (private.has_org_role(organization_id, array['admin','rse_lead']));

-- No client-side direct writes to organization membership or audit tables.
revoke all on public.organizations, public.organization_memberships, public.dossiers, public.audit_events from anon;
revoke insert, update, delete on public.organizations, public.organization_memberships, public.audit_events from authenticated;
grant select on public.organizations, public.organization_memberships, public.audit_events to authenticated;
grant select, insert, update, delete on public.dossiers to authenticated;
grant usage, select on sequence public.audit_events_id_seq to authenticated;
