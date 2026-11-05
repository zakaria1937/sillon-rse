// Tests de la passerelle /api/claude (Mistral et Groq simulés).
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.MISTRAL_API_KEY = "test-mistral";
process.env.RATE_LIMIT_PER_IP = "3";
const calls = [];
const sse = (parts) => new Response(new ReadableStream({ start(c) { parts.forEach((t) => c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`))); c.enqueue(new TextEncoder().encode("data: [DONE]\n\n")); c.close(); } }), { status: 200 });
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  calls.push({ url, body, auth: init.headers.authorization });
  if (url.includes("mistral") && process.env.SIM_QUOTA) return new Response('{"message":"quota"}', { status: 429 });
  return sse(url.includes("groq") ? ["Secours"] : ["Bon", "jour"]);
};
const { default: handler } = await import("../netlify/functions/claude.mjs");
const req = (body, origin = "https://sillon.example") => new Request("https://sillon.example/api/claude", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const ok = { kind: "chat", messages: [{ role: "user", content: "Qu'est-ce que la VSME ?" }] };

test("relaie la réponse de Mistral en texte continu, avec le prompt système RSE", async () => {
  const r = await handler(req(ok), { ip: "1.1.1.1" });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "Bonjour");
  const c = calls.at(-1);
  assert.match(c.url, /api\.mistral\.ai/);
  assert.equal(c.auth, "Bearer test-mistral");
  assert.equal(c.body.messages[0].role, "system");
  assert.match(c.body.messages[0].content, /RSE/);
  assert.equal(c.body.model, "mistral-small-latest");
});

test("utilise le modèle d'analyse et transmet les images au format attendu", async () => {
  const r = await handler(req({ kind: "import", messages: [{ role: "user", content: "Extrais" }], images: [{ media_type: "image/jpeg", data: "AAAA" }] }), { ip: "1.1.1.4" });
  await r.text();
  const last = calls.at(-1).body.messages.at(-1).content;
  assert.equal(last[1].type, "image_url");
  assert.match(last[1].image_url, /^data:image\/jpeg;base64,/);
});

test("refuse les appels venant d'un autre site", async () => {
  assert.equal((await handler(req(ok, "https://pirate.example"), { ip: "1.1.1.2" })).status, 403);
});

test("refuse les requêtes mal formées", async () => {
  assert.equal((await handler(req({ kind: "x", messages: [] }), { ip: "1.1.1.3" })).status, 400);
  assert.equal((await handler(req({ kind: "chat", messages: [{ role: "assistant", content: "a" }] }), { ip: "1.1.1.3" })).status, 400);
});

test("limite le nombre d'appels par adresse IP et par jour", async () => {
  const ctx = { ip: "2.2.2.2" };
  for (let i = 0; i < 3; i++) assert.equal((await handler(req(ok), ctx)).status, 200);
  assert.equal((await handler(req(ok), ctx)).status, 429);
});

test("quota Mistral atteint : message clair sans secours, bascule sur Groq si configuré", async () => {
  process.env.SIM_QUOTA = "1";
  const r1 = await handler(req(ok), { ip: "3.3.3.3" });
  assert.equal(r1.status, 429);
  process.env.GROQ_API_KEY = "test-groq";
  const r2 = await handler(req(ok), { ip: "3.3.3.4" });
  assert.equal(await r2.text(), "Secours");
  assert.match(calls.at(-1).url, /groq/);
  delete process.env.SIM_QUOTA; delete process.env.GROQ_API_KEY;
});

test("sans clé configurée : service indisponible", async () => {
  const k = process.env.MISTRAL_API_KEY; delete process.env.MISTRAL_API_KEY;
  const r = await handler(req(ok), { ip: "4.4.4.4" });
  assert.equal(r.status, 503);
  process.env.MISTRAL_API_KEY = k;
});
