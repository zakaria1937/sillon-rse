// Tests de la passerelle /api/claude (fetch Anthropic simulé).
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.ANTHROPIC_API_KEY = "test";
process.env.RATE_LIMIT_PER_IP = "3";
const calls = [];
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  calls.push(body);
  if (body.model === "claude-haiku-5-5" && process.env.SIM_404) return new Response('{"error":{"type":"not_found_error","message":"model"}}', { status: 404 });
  const sse = ['event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Bon"}}\n\n', 'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"jour"}}\n\n', 'event: message_stop\ndata: {"type":"message_stop"}\n\n'];
  return new Response(new ReadableStream({ start(c) { sse.forEach((s) => c.enqueue(new TextEncoder().encode(s))); c.close(); } }), { status: 200 });
};
const { default: handler } = await import("../netlify/functions/claude.mjs");
const req = (body, origin = "https://sillon.example") => new Request("https://sillon.example/api/claude", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const ok = { kind: "chat", messages: [{ role: "user", content: "Qu'est-ce que la VSME ?" }] };

test("relaie la réponse de Claude en texte continu, avec le prompt système RSE", async () => {
  const r = await handler(req(ok), { ip: "1.1.1.1" });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "Bonjour");
  assert.match(calls.at(-1).system, /RSE/);
  assert.equal(calls.at(-1).max_tokens, 900);
});

test("refuse les appels venant d'un autre site", async () => {
  const r = await handler(req(ok, "https://pirate.example"), { ip: "1.1.1.2" });
  assert.equal(r.status, 403);
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

test("bascule sur le modèle suivant si un modèle n'existe pas", async () => {
  process.env.SIM_404 = "1";
  const r = await handler(req(ok), { ip: "3.3.3.3" });
  assert.equal(await r.text(), "Bonjour");
  assert.equal(calls.at(-1).model, "claude-haiku-4-5");
  delete process.env.SIM_404;
});
