-- 0003 — Retirer à anon et authenticated les privilèges que la RLS ne filtre pas.
--
-- Sur Supabase, les privilèges par défaut du schéma public accordent TRUNCATE, REFERENCES,
-- TRIGGER (et MAINTAIN en PostgreSQL 17) à anon et authenticated. TRUNCATE n'est pas soumis
-- à la RLS : constaté le 17/11/2026 sur sillon-staging (test annulé), un compte connecté
-- pouvait vider la table dossiers de toutes les organisations en SQL. PostgREST n'expose pas
-- TRUNCATE, mais toute future fonction SQL dynamique ou tout outil exécutant du SQL avec ce
-- rôle en aurait hérité. Idempotente.

revoke truncate, references, trigger on table
  public.organizations, public.organization_memberships, public.dossiers,
  public.audit_events, public.organization_invitations
from anon, authenticated;

do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'revoke maintain on table public.organizations, public.organization_memberships, '
      || 'public.dossiers, public.audit_events, public.organization_invitations from anon, authenticated';
  end if;
end $$;

-- Tables créées plus tard dans public par ce rôle : ne plus accorder ces privilèges par défaut.
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;
