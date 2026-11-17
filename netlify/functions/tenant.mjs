// Sillon — passerelle multi-tenant Supabase.
// Aucun secret de service_role n'est utilisé : toutes les requêtes PostgREST portent le JWT
// de l'utilisateur et sont donc soumises aux politiques RLS PostgreSQL.
import { json, sameOrigin } from "../lib/shared.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY = 350_000;

function supabaseConfig() {
  const raw = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!raw || !anon) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) return null;
    return { base: url.origin, anon };
  } catch { return null; }
}

async function readBody(req) {
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY) return { error: 413 };
  try { return { value: raw ? JSON.parse(raw) : {} }; }
  catch { return { error: 400 }; }
}

async function authenticate(req, cfg) {
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer ([A-Za-z0-9._~-]{20,8192})$/.exec(header);
  if (!match) return { error: 401 };
  let response;
  try {
    response = await fetch(cfg.base + "/auth/v1/user", {
      headers: { apikey: cfg.anon, authorization: "Bearer " + match[1], accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch { return { error: 502 }; }
  if (!response.ok) return { error: response.status === 401 || response.status === 403 ? 401 : 502 };
  let user;
  try { user = await response.json(); } catch { return { error: 502 }; }
  if (!user || typeof user.id !== "string" || !UUID.test(user.id)) return { error: 401 };
  return { user, token: match[1] };
}

async function rest(cfg, token, path, init = {}) {
  try {
    const response = await fetch(cfg.base + "/rest/v1/" + path, {
      ...init,
      signal: AbortSignal.timeout(12000),
      headers: {
        apikey: cfg.anon,
        authorization: "Bearer " + token,
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    const raw = await response.text();
    let data = null;
    if (raw) { try { data = JSON.parse(raw); } catch { data = null; } }
    if (!response.ok) {
      const status = [400, 401, 403, 404, 409, 413, 422].includes(response.status) ? response.status : 502;
      return { error: status };
    }
    return { data, status: response.status };
  } catch { return { error: 502 }; }
}

export default async function tenant(req) {
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) return json(405, { code: "method" });
  if (req.headers.has("origin") ? !sameOrigin(req) : req.method !== "GET") return json(403, { code: "origin" });
  const cfg = supabaseConfig();
  if (!cfg) return json(503, { code: "tenant_not_configured" });
  const auth = await authenticate(req, cfg);
  if (auth.error) return json(auth.error, { code: auth.error === 401 ? "unauthorized" : "identity_unavailable" });

  const url = new URL(req.url);
  const resource = url.searchParams.get("resource") || "organizations";
  if (resource === "organizations") {
    if (req.method === "GET") {
      const r = await rest(cfg, auth.token, "organizations?select=id,name,created_at&order=created_at.asc");
      return r.error ? json(r.error, { code: "tenant_read_failed" }) : json(200, r.data);
    }
    if (req.method === "POST") {
      const parsed = await readBody(req);
      if (parsed.error) return json(parsed.error, { code: parsed.error === 413 ? "too_large" : "invalid_request" });
      const name = typeof parsed.value.name === "string" ? parsed.value.name.trim() : "";
      if (name.length < 2 || name.length > 160) return json(400, { code: "invalid_organization_name" });
      const r = await rest(cfg, auth.token, "rpc/create_organization", {
        method: "POST", body: JSON.stringify({ p_name: name }),
      });
      return r.error ? json(r.error, { code: "organization_create_failed" }) : json(201, { id: r.data });
    }
    return json(405, { code: "method" });
  }

  if (resource === "audits") {
    if (req.method !== "GET") return json(405, { code: "method" });
    const org = url.searchParams.get("organization_id") || "";
    if (!UUID.test(org)) return json(400, { code: "invalid_organization_id" });
    const path = "audit_events?select=id,event_type,actor_id,target_user_id,previous_role,new_role,dossier_id,dossier_version,occurred_at"
      + "&organization_id=eq." + org + "&order=occurred_at.desc&limit=100";
    const r = await rest(cfg, auth.token, path);
    return r.error ? json(r.error, { code: "audit_read_failed" }) : json(200, r.data);
  }

  if (resource === "memberships") {
    if (req.method === "GET") {
      const org = url.searchParams.get("organization_id") || "";
      if (!UUID.test(org)) return json(400, { code: "invalid_organization_id" });
      const r = await rest(cfg, auth.token,
        "organization_memberships?select=user_id,role,created_at&organization_id=eq." + org + "&order=created_at.asc");
      return r.error ? json(r.error, { code: "membership_read_failed" }) : json(200, r.data);
    }
    if (req.method === "PATCH") {
      const parsed = await readBody(req);
      if (parsed.error) return json(parsed.error, { code: parsed.error === 413 ? "too_large" : "invalid_request" });
      const { organization_id: org, user_id: member, role } = parsed.value;
      if (!UUID.test(String(org || ""))) return json(400, { code: "invalid_organization_id" });
      if (!UUID.test(String(member || ""))) return json(400, { code: "invalid_member_id" });
      if (!["admin", "rse_lead", "contributor", "reader"].includes(role)) return json(400, { code: "invalid_member_role" });
      const r = await rest(cfg, auth.token, "rpc/set_organization_member_role", {
        method: "POST", body: JSON.stringify({ p_org: org, p_user: member, p_role: role }),
      });
      if (r.error) {
        const code = r.error === 403 ? "organization_admin_required"
          : r.error === 400 ? "last_admin_protected"
          : r.error === 404 ? "member_not_found" : "membership_role_update_failed";
        return json(r.error, { code });
      }
      return json(200, { updated: true });
    }
    return json(405, { code: "method" });
  }

  if (resource === "dossiers") {
    if (req.method === "GET") {
      const org = url.searchParams.get("organization_id") || "";
      if (!UUID.test(org)) return json(400, { code: "invalid_organization_id" });
      const path = "dossiers?select=id,organization_id,name,payload,version,created_by,updated_by,created_at,updated_at&organization_id=eq." + org + "&order=updated_at.desc";
      const r = await rest(cfg, auth.token, path);
      return r.error ? json(r.error, { code: "dossier_read_failed" }) : json(200, r.data);
    }
    if (req.method === "POST") {
      const parsed = await readBody(req);
      if (parsed.error) return json(parsed.error, { code: parsed.error === 413 ? "too_large" : "invalid_request" });
      const b = parsed.value;
      if (!UUID.test(String(b.organization_id || ""))) return json(400, { code: "invalid_organization_id" });
      const name = typeof b.name === "string" ? b.name.trim() : "Dossier RSE";
      if (name.length < 1 || name.length > 160 || !b.payload || typeof b.payload !== "object" || Array.isArray(b.payload)) return json(400, { code: "invalid_dossier" });
      const r = await rest(cfg, auth.token, "dossiers?select=id,organization_id,name,version,created_at,updated_at", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({ organization_id: b.organization_id, name, payload: b.payload, created_by: auth.user.id, updated_by: auth.user.id }),
      });
      return r.error ? json(r.error, { code: "dossier_create_failed" }) : json(201, Array.isArray(r.data) ? r.data[0] : r.data);
    }
    if (req.method === "PATCH" || req.method === "DELETE") {
      const id = url.searchParams.get("id") || "";
      if (!UUID.test(id)) return json(400, { code: "invalid_dossier_id" });
      const init = { method: req.method, headers: { prefer: "return=representation" } };
      if (req.method === "PATCH") {
        const parsed = await readBody(req);
        if (parsed.error) return json(parsed.error, { code: parsed.error === 413 ? "too_large" : "invalid_request" });
        const patch = {};
        if (typeof parsed.value.name === "string") {
          patch.name = parsed.value.name.trim();
          if (patch.name.length < 1 || patch.name.length > 160) return json(400, { code: "invalid_dossier_name" });
        }
        if (parsed.value.payload && typeof parsed.value.payload === "object" && !Array.isArray(parsed.value.payload)) patch.payload = parsed.value.payload;
        if (!Object.keys(patch).length) return json(400, { code: "empty_patch" });
        init.body = JSON.stringify(patch);
      }
      const r = await rest(cfg, auth.token, "dossiers?id=eq." + id + "&select=id,organization_id,name,version,updated_at", init);
      if (r.error) return json(r.error, { code: "dossier_change_failed" });
      // PostgREST renvoie une liste vide lorsqu'aucune ligne n'est visible (RLS incluse).
      // Ne pas présenter cette absence de résultat comme une modification réussie.
      if (!Array.isArray(r.data) || r.data.length === 0) return json(404, { code: "dossier_not_found" });
      return json(200, req.method === "DELETE" ? { deleted: true } : r.data[0]);
    }
    return json(405, { code: "method" });
  }
  return json(404, { code: "unknown_resource" });
}

export const config = { path: "/api/tenant" };
