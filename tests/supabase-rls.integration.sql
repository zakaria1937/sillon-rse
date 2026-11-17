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
insert into public.dossiers(organization_id, name, payload, created_by, updated_by)
values (:'org_alpha', 'Dossier Alpha', '{}'::jsonb,
        '20000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000002')
returning id as dossier_alpha \gset
-- The BEFORE trigger must replace forged author metadata and initialize version.
select 1 / (exists (select 1 from public.dossiers where id = :'dossier_alpha'::uuid
  and created_by = auth.uid() and updated_by = auth.uid() and version = 1)::int);
update public.dossiers set name = 'Dossier Alpha V2', version = 999,
  updated_by = '20000000-0000-4000-8000-000000000002'
where id = :'dossier_alpha';
reset role;

select 1 / (exists (select 1 from public.dossiers where id = :'dossier_alpha'::uuid and version = 2)::int);
select 1 / (exists (select 1 from public.audit_events where dossier_id = :'dossier_alpha'::uuid
  and event_type = 'dossier.created') and exists (
  select 1 from public.audit_events where dossier_id = :'dossier_alpha'::uuid
  and event_type = 'dossier.updated'))::int;

-- Create a second, unrelated tenant. User B must not see Alpha's dossier.
set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
select public.create_organization('Organisation Beta') as org_beta \gset
select count(*) as visible_alpha from public.dossiers where id = :'dossier_alpha' \gset
\if :visible_alpha != 0
  \echo 'Cross-tenant read isolation failed'
  \quit 1
\endif
reset role;

-- A reader can read but cannot update; a contributor cannot delete.
insert into public.organization_memberships(organization_id, user_id, role)
values (:'org_alpha', '20000000-0000-4000-8000-000000000002', 'reader');
set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
update public.dossiers set name = 'Reader tampering' where id = :'dossier_alpha';
reset role;
select 1 / (not exists (select 1 from public.dossiers where id = :'dossier_alpha'::uuid and name = 'Reader tampering')::int);

insert into public.organization_memberships(organization_id, user_id, role)
values (:'org_alpha', '30000000-0000-4000-8000-000000000003', 'contributor');
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
delete from public.dossiers where id = :'dossier_alpha';
reset role;
select 1 / (exists (select 1 from public.dossiers where id = :'dossier_alpha'::uuid)::int);
select 'tenant RLS integration checks passed' as result;
