-- Sillon SaaS foundation — PostgreSQL / Supabase
-- This migration is NOT wired to the current Netlify application.
-- Apply only in a dedicated Supabase project after reviewing the security model.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

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
  target_user_id uuid,
  previous_role text,
  new_role text,
  event_type text not null check (event_type in (
    'dossier.created', 'dossier.updated', 'dossier.deleted',
    'membership.created', 'membership.role_changed', 'membership.removed'
  )),
  dossier_version bigint,
  occurred_at timestamptz not null default now()
);
create index if not exists audit_org_time_idx on public.audit_events(organization_id, occurred_at desc);

create or replace function private.has_org_role(p_org uuid, p_roles text[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.role = any(p_roles)
  );
$$;

revoke all on function private.has_org_role(uuid, text[]) from public, anon;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;

-- Users cannot create an organization and then self-assign arbitrary membership rows.
-- This RPC atomically creates the organization and its first admin membership.
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql security definer
set search_path = ''
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

-- Prevent a client from forging ownership, timestamps or version history.
-- Version and updated_at are maintained by the database, not by browser input.
create or replace function private.guard_dossier_mutation()
returns trigger
language plpgsql
set search_path = ''
as $guard$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.version := 1;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'immutable_dossier_metadata' using errcode = '42501';
  end if;
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  new.updated_by := auth.uid();
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$guard$;

create trigger dossiers_guard_insert
before insert on public.dossiers
for each row execute function private.guard_dossier_mutation();
create trigger dossiers_guard_update
before update on public.dossiers
for each row execute function private.guard_dossier_mutation();
revoke all on function private.guard_dossier_mutation() from public, anon, authenticated;

create or replace function private.audit_dossier_change()
returns trigger
language plpgsql security definer
set search_path = ''
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
revoke all on function private.audit_dossier_change() from public, anon, authenticated;

-- Record membership lifecycle changes as metadata, including the actor and role transition.
-- This trigger runs with table-owner privileges so client roles cannot forge audit entries.
create or replace function private.audit_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
declare
  v_org uuid;
  v_user uuid;
  v_old_role text;
  v_new_role text;
  v_event text;
begin
  if tg_op = 'DELETE' then
    v_org := old.organization_id;
    v_user := old.user_id;
    v_old_role := old.role;
    v_new_role := null;
    v_event := 'membership.removed';
  elsif tg_op = 'INSERT' then
    v_org := new.organization_id;
    v_user := new.user_id;
    v_old_role := null;
    v_new_role := new.role;
    v_event := 'membership.created';
  else
    if new.role is not distinct from old.role then return new; end if;
    v_org := new.organization_id;
    v_user := new.user_id;
    v_old_role := old.role;
    v_new_role := new.role;
    v_event := 'membership.role_changed';
  end if;

  insert into public.audit_events(
    organization_id, actor_id, target_user_id, previous_role, new_role, event_type
  ) values (
    v_org, auth.uid(), v_user, v_old_role, v_new_role, v_event
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$;

create trigger memberships_audit_insert
after insert on public.organization_memberships
for each row execute function private.audit_membership_change();
create trigger memberships_audit_update
after update of role on public.organization_memberships
for each row execute function private.audit_membership_change();
create trigger memberships_audit_delete
after delete on public.organization_memberships
for each row execute function private.audit_membership_change();
revoke all on function private.audit_membership_change() from public, anon, authenticated;

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


-- Role management: only an organization admin may change an existing member's role.
-- Locking the organization row serializes admin transfers and prevents removing the last admin.
create or replace function public.set_organization_member_role(
  p_org uuid,
  p_user uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_role text;
  v_admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('admin', 'rse_lead', 'contributor', 'reader') then
    raise exception 'invalid_member_role' using errcode = '22023';
  end if;
  if not private.has_org_role(p_org, array['admin']) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  perform 1 from public.organizations where id = p_org for update;
  if not found then raise exception 'organization_not_found' using errcode = 'P0002'; end if;
  -- Recheck after the lock: a concurrent admin transfer may have changed the caller's role.
  if not private.has_org_role(p_org, array['admin']) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  select role into v_current_role
  from public.organization_memberships
  where organization_id = p_org and user_id = p_user
  for update;
  if not found then raise exception 'member_not_found' using errcode = 'P0002'; end if;

  if v_current_role = 'admin' and p_role <> 'admin' then
    select count(*) into v_admin_count
    from public.organization_memberships
    where organization_id = p_org and role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'cannot_remove_last_admin' using errcode = '23514';
    end if;
  end if;

  update public.organization_memberships
  set role = p_role
  where organization_id = p_org and user_id = p_user;
end;
$$;
revoke all on function public.set_organization_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_organization_member_role(uuid, uuid, text) to authenticated;
