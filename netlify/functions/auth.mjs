// Sillon — session Supabase côté serveur.
// Le refresh token reste dans un cookie HttpOnly ; seul l'access token court est renvoyé au navigateur.
import { json, sameOrigin, store, bump, bumpStrict, today, ipKey, readJsonLimited } from "../lib/shared.mjs";

const COOKIE = "sillon_refresh";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

async function body(req) { return readJsonLimited(req, MAX_BODY); }

async function authRequest(cfg, path, payload, accessToken = "", method = "POST") {
  try {
    const headers = { apikey: cfg.anon, "content-type": "application/json", accept: "application/json" };
    if (accessToken) headers.authorization = "Bearer " + accessToken;
    const res = await fetch(cfg.base + path, {
      method, headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
    });
    const raw = await res.text();
    let data = null;
    if (raw) { try { data = JSON.parse(raw); } catch { data = null; } }
    return { ok: res.ok, status: res.status, data };
  } catch { return { ok: false, status: 502, data: null }; }
}

function validSession(data) {
  return !!data && typeof data.access_token === "string" && data.access_token.length > 20
    // Les refresh tokens Supabase actuels sont courts (ex. 12 caractères) : ne pas exiger plus de 20.
    && typeof data.refresh_token === "string" && data.refresh_token.length >= 8 && data.refresh_token.length <= 8192
    && data.user && typeof data.user.id === "string" && UUID.test(data.user.id);
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
    const emailParts = email.split("@");
    if (email.length > 254 || emailParts.length !== 2 || !emailParts[0] || !emailParts[1] || emailParts[1].lastIndexOf(".") < 1 || emailParts[1].length - emailParts[1].lastIndexOf(".") < 3 || [...email].some((ch) => ch.charCodeAt(0) <= 32)) {
      return json(400, { code: "invalid_credentials_format" });
    }
    // En production, ne pas retomber silencieusement sur un compteur mémoire
    // (éphémère et différent sur chaque instance Netlify).
    const isNetlify = process.env.NETLIFY === "true";
    if (isNetlify && (!process.env.IP_SALT || process.env.IP_SALT.length < 32)) {
      return response(req, 503, { code: "rate_limit_not_configured" }, "", true);
    }
    const limits = await store();
    if (isNetlify && !limits) {
      return response(req, 503, { code: "rate_limit_unavailable" }, "", true);
    }
    const configuredLimit = Number(process.env.AUTH_LOGIN_LIMIT_PER_IP);
    const limit = Number.isSafeInteger(configuredLimit) && configuredLimit >= 1 && configuredLimit <= 1000 ? configuredLimit : 20;
    let withinLimit;
    try {
      const key = "auth-login/" + today() + "/" + await ipKey(req, context);
      withinLimit = isNetlify ? await bumpStrict(limits, key, limit) : await bump(limits, key, limit);
    } catch {
      return response(req, 503, { code: "rate_limit_unavailable" }, "", true);
    }
    if (!withinLimit) return response(req, 429, { code: "auth_rate_limited" }, "", true);
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

  if (action === "recover") {
    const parsed = await body(req);
    if (parsed.error) return json(parsed.error, { code: parsed.error === 413 ? "too_large" : "invalid_request" });
    const email = typeof parsed.value.email === "string" ? parsed.value.email.trim().toLowerCase() : "";
    const emailParts = email.split("@");
    if (email.length > 254 || emailParts.length !== 2 || !emailParts[0] || !emailParts[1] || emailParts[1].lastIndexOf(".") < 1 || emailParts[1].length - emailParts[1].lastIndexOf(".") < 3 || [...email].some((ch) => ch.charCodeAt(0) <= 32)) {
      return json(400, { code: "invalid_email" });
    }
    const isNetlify = process.env.NETLIFY === "true";
    if (isNetlify && (!process.env.IP_SALT || process.env.IP_SALT.length < 32)) {
      return json(503, { code: "rate_limit_not_configured" });
    }
    const limits = await store();
    if (isNetlify && !limits) return json(503, { code: "rate_limit_unavailable" });
    const configuredLimit = Number(process.env.AUTH_RECOVERY_LIMIT_PER_IP);
    const limit = Number.isSafeInteger(configuredLimit) && configuredLimit >= 1 && configuredLimit <= 100 ? configuredLimit : 5;
    try {
      const key = "auth-recover/" + today() + "/" + await ipKey(req, context);
      const withinLimit = isNetlify ? await bumpStrict(limits, key, limit) : await bump(limits, key, limit);
      if (!withinLimit) return json(429, { code: "auth_rate_limited" });
    } catch {
      return json(503, { code: "rate_limit_unavailable" });
    }
    // Redirection fixe vers l'origine de la requête : aucun redirect_to fourni par le client.
    const redirectTo = new URL("/?auth=recovery", new URL(req.url).origin).toString();
    const result = await authRequest(cfg, "/auth/v1/recover?redirect_to=" + encodeURIComponent(redirectTo), { email });
    if (result.status === 429) return json(429, { code: "auth_rate_limited" });
    if (result.status === 502 || result.status >= 500) return json(502, { code: "identity_unavailable" });
    // Réponse volontairement identique que l'adresse existe ou non.
    return json(200, { ok: true });
  }

  if (action === "update-password") {
    const parsed = await body(req);
    if (parsed.error) return json(parsed.error, { code: parsed.error === 413 ? "too_large" : "invalid_request" });
    const accessToken = typeof parsed.value.access_token === "string" ? parsed.value.access_token : "";
    const password = typeof parsed.value.password === "string" ? parsed.value.password : "";
    if (accessToken.length < 20 || accessToken.length > 8192 || password.length < 12 || password.length > 1024) {
      return json(400, { code: "invalid_password_update" });
    }
    const result = await authRequest(cfg, "/auth/v1/user", { password }, accessToken, "PUT");
    if (!result.ok) {
      const status = result.status === 429 ? 429 : result.status === 502 || result.status >= 500 ? 502 : 400;
      // Supabase refuse avec 422 un mot de passe identique à l'ancien ou trop faible : le lien,
      // lui, reste valide. Ne pas afficher « lien expiré », qui pousse à redemander un e-mail.
      const errorCode = result.data && typeof result.data.error_code === "string" ? result.data.error_code : "";
      if (status === 400 && errorCode === "same_password") return json(400, { code: "password_same_as_old" });
      if (status === 400 && errorCode === "weak_password") return json(400, { code: "password_too_weak" });
      return json(status, { code: status === 429 ? "auth_rate_limited" : status === 502 ? "identity_unavailable" : "recovery_link_invalid" });
    }
    return json(200, { ok: true });
  }

  if (action === "refresh") {
    const refreshToken = cookieValue(req);
    if (!refreshToken || refreshToken.length > 8192) return response(req, 401, { code: "session_expired" }, "", true);
    const result = await authRequest(cfg, "/auth/v1/token?grant_type=refresh_token", { refresh_token: refreshToken });
    if (!result.ok || !validSession(result.data)) {
      // Une indisponibilité ou un quota temporaire ne doit pas détruire le refresh token.
      if (result.status === 502 || result.status === 429 || result.status >= 500 || (result.ok && !validSession(result.data))) {
        const status = result.status === 429 ? 429 : 502;
        return response(req, status, { code: status === 429 ? "auth_rate_limited" : "identity_unavailable" }, refreshToken);
      }
      return response(req, 401, { code: "session_expired" }, "", true);
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
      // Une panne réseau ne doit pas être présentée comme une révocation réussie.
      if (refreshed.status === 502 || refreshed.status === 429 || refreshed.status >= 500) {
        return response(req, refreshed.status === 429 ? 429 : 502,
          { code: refreshed.status === 429 ? "auth_rate_limited" : "identity_unavailable" }, refreshToken);
      }
      // Un 2xx avec une réponse de session malformée n'établit ni l'identité
      // ni la révocation : conserver le cookie et signaler une indisponibilité.
      if (refreshed.ok && !validSession(refreshed.data)) {
        return response(req, 502, { code: "identity_unavailable" }, refreshToken);
      }
      if (refreshed.ok && validSession(refreshed.data)) {
        const revoked = await authRequest(cfg, "/auth/v1/logout?scope=local", {}, refreshed.data.access_token);
        if (!revoked.ok && ![401, 403].includes(revoked.status)) {
          return response(req, 502, { code: "identity_unavailable" }, refreshToken);
        }
      }
    }
    return response(req, 200, { ok: true }, "", true);
  }

  return json(404, { code: "unknown_action" });
}

export const config = { path: "/api/auth" };
