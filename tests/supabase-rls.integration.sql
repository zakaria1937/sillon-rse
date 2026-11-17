-- Run after 0001_multi_tenant_foundation.sql as the database superuser.
\set ON_ERROR_STOP on
insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002'),
 ('30000000-0000-4000-8000-000000000003'),
 ('40000000-0000-4000-8000-000000000004')
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
  if exists (select 1 from public.organizations
    where id = current_setting('test.org_alpha')::uuid) then
    raise exception 'cross_tenant_organization_read_isolation_failed';
  end if;
  if exists (select 1 from public.organization_memberships
    where organization_id = current_setting('test.org_alpha')::uuid) then
    raise exception 'cross_tenant_membership_read_isolation_failed';
  end if;
end;
$assert$;
reset role;

-- A reader cannot update a dossier.
insert into public.organization_memberships(organization_id, user_id, role)
values (:'org_alpha', '20000000-0000-4000-8000-000000000002', 'reader');
set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
do $assert$
begin
  if (select count(*) from public.organization_memberships
      where organization_id = current_setting('test.org_alpha')::uuid) <> 1
     or not exists (select 1 from public.organization_memberships
      where organization_id = current_setting('test.org_alpha')::uuid
        and user_id = auth.uid() and role = 'reader') then
    raise exception 'reader_membership_visibility_not_scoped_to_self';
  end if;
end;
$assert$;
reset role;

-- An organization admin can inspect all memberships in that organization.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
do $assert$
begin
  if (select count(*) from public.organization_memberships
      where organization_id = current_setting('test.org_alpha')::uuid) <> 2 then
    raise exception 'admin_cannot_read_organization_memberships';
  end if;
end;
$assert$;
reset role;

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

-- A reader can see their own membership, but cannot inspect the audit trail.
set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
do $assert$
begin
  if (select count(*) from public.organization_memberships
      where organization_id = current_setting('test.org_alpha')::uuid) <> 1 then
    raise exception 'reader_membership_visibility_incorrect';
  end if;
  if exists (select 1 from public.audit_events
      where organization_id = current_setting('test.org_alpha')::uuid) then
    raise exception 'reader_unexpectedly_read_audit_trail';
  end if;
end;
$assert$;
reset role;

-- An admin can inspect the membership list for their own organization.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
do $assert$
begin
  if (select count(*) from public.organization_memberships
      where organization_id = current_setting('test.org_alpha')::uuid) < 2 then
    raise exception 'admin_cannot_read_organization_memberships';
  end if;
end;
$assert$;
reset role;

-- Only an admin can change existing member roles; the last admin cannot be demoted.
set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
do $assert$
begin
  begin
    perform public.set_organization_member_role(
      current_setting('test.org_alpha')::uuid,
      '20000000-0000-4000-8000-000000000002',
      'contributor'
    );
    raise exception 'reader_changed_member_role';
  exception when insufficient_privilege then null;
  end;
end;
$assert$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.set_organization_member_role(
  current_setting('test.org_alpha')::uuid,
  '20000000-0000-4000-8000-000000000002',
  'contributor'
);
select public.set_organization_member_role(
  current_setting('test.org_alpha')::uuid,
  '20000000-0000-4000-8000-000000000002',
  'reader'
);
do $assert$
begin
  if (select count(*) from public.audit_events
      where organization_id = current_setting('test.org_alpha')::uuid
        and event_type = 'membership.role_changed'
        and target_user_id = '20000000-0000-4000-8000-000000000002'
        and actor_id = '10000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'membership_role_changes_not_audited';
  end if;
  if not exists (select 1 from public.audit_events
      where organization_id = current_setting('test.org_alpha')::uuid
        and event_type = 'membership.created'
        and target_user_id = '10000000-0000-4000-8000-000000000001'
        and new_role = 'admin') then
    raise exception 'initial_admin_membership_not_audited';
  end if;
end;
$assert$;
do $assert$
begin
  begin
    perform public.set_organization_member_role(
      current_setting('test.org_alpha')::uuid,
      '10000000-0000-4000-8000-000000000001',
      'rse_lead'
    );
    raise exception 'last_admin_was_demoted';
  exception when check_violation then null;
  end;
end;
$assert$;
reset role;

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

-- An RSE lead can inspect the audit trail and delete the dossier.
insert into public.organization_memberships(organization_id, user_id, role)
values (:'org_alpha', '40000000-0000-4000-8000-000000000004', 'rse_lead');
set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000004', false);
do $assert$
begin
  if not exists (select 1 from public.audit_events
    where dossier_id = current_setting('test.dossier_alpha')::uuid) then
    raise exception 'rse_lead_cannot_read_audit_trail';
  end if;
end;
$assert$;
delete from public.dossiers where id = :'dossier_alpha';
reset role;
do $assert$
begin
  if exists (select 1 from public.dossiers
    where id = current_setting('test.dossier_alpha')::uuid) then
    raise exception 'rse_lead_could_not_delete_dossier';
  end if;
  if not exists (select 1 from public.audit_events
    where dossier_id = current_setting('test.dossier_alpha')::uuid and event_type = 'dossier.deleted') then
    raise exception 'delete_event_missing_from_audit_trail';
  end if;
end;
$assert$;

-- Organization deletion cascades membership and audit rows without an orphan-event failure.
reset role;
insert into public.organizations(id, name)
values ('90000000-0000-4000-8000-000000000009', 'Organisation temporaire');
insert into public.organization_memberships(organization_id, user_id, role)
values ('90000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'admin');
delete from public.organizations where id = '90000000-0000-4000-8000-000000000009';
do $assert$
begin
  if exists (select 1 from public.audit_events
      where organization_id = '90000000-0000-4000-8000-000000000009') then
    raise exception 'organization_audit_cascade_failed';
  end if;
end;
$assert$;

-- Member removal is admin-only, audited before deletion, and protects the last administrator.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.remove_organization_member(
  current_setting('test.org_alpha')::uuid,
  '20000000-0000-4000-8000-000000000002'
);
do $assert$
begin
  if exists (select 1 from public.organization_memberships
      where organization_id = current_setting('test.org_alpha')::uuid
        and user_id = '20000000-0000-4000-8000-000000000002') then
    raise exception 'membership_was_not_removed';
  end if;
  if not exists (select 1 from public.audit_events
      where organization_id = current_setting('test.org_alpha')::uuid
        and event_type = 'membership.removed'
        and target_user_id = '20000000-0000-4000-8000-000000000002'
        and previous_role = 'reader' and new_role is null
        and actor_id = '10000000-0000-4000-8000-000000000001') then
    raise exception 'membership_removal_not_audited';
  end if;
  begin
    perform public.remove_organization_member(
      current_setting('test.org_alpha')::uuid,
      '10000000-0000-4000-8000-000000000001'
    );
    raise exception 'last_admin_was_removed';
  exception when check_violation then null;
  end;
end;
$assert$;
reset role;

select 'tenant RLS integration checks passed' as result;


-- Invitation à usage unique : identité email, expiration, hash du jeton et audit.
update auth.users set email = 'admin-alpha@example.test'
where id = '10000000-0000-4000-8000-000000000001';
update auth.users set email = 'member-alpha@example.test'
where id = '20000000-0000-4000-8000-000000000002';
update auth.users set email = 'other-alpha@example.test'
where id = '30000000-0000-4000-8000-000000000003';

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select invitation_id as test_invitation_id, token as test_invitation_token
from public.create_organization_invitation(
  current_setting('test.org_alpha')::uuid,
  '  MEMBER-ALPHA@example.test  ',
  'contributor'
) \gset
reset role;

do $assert$
begin
  if exists (select 1 from public.organization_invitations
      where id = :'test_invitation_id' and token_hash = :'test_invitation_token') then
    raise exception 'raw_invitation_token_was_stored';
  end if;
  if not exists (select 1 from public.organization_invitations
      where id = :'test_invitation_id'
        and email = 'member-alpha@example.test'
        and role = 'contributor'
        and length(token_hash) = 64
        and expires_at > now()) then
    raise exception 'invitation_metadata_missing_or_invalid';
  end if;
end;
$assert$;

-- Un autre compte ne peut pas consommer le jeton, même s'il est authentifié.
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
do $assert$
begin
  begin
    perform public.accept_organization_invitation(:'test_invitation_token');
    raise exception 'wrong_email_accepted_invitation';
  exception when invalid_parameter_value then null;
  end;
end;
$assert$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
select public.accept_organization_invitation(:'test_invitation_token');
do $assert$
begin
  if not exists (select 1 from public.organization_memberships
      where organization_id = current_setting('test.org_alpha')::uuid
        and user_id = auth.uid() and role = 'contributor') then
    raise exception 'invitation_did_not_create_expected_membership';
  end if;
  if not exists (select 1 from public.organization_invitations
      where id = :'test_invitation_id' and accepted_by = auth.uid()
        and accepted_at is not null) then
    raise exception 'invitation_acceptance_not_recorded';
  end if;
  begin
    perform public.accept_organization_invitation(:'test_invitation_token');
    raise exception 'invitation_token_was_reusable';
  exception when invalid_parameter_value then null;
  end;
end;
$assert$;
reset role;

select 'tenant RLS and invitation integration checks passed' as result;
