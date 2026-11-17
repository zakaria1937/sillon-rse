// Sillon — session Supabase côté serveur.
// Le refresh token reste dans un cookie HttpOnly ; seul l'access token court est renvoyé au navigateur.
import { json, sameOrigin, store, bump, today, ipKey } from "../lib/shared.mjs";

const COOKIE = "sillon_refresh";
const MAX_BODY = 8_000;
const COOKIE_AGE = 60 * 60 * 24 * 30;

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

function cookieValue(req) {
  const header = req.headers.get("cookie") || "";
  const item = header.split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE + "="));
  if (!item) return "";
  try { return decodeURIComponent(item.slice(COOKIE.length + 1)); } catch { return ""; }
}

function cookieHeader(req, token) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  if (!token) return COOKIE + "=; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=0" + secure;
  return COOKIE + "=" + encodeURIComponent(token) + "; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=" + COOKIE_AGE + secure;
}

function response(req, status, body, refreshToken, clear = false) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  headers.append("set-cookie", cookieHeader(req, clear ? "" : refreshToken));
  return new Response(JSON.stringify(body), { status, headers });
}

async function body(req) {
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY) return { error: 413 };
  try { return { value: raw ? JSON.parse(raw) : {} }; }
  catch { return { error: 400 }; }
}

async function authRequest(cfg, path, payload, accessToken = "") {
  try {
    const headers = { apikey: cfg.anon, "content-type": "application/json", accept: "application/json" };
    if (accessToken) headers.authorization = "Bearer " + accessToken;
    const res = await fetch(cfg.base + path, {
      method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
    });
    const raw = await res.text();
    let data = null;
    if (raw) { try { data = JSON.parse(raw); } catch { data = null; } }
    return { ok: res.ok, status: res.status, data };
  } catch { return { ok: false, status: 502, data: null }; }
}

function validSession(data) {
  return !!data && typeof data.access_token === "string" && data.access_token.length > 20
    && typeof data.refresh_token === "string" && data.refresh_token.length > 20
    && data.user && typeof data.user.id === "string";
}

export default async function auth(req, context) {
  if (req.method !== "POST") return json(405, { code: "method" });
  if (!sameOrigin(req)) return json(403, { code: "origin" });
  const cfg = supabaseConfig();
  if (!cfg) return json(503, { code: "auth_not_configured" });

  const action = new URL(req.url).searchParams.get("action");
  if (action === "login") {
    const parsed = await body(req);
    if (parsed.error) return json(parsed.error, { code: parsed.error === 413 ? "too_large" : "invalid_request" });
    const email = typeof parsed.value.email === "string" ? parsed.value.email.trim().toLowerCase() : "";
    const password = typeof parsed.value.password === "string" ? parsed.value.password : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || password.length < 8 || password.length > 1024) {
      return json(400, { code: "invalid_credentials_format" });
    }
    const limits = await store();
    const limit = Number(process.env.AUTH_LOGIN_LIMIT_PER_IP || 20);
    if (!(await bump(limits, "auth-login/" + today() + "/" + await ipKey(req, context), limit))) {
      return response(req, 429, { code: "auth_rate_limited" }, "", true);
    }
    const result = await authRequest(cfg, "/auth/v1/token?grant_type=password", { email, password });
    if (!result.ok || !validSession(result.data)) {
      const status = result.status === 429 ? 429 : result.status === 502 ? 502 : 401;
      return response(req, status, { code: status === 429 ? "auth_rate_limited" : status === 502 ? "identity_unavailable" : "login_failed" }, "", true);
    }
    return response(req, 200, {
      access_token: result.data.access_token,
      expires_in: Number(result.data.expires_in) || 3600,
      user: { id: result.data.user.id, email: result.data.user.email || email },
    }, result.data.refresh_token);
  }

  if (action === "refresh") {
    const refreshToken = cookieValue(req);
    if (!refreshToken || refreshToken.length > 8192) return response(req, 401, { code: "session_expired" }, "", true);
    const result = await authRequest(cfg, "/auth/v1/token?grant_type=refresh_token", { refresh_token: refreshToken });
    if (!result.ok || !validSession(result.data)) {
      const status = result.status === 502 ? 502 : 401;
      return response(req, status, { code: status === 502 ? "identity_unavailable" : "session_expired" }, "", true);
    }
    return response(req, 200, {
      access_token: result.data.access_token,
      expires_in: Number(result.data.expires_in) || 3600,
      user: { id: result.data.user.id, email: result.data.user.email || "" },
    }, result.data.refresh_token);
  }

  if (action === "logout") {
    const refreshToken = cookieValue(req);
    if (refreshToken && refreshToken.length <= 8192) {
      const refreshed = await authRequest(cfg, "/auth/v1/token?grant_type=refresh_token", { refresh_token: refreshToken });
      if (refreshed.ok && validSession(refreshed.data)) {
        await authRequest(cfg, "/auth/v1/logout?scope=local", {}, refreshed.data.access_token);
      }
    }
    return response(req, 200, { ok: true }, "", true);
  }

  return json(404, { code: "unknown_action" });
}

export const config = { path: "/api/auth" };
