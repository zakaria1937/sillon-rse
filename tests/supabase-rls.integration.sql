-- Run after 0001_multi_tenant_foundation.sql as the database superuser.
\set ON_ERROR_STOP on
insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002'),
 ('30000000-0000-4000-8000-000000000003')
on conflict do nothing;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.create_organization('Organisation Alpha') as org_alpha \gset
select set_config('test.org_alpha', :'org_alpha', false);

-- Authenticated clients cannot self-assign roles or forge audit rows.
do $assert$
begin
  begin
    insert into public.organization_memberships(organization_id, user_id, role)
    values (current_setting('test.org_alpha')::uuid, '20000000-0000-4000-8000-000000000002', 'admin');
    raise exception 'membership_write_should_be_denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.audit_events(organization_id, event_type)
    values (current_setting('test.org_alpha')::uuid, 'dossier.created');
    raise exception 'audit_write_should_be_denied';
  exception when insufficient_privilege then null;
  end;
end;
$assert$;

insert into public.dossiers(organization_id, name, payload, created_by, updated_by)
values (:'org_alpha', 'Dossier Alpha', '{}'::jsonb,
        '20000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000002')
returning id as dossier_alpha \gset
select set_config('test.dossier_alpha', :'dossier_alpha', false);

-- The BEFORE trigger must replace forged author metadata and initialize version.
do $assert$
begin
  if not exists (
    select 1 from public.dossiers
    where id = current_setting('test.dossier_alpha')::uuid
      and created_by = auth.uid() and updated_by = auth.uid() and version = 1
  ) then raise exception 'insert_guard_did_not_normalize_metadata'; end if;
end;
$assert$;

update public.dossiers set name = 'Dossier Alpha V2', version = 999,
  updated_by = '20000000-0000-4000-8000-000000000002'
where id = :'dossier_alpha';
reset role;

do $assert$
begin
  if not exists (select 1 from public.dossiers
    where id = current_setting('test.dossier_alpha')::uuid and version = 2) then
    raise exception 'version_was_not_incremented';
  end if;
  if not exists (select 1 from public.audit_events
    where dossier_id = current_setting('test.dossier_alpha')::uuid and event_type = 'dossier.created')
    or not exists (select 1 from public.audit_events
    where dossier_id = current_setting('test.dossier_alpha')::uuid and event_type = 'dossier.updated') then
    raise exception 'audit_trigger_did_not_record_lifecycle';
  end if;
end;
$assert$;

-- A user from a second organization cannot read the first organization's dossier.
set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
select public.create_organization('Organisation Beta');
do $assert$
begin
  if exists (select 1 from public.dossiers
    where id = current_setting('test.dossier_alpha')::uuid) then
    raise exception 'cross_tenant_read_isolation_failed';
  end if;
end;
$assert$;
reset role;

-- A reader cannot update a dossier.
insert into public.organization_memberships(organization_id, user_id, role)
values (:'org_alpha', '20000000-0000-4000-8000-000000000002', 'reader');
set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
update public.dossiers set name = 'Reader tampering' where id = :'dossier_alpha';
reset role;
do $assert$
begin
  if exists (select 1 from public.dossiers
    where id = current_setting('test.dossier_alpha')::uuid and name = 'Reader tampering') then
    raise exception 'reader_unexpectedly_updated_dossier';
  end if;
end;
$assert$;

-- A contributor can update, but cannot delete.
insert into public.organization_memberships(organization_id, user_id, role)
values (:'org_alpha', '30000000-0000-4000-8000-000000000003', 'contributor');
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
update public.dossiers set name = 'Contributor update' where id = :'dossier_alpha';
reset role;
do $assert$
begin
  if not exists (select 1 from public.dossiers
    where id = current_setting('test.dossier_alpha')::uuid
      and name = 'Contributor update' and version = 3) then
    raise exception 'contributor_update_not_allowed';
  end if;
end;
$assert$;
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
delete from public.dossiers where id = :'dossier_alpha';
reset role;
do $assert$
begin
  if not exists (select 1 from public.dossiers
    where id = current_setting('test.dossier_alpha')::uuid) then
    raise exception 'contributor_unexpectedly_deleted_dossier';
  end if;
end;
$assert$;

select 'tenant RLS integration checks passed' as result;
