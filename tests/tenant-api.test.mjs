// Tests de la passerelle Supabase : JWT utilisateur transmis à PostgREST, sans service_role.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL = "https://sillon-test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";
const userId = "10000000-0000-4000-8000-000000000001";
const orgId = "20000000-0000-4000-8000-000000000002";
const dossierId = "30000000-0000-4000-8000-000000000003";
const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature";
const calls = [];
let authStatus = 200;
let restStatus = 200;
let restData = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).endsWith("/auth/v1/user")) {
    return new Response(JSON.stringify({ id: userId }), { status: authStatus, headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify(restData), { status: restStatus, headers: { "content-type": "application/json" } });
};
const { default: tenant } = await import("../netlify/functions/tenant.mjs");
const req = (method = "GET", query = "", body = undefined, origin = "https://sillon.example", withOrigin = true) => {
  const headers = { authorization: "Bearer " + token };
  if (withOrigin && origin) headers.origin = origin;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new Request("https://sillon.example/api/tenant" + query, {
    method, headers, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
};

test("GET organizations authenticates the user and uses only the anon key plus their JWT", async () => {
  calls.length = 0;
  restData = [{ id: orgId, name: "Atelier Alpha" }];
  const r = await tenant(req("GET", "?resource=organizations", undefined, null, false));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), restData);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/auth\/v1\/user$/);
  assert.match(calls[1].url, /\/rest\/v1\/organizations/);
  assert.equal(calls[1].init.headers.apikey, "test-anon-key");
  assert.equal(calls[1].init.headers.authorization, "Bearer " + token);
  assert.equal(calls[1].init.headers.authorization.includes("service_role"), false);
});

test("refuse les appels sans JWT valide ou sans configuration Supabase", async () => {
  authStatus = 401;
  assert.equal((await tenant(req())).status, 401);
  authStatus = 200;
  const url = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  assert.equal((await tenant(req())).status, 503);
  process.env.SUPABASE_URL = url;
});

test("POST organization calls the controlled create_organization RPC", async () => {
  calls.length = 0;
  restData = orgId;
  const r = await tenant(req("POST", "?resource=organizations", { name: "  Atelier Alpha  " }));
  assert.equal(r.status, 201);
  assert.deepEqual(await r.json(), { id: orgId });
  assert.match(calls[1].url, /\/rpc\/create_organization$/);
  assert.deepEqual(JSON.parse(calls[1].init.body), { p_name: "Atelier Alpha" });
});

test("GET memberships exposes only the roles visible through organization-membership RLS", async () => {
  calls.length = 0;
  restData = [{ user_id: userId, role: "admin", created_at: "2026-11-17T10:00:00Z" }];
  const r = await tenant(req("GET", "?resource=memberships&organization_id=" + orgId, undefined, null, false));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), restData);
  assert.match(calls.at(-1).url, /organization_memberships\?select=user_id,role,created_at&organization_id=eq\./);
  assert.equal((await tenant(req("POST", "?resource=memberships&organization_id=" + orgId, {}))).status, 405);
});

test("GET dossiers requires a valid organization id and lets RLS filter rows", async () => {
  calls.length = 0;
  restData = [{ id: dossierId, organization_id: orgId, name: "Diagnostic" }];
  assert.equal((await tenant(req("GET", "?resource=dossiers&organization_id=invalid"))).status, 400);
  const r = await tenant(req("GET", "?resource=dossiers&organization_id=" + orgId, undefined, null, false));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), restData);
  assert.ok(calls.at(-1).url.includes("organization_id=eq." + orgId));
});

test("POST dossier validates input and relies on RLS for organization authorization", async () => {
  calls.length = 0;
  restData = [{ id: dossierId, organization_id: orgId, name: "Diagnostic", version: 1 }];
  assert.equal((await tenant(req("POST", "?resource=dossiers", { organization_id: "bad", payload: {} }))).status, 400);
  const r = await tenant(req("POST", "?resource=dossiers", { organization_id: orgId, name: "Diagnostic", payload: { scope: "2026" } }));
  assert.equal(r.status, 201);
  const sent = JSON.parse(calls.at(-1).init.body);
  assert.equal(sent.organization_id, orgId);
  assert.equal(sent.created_by, userId);
  assert.equal(sent.updated_by, userId);
  assert.deepEqual(sent.payload, { scope: "2026" });
  restStatus = 403;
  assert.equal((await tenant(req("POST", "?resource=dossiers", { organization_id: orgId, payload: {} }))).status, 403);
  restStatus = 200;
});

test("PATCH and DELETE target a dossier id and remain subject to database RLS", async () => {
  calls.length = 0;
  restData = [{ id: dossierId, name: "Diagnostic V2", version: 2 }];
  const patch = await tenant(req("PATCH", "?resource=dossiers&id=" + dossierId, { name: "Diagnostic V2" }));
  assert.equal(patch.status, 200);
  assert.deepEqual(JSON.parse(calls.at(-1).init.body), { name: "Diagnostic V2" });
  const del = await tenant(req("DELETE", "?resource=dossiers&id=" + dossierId));
  assert.equal(del.status, 200);
  assert.equal(calls.at(-1).init.method, "DELETE");
});

test("refuse l'origine externe, les identifiants invalides et les payloads trop volumineux", async () => {
  assert.equal((await tenant(req("POST", "?resource=organizations", { name: "Alpha" }, "https://evil.example"))).status, 403);
  assert.equal((await tenant(req("DELETE", "?resource=dossiers&id=bad"))).status, 400);
  assert.equal((await tenant(req("POST", "?resource=dossiers", JSON.stringify({ organization_id: orgId, payload: { huge: "x".repeat(360000) } })))).status, 413);
});


test("PATCH et DELETE signalent un dossier absent ou invisible plutôt qu'un succès vide", async () => {
  restData = [];
  const patch = await tenant(req("PATCH", "?resource=dossiers&id=" + dossierId, { name: "Diagnostic V2" }));
  assert.equal(patch.status, 404);
  assert.deepEqual(await patch.json(), { code: "dossier_not_found" });
  const del = await tenant(req("DELETE", "?resource=dossiers&id=" + dossierId));
  assert.equal(del.status, 404);
});


test("tenant API measures request limits in UTF-8 bytes", async () => {
  const oversized = "é".repeat(180000);
  const r = await tenant(req("POST", "?resource=dossiers", { organization_id: orgId, payload: { note: oversized } }));
  assert.equal(r.status, 413);
});
