import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/0001_multi_tenant_foundation.sql', import.meta.url), 'utf8');

test('multi-tenant schema defines organizations, memberships, dossiers and audit events', () => {
  for (const table of ['organizations', 'organization_memberships', 'dossiers', 'audit_events']) {
    assert.match(sql, new RegExp('create table if not exists public\\.' + table));
    assert.match(sql, new RegExp('alter table public\\.' + table + ' enable row level security'));
  }
});

test('dossier policies enforce organization membership and write roles', () => {
  assert.match(sql, /dossiers_read_member[\s\S]*?private\.has_org_role\(organization_id, array\['admin','rse_lead','contributor','reader'\]\)/);
  assert.match(sql, /dossiers_insert_editor[\s\S]*?array\['admin','rse_lead','contributor'\]/);
  assert.match(sql, /dossiers_delete_admin_lead[\s\S]*?array\['admin','rse_lead'\]/);
});

test('clients cannot self-manage memberships or directly write audit events', () => {
  assert.match(sql, /revoke insert, update, delete on public\.organizations, public\.organization_memberships, public\.audit_events from authenticated/);
  assert.match(sql, /create or replace function public\.create_organization/);
});

test('audit trigger records metadata and does not copy dossier payload', () => {
  assert.match(sql, /create trigger dossiers_audit[\s\S]*?execute function private\.audit_dossier_change/);
  assert.doesNotMatch(sql, /payload\s*,\s*actor_id/);
});

test('database controls dossier ownership, timestamps and version increments', () => {
  assert.match(sql, /create or replace function private\.guard_dossier_mutation/);
  assert.match(sql, /new\.created_by := auth\.uid\(\)/);
  assert.match(sql, /new\.version := old\.version \+ 1/);
  assert.match(sql, /new\.updated_at := now\(\)/);
  assert.match(sql, /new\.organization_id is distinct from old\.organization_id/);
  assert.match(sql, /create trigger dossiers_guard_update[\s\S]*?execute function private\.guard_dossier_mutation/);
});

test('dossier update policy checks both existing and destination organization membership', () => {
  assert.match(sql, /dossiers_update_editor[\s\S]*?using\s*\([\s\S]*?private\.has_org_role\(organization_id[\s\S]*?with check\s*\([\s\S]*?private\.has_org_role\(organization_id/);
});

test('privileged SQL functions pin an empty search_path', () => {
  const functions = sql.split(/create or replace function/i).slice(1);
  for (const fn of functions) {
    if (/security definer/i.test(fn.slice(0, 220))) {
      assert.match(fn.slice(0, 350), /set search_path = ''/);
    }
  }
});

test('membership lifecycle events are recorded without dossier contents', () => {
  assert.match(sql, /membership\.created/);
  assert.match(sql, /membership\.role_changed/);
  assert.match(sql, /membership\.removed/);
  assert.match(sql, /create or replace function public\.remove_organization_member/);
  assert.match(sql, /cannot_remove_last_admin/);
  assert.match(sql, /create or replace function private\.audit_membership_change/);
  assert.match(sql, /create trigger memberships_audit_update[\s\S]*?execute function private\.audit_membership_change/);
  assert.match(sql, /target_user_id[\s\S]*?previous_role[\s\S]*?new_role/);
});


test('organization invitations store only token hashes and expose controlled one-time RPCs', () => {
  for (const fragment of [
    'create table if not exists public.organization_invitations',
    'token_hash text not null unique',
    "encode(public.digest(v_token, 'sha256'), 'hex')",
    'create or replace function public.create_organization_invitation',
    'create or replace function public.accept_organization_invitation',
    'v_invitation.email <> v_email',
    'u.email_confirmed_at is not null',
    'v_invitation.expires_at <= now()',
    'invitation.created',
    'invitation.revoked',
  ]) assert.ok(sql.includes(fragment), 'missing invitation control: ' + fragment);
  assert.ok(sql.includes('select * into v_invitation'));
  assert.ok(sql.includes('for update;'));
  assert.ok(sql.includes('revoke all on function public.accept_organization_invitation(text) from public, anon'));
});
