-- Droit à l'effacement : supprimer un compte (auth.users) ou une organisation depuis le
-- tableau de bord Supabase doit réussir, sans laisser de données personnelles rattachées
-- et sans créer de faux événements d'audit.
do $$
declare
  a uuid := '30000000-0000-4000-8000-000000000001';
  b uuid := '30000000-0000-4000-8000-000000000002';
  org uuid; dos uuid; inv record; n bigint; v bigint; r record;
begin
  insert into auth.users(id, email, email_confirmed_at) values
    (a, 'erase-a@example.test', now()), (b, 'erase-b@example.test', now());

  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;
  org := public.create_organization('Effacement');
  insert into public.dossiers(organization_id, name) values (org, 'Dossier') returning id into dos;
  select * into inv from public.create_organization_invitation(org, 'erase-b@example.test', 'contributor');

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform public.accept_organization_invitation(inv.token);
  update public.dossiers set name = 'Modifié par B' where id = dos;
  reset role;

  select version into v from public.dossiers where id = dos;
  select count(*) into n from public.audit_events where organization_id = org;

  -- 1. Effacer le compte de B (contributeur qui a modifié un dossier et accepté une invitation).
  perform set_config('request.jwt.claim.sub', '', true);
  delete from auth.users where id = b;
  select * into r from public.dossiers where id = dos;
  if r.updated_by is not null then raise exception 'updated_by doit être effacé'; end if;
  if r.version <> v then raise exception 'la version ne doit pas changer lors d''un effacement'; end if;
  if exists (select 1 from public.organization_memberships where user_id = b) then raise exception 'adhésion de B conservée'; end if;
  if exists (select 1 from public.organization_invitations where accepted_by = b) then raise exception 'accepted_by conservé'; end if;
  if not exists (select 1 from public.organization_invitations where id = inv.invitation_id and accepted_at is not null) then
    raise exception 'l''invitation doit rester marquée comme acceptée';
  end if;
  if exists (select 1 from public.audit_events where organization_id = org and event_type = 'dossier.updated' and actor_id is null) then
    raise exception 'un effacement ne doit pas créer d''événement dossier.updated';
  end if;

  -- 2. Effacer le compte de A (créateur du dossier et auteur de l'invitation).
  delete from auth.users where id = a;
  select * into r from public.dossiers where id = dos;
  if r.created_by is not null then raise exception 'created_by doit être effacé'; end if;
  if exists (select 1 from public.organization_invitations where invited_by = a) then raise exception 'invited_by conservé'; end if;

  -- 3. Un utilisateur ne peut toujours pas réécrire l'auteur d'un dossier, même effacé.
  insert into auth.users(id, email, email_confirmed_at) values (a, 'erase-a@example.test', now());
  insert into public.organization_memberships(organization_id, user_id, role) values (org, a, 'admin');
  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;
  begin
    update public.dossiers set created_by = a where id = dos;
    raise exception 'réécriture de created_by acceptée';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- 4. Supprimer l'organisation supprime tout ce qui lui est rattaché.
  delete from public.organizations where id = org;
  if exists (select 1 from public.dossiers where organization_id = org)
     or exists (select 1 from public.audit_events where organization_id = org)
     or exists (select 1 from public.organization_invitations where organization_id = org)
     or exists (select 1 from public.organization_memberships where organization_id = org) then
    raise exception 'données résiduelles après suppression de l''organisation';
  end if;
  delete from auth.users where id = a;
end $$;
select 'erasure checks passed';
