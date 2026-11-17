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
