-- Droit à l'effacement (RGPD, art. 17) et suppression d'organisation.
-- Avant cette migration, supprimer un compte depuis Supabase (Authentication → Users → Delete user)
-- échouait dès que la personne avait créé ou modifié un dossier, ou envoyé/accepté une invitation :
-- les colonnes d'auteur référençaient auth.users sans règle de suppression.
-- Désormais, la suppression d'un compte efface ces références (NULL) au lieu de bloquer.
-- Corrige aussi la suppression d'une organisation qui contient des dossiers : elle échouait, car
-- l'audit tentait d'écrire un événement « dossier.deleted » pour une organisation déjà supprimée.
-- Les dossiers restent à l'organisation ; le journal d'audit ne garde qu'un identifiant technique,
-- sans e-mail ni nom, qui ne permet plus de retrouver la personne une fois son compte supprimé.

alter table public.dossiers alter column created_by drop not null;
alter table public.dossiers alter column updated_by drop not null;
alter table public.organization_invitations alter column invited_by drop not null;

alter table public.dossiers drop constraint if exists dossiers_created_by_fkey;
alter table public.dossiers drop constraint if exists dossiers_updated_by_fkey;
alter table public.dossiers
  add constraint dossiers_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null,
  add constraint dossiers_updated_by_fkey foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.organization_invitations drop constraint if exists organization_invitations_invited_by_fkey;
alter table public.organization_invitations drop constraint if exists organization_invitations_accepted_by_fkey;
alter table public.organization_invitations
  add constraint organization_invitations_invited_by_fkey foreign key (invited_by) references auth.users(id) on delete set null,
  add constraint organization_invitations_accepted_by_fkey foreign key (accepted_by) references auth.users(id) on delete set null;

-- « accepté » ne doit plus exiger un auteur : il peut avoir été effacé depuis.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.organization_invitations'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%accepted_at IS NULL) = (accepted_by IS NULL)%'
  loop
    execute format('alter table public.organization_invitations drop constraint %I', c);
  end loop;
end $$;
alter table public.organization_invitations drop constraint if exists organization_invitations_accepted_consistency;
alter table public.organization_invitations
  add constraint organization_invitations_accepted_consistency check (accepted_at is not null or accepted_by is null);

-- Garde des dossiers : seule la cascade déclenchée par la suppression d'un compte peut
-- remettre created_by / updated_by à NULL. Un utilisateur ne peut toujours rien réécrire.
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

  -- Effacement d'un compte : mise à NULL par la clé étrangère (déclencheur imbriqué),
  -- sans autre changement. On conserve version et date pour ne pas fausser l'historique.
  if pg_trigger_depth() > 1
     and (new.created_by is null or new.updated_by is null)
     and (new.created_by is not distinct from old.created_by or new.created_by is null)
     and (new.updated_by is not distinct from old.updated_by or new.updated_by is null)
     and new.organization_id is not distinct from old.organization_id
     and new.name is not distinct from old.name
     and new.payload is not distinct from old.payload
     and new.version is not distinct from old.version
     and new.created_at is not distinct from old.created_at
     and new.updated_at is not distinct from old.updated_at then
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
revoke all on function private.guard_dossier_mutation() from public, anon, authenticated;

-- Audit : l'effacement d'un compte n'est pas une modification du dossier.
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
  -- Suppression de l'organisation : les dossiers partent en cascade et l'événement serait
  -- orphelin (la clé étrangère vers organizations le refuserait). pg_trigger_depth() ne
  -- suffit pas : les déclencheurs AFTER d'une cascade s'exécutent au niveau 1.
  if tg_op = 'DELETE' and (pg_trigger_depth() > 1
      or not exists (select 1 from public.organizations o where o.id = old.organization_id)) then
    return old;
  end if;
  -- La garde incrémente toujours la version lors d'une vraie modification : une mise à jour
  -- sans changement de version ne peut venir que de l'effacement d'un compte.
  if tg_op = 'UPDATE' and new.version = old.version then
    return new;
  end if;

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
revoke all on function private.audit_dossier_change() from public, anon, authenticated;
