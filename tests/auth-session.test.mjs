// Tests de session Supabase : refresh token HttpOnly, rotation et déconnexion.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bumpStrict } from "../netlify/lib/shared.mjs";

process.env.SUPABASE_URL = "https://sillon-test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";
process.env.AUTH_LOGIN_LIMIT_PER_IP = "20";
const userId = "10000000-0000-4000-8000-000000000001";
const calls = [];
let mode = "success";
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).includes("/auth/v1/recover")) {
    if (mode === "recover_unavailable") return new Response('{"msg":"unavailable"}', { status: 503 });
    if (mode === "recover_rate_limited") return new Response('{"msg":"limited"}', { status: 429 });
    return new Response(null, { status: 200 });
  }
  if (String(url).includes("/auth/v1/user") && init.method === "PUT") {
    if (mode === "update_invalid") return new Response('{"msg":"invalid"}', { status: 400 });
    return new Response(JSON.stringify({ id: userId, email: "user@example.fr" }), { status: 200 });
  }
  if (String(url).includes("grant_type=password")) {
    if (mode === "bad_login") return new Response('{"msg":"invalid"}', { status: 400 });
    return new Response(JSON.stringify({
      access_token: "access-token-value-long-enough",
      refresh_token: "refresh-token-value-long-enough",
      expires_in: 3600,
      user: { id: userId, email: "user@example.fr" },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (String(url).includes("grant_type=refresh_token")) {
    if (mode === "expired") return new Response('{"msg":"expired"}', { status: 400 });
    if (mode === "refresh_unavailable") return new Response('{"msg":"unavailable"}', { status: 503 });
    if (mode === "refresh_rate_limited") return new Response('{"msg":"limited"}', { status: 429 });
    return new Response(JSON.stringify({
      access_token: "rotated-access-token-long-enough",
      refresh_token: "rotated-refresh-token-long-enough",
      expires_in: 3600,
      user: { id: userId, email: "user@example.fr" },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (String(url).includes("/auth/v1/logout")) {
    if (mode === "logout_unavailable") return new Response('{"msg":"unavailable"}', { status: 503 });
    return new Response(null, { status: 204 });
  }
  return new Response("not found", { status: 404 });
};
const { default: auth } = await import("../netlify/functions/auth.mjs");
const req = (action, body = undefined, cookie = "", origin = "https://sillon.example") => {
  const headers = { origin };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new Request("https://sillon.example/api/auth?action=" + action, {
    method: "POST", headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
};

test("login returns only a short-lived access token and sets a Secure HttpOnly refresh cookie", async () => {
  calls.length = 0;
  const r = await auth(req("login", { email: " USER@example.fr ", password: "correct-password" }), { ip: "10.0.0.1" });
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.access_token, "access-token-value-long-enough");
  assert.equal(data.user.id, userId);
  assert.equal("refresh_token" in data, false);
  const cookie = r.headers.get("set-cookie");
  assert.match(cookie, /sillon_refresh=refresh-token-value-long-enough/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/auth/);
  assert.match(calls[0].url, /grant_type=password/);
  assert.equal(JSON.parse(calls[0].init.body).email, "user@example.fr");
});

test("refresh rotates the HttpOnly refresh token and returns a new access token", async () => {
  const r = await auth(req("refresh", undefined, "sillon_refresh=refresh-token-value-long-enough"), { ip: "10.0.0.2" });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).access_token, "rotated-access-token-long-enough");
  assert.match(r.headers.get("set-cookie"), /rotated-refresh-token-long-enough/);
  assert.match(calls.at(-1).url, /grant_type=refresh_token/);
});

test("logout revokes the current Supabase session and clears the cookie", async () => {
  calls.length = 0;
  const r = await auth(req("logout", undefined, "sillon_refresh=refresh-token-value-long-enough"), { ip: "10.0.0.3" });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.match(calls[0].url, /grant_type=refresh_token/);
  assert.match(calls[1].url, /auth\/v1\/logout\?scope=local/);
  assert.match(calls[1].init.headers.authorization, /^Bearer rotated-access-token/);
  assert.match(r.headers.get("set-cookie"), /Max-Age=0/);
});

test("invalid credentials, expired sessions and foreign origins are rejected", async () => {
  mode = "bad_login";
  assert.equal((await auth(req("login", { email: "user@example.fr", password: "wrong-password" }), { ip: "10.0.0.4" })).status, 401);
  mode = "expired";
  const expired = await auth(req("refresh", undefined, "sillon_refresh=refresh-token-value-long-enough"), { ip: "10.0.0.5" });
  assert.equal(expired.status, 401);
  assert.match(expired.headers.get("set-cookie"), /Max-Age=0/);
  mode = "success";
  assert.equal((await auth(req("login", { email: "user@example.fr", password: "correct-password" }, "", "https://evil.example"), { ip: "10.0.0.6" })).status, 403);
  assert.equal((await auth(req("login", { email: "user@example.fr", password: "correct-password" }, "", "http://sillon.example"), { ip: "10.0.0.6" })).status, 403);
});

test("login validates input and rate-limits repeated attempts", async () => {
  assert.equal((await auth(req("login", { email: "bad", password: "short" }), { ip: "10.0.0.7" })).status, 400);
  process.env.AUTH_LOGIN_LIMIT_PER_IP = "1";
  const ctx = { ip: "10.0.0.8" };
  assert.equal((await auth(req("login", { email: "user@example.fr", password: "correct-password" }), ctx)).status, 200);
  assert.equal((await auth(req("login", { email: "user@example.fr", password: "correct-password" }), ctx)).status, 429);
  process.env.AUTH_LOGIN_LIMIT_PER_IP = "20";
});

test("missing Supabase configuration and unsupported methods fail closed", async () => {
  const url = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  assert.equal((await auth(req("login", { email: "user@example.fr", password: "correct-password" }), { ip: "10.0.0.9" })).status, 503);
  process.env.SUPABASE_URL = url;
  const get = new Request("https://sillon.example/api/auth?action=login", { method: "GET", headers: { origin: "https://sillon.example" } });
  assert.equal((await auth(get, { ip: "10.0.0.10" })).status, 405);
});


test("login measures request limits in UTF-8 bytes", async () => {
  const oversized = "é".repeat(4100);
  const r = await auth(new Request("https://sillon.example/api/auth?action=login", {
    method: "POST", headers: { origin: "https://sillon.example", "content-type": "application/json" },
    body: JSON.stringify({ email: "user@example.fr", password: "correct-password", extra: oversized }),
  }), { ip: "10.0.0.11" });
  assert.equal(r.status, 413);
});


test("invalid rate-limit configuration falls back to a safe default", async () => {
  process.env.AUTH_LOGIN_LIMIT_PER_IP = "not-a-number";
  const ctx = { ip: "10.0.0.12" };
  const r = await auth(req("login", { email: "user@example.fr", password: "correct-password" }), ctx);
  assert.equal(r.status, 200);
  process.env.AUTH_LOGIN_LIMIT_PER_IP = "20";
});

test("logout preserves the cookie when Supabase cannot confirm session revocation", async () => {
  mode = "refresh_unavailable";
  const refreshFailure = await auth(req("logout", undefined, "sillon_refresh=refresh-token-value-long-enough"), { ip: "10.0.0.13" });
  assert.equal(refreshFailure.status, 502);
  assert.doesNotMatch(refreshFailure.headers.get("set-cookie"), /Max-Age=0/);

  mode = "logout_unavailable";
  const revokeFailure = await auth(req("logout", undefined, "sillon_refresh=refresh-token-value-long-enough"), { ip: "10.0.0.14" });
  assert.equal(revokeFailure.status, 502);
  assert.doesNotMatch(revokeFailure.headers.get("set-cookie"), /Max-Age=0/);
  mode = "success";
});

test("production refuses login without a strong IP salt for IP-based rate limiting", async () => {
  const oldNetlify = process.env.NETLIFY;
  const oldSalt = process.env.IP_SALT;
  process.env.NETLIFY = "true";
  delete process.env.IP_SALT;
  const r = await auth(req("login", { email: "user@example.fr", password: "correct-password" }), { ip: "10.0.0.15" });
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { code: "rate_limit_not_configured" });
  if (oldNetlify === undefined) delete process.env.NETLIFY; else process.env.NETLIFY = oldNetlify;
  if (oldSalt === undefined) delete process.env.IP_SALT; else process.env.IP_SALT = oldSalt;
});

test("refresh preserves the cookie during temporary Supabase outages and rate limits", async () => {
  const cookie = "sillon_refresh=refresh-token-value-long-enough";
  mode = "refresh_unavailable";
  const unavailable = await auth(req("refresh", undefined, cookie), { ip: "10.0.0.16" });
  assert.equal(unavailable.status, 502);
  assert.match(unavailable.headers.get("set-cookie"), /sillon_refresh=refresh-token-value-long-enough/);
  assert.doesNotMatch(unavailable.headers.get("set-cookie"), /Max-Age=0/);

  mode = "refresh_rate_limited";
  const limited = await auth(req("refresh", undefined, cookie), { ip: "10.0.0.17" });
  assert.equal(limited.status, 429);
  assert.match(limited.headers.get("set-cookie"), /sillon_refresh=refresh-token-value-long-enough/);
  assert.doesNotMatch(limited.headers.get("set-cookie"), /Max-Age=0/);
  mode = "success";
});


test("persistent rate limiter fails closed instead of using process memory", async () => {
  const values = new Map();
  const persistent = {
    async get(key) { return values.get(key) ?? null; },
    async set(key, value) { values.set(key, value); },
  };
  assert.equal(await bumpStrict(persistent, "login/test", 2), true);
  assert.equal(await bumpStrict(persistent, "login/test", 2), true);
  assert.equal(await bumpStrict(persistent, "login/test", 2), false);
  await assert.rejects(() => bumpStrict(null, "login/test", 2), /persistent_store_unavailable/);
  const broken = { async get() { throw new Error("storage_down"); }, async set() {} };
  await assert.rejects(() => bumpStrict(broken, "login/test", 2), /storage_down/);
});


test("password recovery sends a same-origin redirect and does not reveal whether an account exists", async () => {
  calls.length = 0;
  const r = await auth(req("recover", { email: " USER@example.fr " }), { ip: "10.0.0.21" });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.match(calls[0].url, /auth\\/v1\\/recover/);
  assert.match(decodeURIComponent(calls[0].url), /redirect_to=https:\/\/sillon\.example\//);
  assert.equal(JSON.parse(calls[0].init.body).email, "user@example.fr");
  assert.equal(calls[0].init.headers.apikey, "test-anon-key");
});

test("password recovery validates email, rate limits and fails safely on identity outages", async () => {
  assert.equal((await auth(req("recover", { email: "bad" }), { ip: "10.0.0.22" })).status, 400);
  mode = "recover_unavailable";
  assert.equal((await auth(req("recover", { email: "user@example.fr" }), { ip: "10.0.0.23" })).status, 502);
  mode = "recover_rate_limited";
  assert.equal((await auth(req("recover", { email: "user@example.fr" }), { ip: "10.0.0.24" })).status, 429);
  mode = "success";
});

test("password update requires a recovery token and a strong password", async () => {
  calls.length = 0;
  assert.equal((await auth(req("update-password", { access_token: "short", password: "short" }), { ip: "10.0.0.25" })).status, 400);
  const r = await auth(req("update-password", { access_token: "recovery-access-token-long-enough", password: "NewStrongPassword2026!" }), { ip: "10.0.0.26" });
  assert.equal(r.status, 200);
  assert.match(calls[0].url, /auth\/v1\/user$/);
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(calls[0].init.headers.authorization, "Bearer recovery-access-token-long-enough");
  assert.deepEqual(JSON.parse(calls[0].init.body), { password: "NewStrongPassword2026!" });
  mode = "update_invalid";
  assert.equal((await auth(req("update-password", { access_token: "recovery-access-token-long-enough", password: "AnotherStrongPassword2026!" }), { ip: "10.0.0.27" })).status, 400);
  mode = "success";
});
