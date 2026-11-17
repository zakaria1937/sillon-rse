-- 0002 — Parité avec le projet Supabase sillon-staging et correction pgcrypto.
--
-- 1) Sur Supabase, l'extension pgcrypto est installée dans le schéma `extensions`,
--    pas dans `public`. Avec `search_path = ''`, les appels `public.gen_random_bytes`
--    et `public.digest` de 0001 échouaient (42883 : function does not exist) :
--    aucune invitation ne pouvait être créée ni acceptée sur le vrai projet.
--    Les fonctions sont redéfinies avec des appels qualifiés `extensions.*`.
-- 2) Reprend dans le dépôt les optimisations déjà appliquées sur sillon-staging
--    (migration 20261117100211) : index sur les clés étrangères et `(select auth.uid())`
--    dans les politiques RLS, évalué une seule fois par requête.
-- Idempotente : peut être rejouée sans effet de bord.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create index if not exists dossiers_created_by_idx on public.dossiers(created_by);
create index if not exists dossiers_updated_by_idx on public.dossiers(updated_by);
create index if not exists invitations_accepted_by_idx on public.organization_invitations(accepted_by);
create index if not exists invitations_invited_by_idx on public.organization_invitations(invited_by);

drop policy if exists memberships_read_member on public.organization_memberships;
create policy memberships_read_member on public.organization_memberships
for select to authenticated
using (user_id = (select auth.uid()) or private.has_org_role(organization_id, array['admin','rse_lead']));

drop policy if exists dossiers_insert_editor on public.dossiers;
create policy dossiers_insert_editor on public.dossiers
for insert to authenticated
with check (
  private.has_org_role(organization_id, array['admin','rse_lead','contributor'])
  and created_by = (select auth.uid()) and updated_by = (select auth.uid())
);

drop policy if exists dossiers_update_editor on public.dossiers;
create policy dossiers_update_editor on public.dossiers
for update to authenticated
using (private.has_org_role(organization_id, array['admin','rse_lead','contributor']))
with check (
  private.has_org_role(organization_id, array['admin','rse_lead','contributor'])
  and updated_by = (select auth.uid())
);

create or replace function public.create_organization_invitation(
  p_org uuid,
  p_email text,
  p_role text
)
returns table(invitation_id uuid, token text, expires_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text;
  v_token text;
  v_id uuid;
  v_expiry timestamptz;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  v_email := lower(trim(coalesce(p_email, '')));
  if length(v_email) < 5 or length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_invitation_email' using errcode = '22023';
  end if;
  if p_role is null or p_role not in ('admin', 'rse_lead', 'contributor', 'reader') then
    raise exception 'invalid_invitation_role' using errcode = '22023';
  end if;
  if not private.has_org_role(p_org, array['admin']) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  perform 1 from public.organizations where id = p_org for update;
  if not found then raise exception 'organization_not_found' using errcode = 'P0002'; end if;
  if not private.has_org_role(p_org, array['admin']) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  with revoked as (
    update public.organization_invitations
    set revoked_at = now()
    where organization_id = p_org and email = v_email
      and accepted_at is null and revoked_at is null
    returning organization_id
  )
  insert into public.audit_events(organization_id, actor_id, event_type)
  select organization_id, auth.uid(), 'invitation.revoked' from revoked;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expiry := now() + interval '7 days';
  insert into public.organization_invitations(
    organization_id, email, role, token_hash, invited_by, expires_at
  ) values (
    p_org, v_email, p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid(), v_expiry
  ) returning id into v_id;

  insert into public.audit_events(organization_id, actor_id, event_type)
  values (p_org, auth.uid(), 'invitation.created');

  return query select v_id, v_token, v_expiry;
end;
$$;
revoke all on function public.create_organization_invitation(uuid, text, text) from public, anon;
grant execute on function public.create_organization_invitation(uuid, text, text) to authenticated;

create or replace function public.accept_organization_invitation(p_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_invitation public.organization_invitations%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_or_expired_invitation' using errcode = '22023';
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;
  if v_email is null then
    raise exception 'authenticated_email_required' using errcode = '42501';
  end if;

  select * into v_invitation
  from public.organization_invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;
  if not found or v_invitation.accepted_at is not null
     or v_invitation.revoked_at is not null or v_invitation.expires_at <= now()
     or v_invitation.email <> v_email then
    raise exception 'invalid_or_expired_invitation' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.organization_memberships
    where organization_id = v_invitation.organization_id and user_id = auth.uid()
  ) then
    raise exception 'already_organization_member' using errcode = '23505';
  end if;

  insert into public.organization_memberships(organization_id, user_id, role)
  values (v_invitation.organization_id, auth.uid(), v_invitation.role);

  update public.organization_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = v_invitation.id;

  return v_invitation.organization_id;
end;
$$;
revoke all on function public.accept_organization_invitation(text) from public, anon;
grant execute on function public.accept_organization_invitation(text) to authenticated;
