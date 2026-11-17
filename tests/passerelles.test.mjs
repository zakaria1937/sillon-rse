// Tests des passerelles /api/contact et /api/dossier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bumpProtected } from "../netlify/lib/shared.mjs";

const sent = [];

test("les quotas protégés échouent fermés si Netlify Blobs est indisponible", async () => {
  const previous = process.env.NETLIFY;
  process.env.NETLIFY = "true";
  const unavailable = { async get() { throw new Error("storage_down"); }, async set() {} };
  try {
    await assert.rejects(() => bumpProtected(unavailable, "quota/test", 2), /storage_down/);
    await assert.rejects(() => bumpProtected(null, "quota/test", 2), /persistent_store_unavailable/);
  } finally {
    if (previous === undefined) delete process.env.NETLIFY;
    else process.env.NETLIFY = previous;
  }
});
globalThis.fetch = async (url, init) => { sent.push({ url: String(url), body: Object.fromEntries(new URLSearchParams(init.body)) }); return new Response("ok", { status: 200 }); };
process.env.CONTACT_LIMIT_PER_IP = "3";
const { default: contact } = await import("../netlify/functions/contact.mjs");
const { default: dossier } = await import("../netlify/functions/dossier.mjs");
const req = (path, method, body, origin = "https://sillon.example") => new Request("https://sillon.example" + path, { method, headers: { origin, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
const fiche = { evenement: "Nouveau contact", prenom: "Claire", nom: "Martin", email: "claire@atelier.fr", entreprise: "Atelier", piege: "", delai: 9000 };

test("contact : une fiche valide est transmise au formulaire Netlify", async () => {
  const r = await contact(req("/api/contact", "POST", fiche), { ip: "5.5.5.1" });
  assert.equal(r.status, 200);
  assert.equal(sent.at(-1).body["form-name"], "sillon");
  assert.equal(sent.at(-1).body.email, "claire@atelier.fr");
  assert.equal(sent.at(-1).body.piege, undefined);
});

test("contact : les robots sont ignorés sans rien transmettre", async () => {
  const n = sent.length;
  assert.equal((await contact(req("/api/contact", "POST", { ...fiche, piege: "x" }), { ip: "5.5.5.2" })).status, 200);
  assert.equal((await contact(req("/api/contact", "POST", { ...fiche, delai: 300 }), { ip: "5.5.5.2" })).status, 200);
  assert.equal(sent.length, n);
});

test("contact : e-mail invalide, autre site et excès d'envois sont refusés", async () => {
  assert.equal((await contact(req("/api/contact", "POST", { ...fiche, email: "pas-un-mail" }), { ip: "5.5.5.3" })).status, 400);
  assert.equal((await contact(req("/api/contact", "POST", fiche, "https://pirate.example"), { ip: "5.5.5.3" })).status, 403);
  for (let i = 0; i < 3; i++) assert.equal((await contact(req("/api/contact", "POST", fiche), { ip: "5.5.5.4" })).status, 200);
  assert.equal((await contact(req("/api/contact", "POST", fiche), { ip: "5.5.5.4" })).status, 429);
});

const code = "abcdefghjkmnpqrstuvwxyz234";
test("dossier : sauvegarde, lecture avec le code, puis suppression", async () => {
  const put = await dossier(req("/api/dossier", "PUT", { code, data: { inputs: { a: 1 }, profile: { nom: "Atelier" } } }), { ip: "6.6.6.1" });
  assert.equal(put.status, 200);
  const get = await dossier(req("/api/dossier", "POST", { code }), { ip: "6.6.6.1" });
  assert.equal((await get.json()).data.profile.nom, "Atelier");
  assert.equal((await dossier(req("/api/dossier", "DELETE", { code }), { ip: "6.6.6.1" })).status, 200);
  assert.equal((await dossier(req("/api/dossier", "POST", { code }), { ip: "6.6.6.1" })).status, 404);
});

test("dossier : accepte et restitue un bloc chiffré sans données métier en clair", async () => {
  const encryptedCode = "bcdefghjkmnpqrstuvwxyz2345";
  const envelope = { v: 2, iv: "AAAAAAAAAAAAAAAA", ciphertext: "AQIDBA==" };
  assert.equal((await dossier(req("/api/dossier", "PUT", { code: encryptedCode, data: envelope }), { ip: "6.6.6.3" })).status, 200);
  const restored = await dossier(req("/api/dossier", "POST", { code: encryptedCode }), { ip: "6.6.6.3" });
  const body = await restored.json();
  assert.equal(body.data.v, 2);
  assert.equal(body.data.ciphertext, envelope.ciphertext);
  assert.equal(body.data.inputs, undefined);
});

test("dossier : code inconnu, code trop court et données trop lourdes sont refusés", async () => {
  assert.equal((await dossier(req("/api/dossier", "POST", { code: "z".repeat(30) }), { ip: "6.6.6.2" })).status, 404);
  assert.equal((await dossier(req("/api/dossier", "POST", { code: "court" }), { ip: "6.6.6.2" })).status, 400);
  assert.equal((await dossier(req("/api/dossier", "PUT", { code, data: { inputs: { x: "a".repeat(500000) } } }), { ip: "6.6.6.2" })).status, 413);
  assert.equal((await dossier(req("/api/dossier", "PUT", { code, data: { inputs: {} } }, "https://pirate.example"), { ip: "6.6.6.2" })).status, 403);
});
