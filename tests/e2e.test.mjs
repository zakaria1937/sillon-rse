// Tests de bout en bout dans un vrai navigateur (Playwright) : npm run test:e2e
// Le site est servi en local avec les vraies passerelles ; seuls l'IA et le formulaire Netlify sont simulés.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8790, BASE = `http://localhost:${PORT}`;
const forms = [];
process.env.MISTRAL_API_KEY = "test";
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes("api.mistral.ai")) {
    const parts = ["## Diagnostic\n", "Réponse simulée."];
    return new Response(new ReadableStream({ start(c) { parts.forEach((t) => c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`))); c.close(); } }));
  }
  if (u === BASE + "/" && init?.method === "POST") { forms.push(Object.fromEntries(new URLSearchParams(init.body))); return new Response("ok"); }
  return realFetch(url, init);
};
const fns = {
  "/api/claude": (await import("../netlify/functions/claude.mjs")).default,
  "/api/contact": (await import("../netlify/functions/contact.mjs")).default,
  "/api/dossier": (await import("../netlify/functions/dossier.mjs")).default,
};
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
let server, browser;

before(async () => {
  server = http.createServer(async (q, s) => {
    const u = q.url.split("?")[0];
    if (fns[u]) {
      let body = ""; for await (const c of q) body += c;
      const r = await fns[u](new Request(BASE + q.url, { method: q.method, headers: q.headers, body: ["GET", "HEAD"].includes(q.method) ? undefined : body }), { ip: "9.9.9.9" });
      s.writeHead(r.status, Object.fromEntries(r.headers)); s.end(Buffer.from(await r.arrayBuffer())); return;
    }
    fs.readFile(path.join(root, u === "/" ? "index.html" : u), (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "Content-Type": TYPES[path.extname(u)] || "text/html" }); s.end(d); });
  }).listen(PORT);
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

async function open(hash = "") {
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/" + hash); await page.waitForSelector("h1");
  return { page, errors };
}
async function fillContact(page) {
  await page.fill("#c-prenom", "Claire"); await page.fill("#c-nom", "Martin"); await page.fill("#c-email", "claire@atelier.fr"); await page.fill("#c-entreprise", "Atelier");
  await page.check("#c-adult"); await page.check("#c-consent"); await page.click(".modal button[type=submit]");
}

test("chaque page s'ouvre sans erreur et sans appel à un service tiers", async () => {
  const { page, errors } = await open();
  const hosts = new Set(); page.on("request", (r) => hosts.add(new URL(r.url()).host));
  for (const h of ["", "#profil", "#plan", "#veille", "#methode", "#rapport", "#mes-donnees", "#confidentialite", "#cgu", "#cookies", "#mentions", "#credits", "#accessibilite", "#bilan-carbone", "#carbone-ia", "#fournisseurs", "#benchmark-rse", "#reglementation", "#reporting-vsme", "#ecovadis", "#audit-iso", "#marches-publics", "#greenwashing", "#visibilite-rse", "#roi-rse", "#objections"]) {
    await page.goto(BASE + "/" + h); await page.waitForTimeout(120);
    assert.ok((await page.textContent("h1")).trim().length > 0, h);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual([...hosts], [`localhost:${PORT}`]);
  await page.close();
});

test("un copilote recalcule ses résultats à la saisie", async () => {
  const { page } = await open("#bilan-carbone");
  const avant = await page.textContent("#res .verdict h3");
  await page.fill("#bilan-carbone-elec", "2000000"); await page.waitForTimeout(300);
  assert.notEqual(await page.textContent("#res .verdict h3"), avant);
  await page.close();
});

test("la fiche contact exige majorité et consentement, puis l'analyse IA s'affiche et le contact est transmis", async () => {
  const { page } = await open("#bilan-carbone");
  await page.waitForTimeout(2600); // délai anti-robots de la passerelle
  await page.click("#aiGo");
  await page.fill("#c-prenom", "Claire"); await page.fill("#c-nom", "Martin"); await page.fill("#c-email", "claire@atelier.fr"); await page.fill("#c-entreprise", "Atelier");
  await page.click(".modal button[type=submit]");
  assert.match(await page.textContent("#cErr"), /majeurs/);
  await page.check("#c-adult"); await page.check("#c-consent"); await page.click(".modal button[type=submit]");
  await page.waitForFunction(() => document.getElementById("aiOut").textContent.includes("Réponse simulée"));
  assert.ok(forms.some((f) => f.evenement === "Nouveau contact" && f.email === "claire@atelier.fr"));
  await page.close();
});

test("la sauvegarde en ligne permet de reprendre le dossier dans un autre navigateur", async () => {
  const { page } = await open("#profil");
  await page.fill("#p-nom", "Atelier Normand"); await page.click("#pform button[type=submit]");
  await page.goto(BASE + "/#mes-donnees"); await page.click("#clOn"); await page.waitForSelector("#clCode");
  const code = await page.textContent("#clCode");
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  await p2.goto(BASE + "/#dossier-" + code); await p2.waitForSelector("#cl-in");
  await p2.click("#clF button[type=submit]"); await p2.waitForFunction(() => location.hash === "#accueil");
  assert.match(await p2.textContent(".dash"), /Atelier Normand/);
  await ctx2.close(); await page.close();
});

test("désinscription et demande de suppression arrivent chez l'éditeur ; l'effacement local vide le navigateur", async () => {
  const { page } = await open("#bilan-carbone");
  await page.waitForTimeout(2600);
  await page.click("#aiGo"); await fillContact(page); await page.waitForTimeout(400);
  await page.goto(BASE + "/#mes-donnees");
  await page.fill("#md-msg", "Merci de tout supprimer"); await page.click("#mdDelF button[type=submit]"); await page.waitForTimeout(400);
  await page.click("#mdUnsub"); await page.waitForTimeout(400);
  assert.ok(forms.some((f) => f.evenement.startsWith("Demande de suppression")));
  assert.ok(forms.some((f) => f.evenement.startsWith("Désinscription")));
  await page.click("#mdErase"); await page.click("#mdEraseYes"); await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => localStorage.getItem("sillon.v2")), null);
  await page.close();
});

test("au clavier : le focus reste dans la fenêtre ouverte et Échap la ferme", async () => {
  const { page } = await open("#bilan-carbone");
  await page.click("#aiGo");
  for (let i = 0; i < 25; i++) await page.keyboard.press("Tab");
  assert.ok(await page.evaluate(() => !!document.activeElement.closest(".modal")));
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".modal").count(), 0);
  await page.close();
});

test("les exports PDF et Excel produisent un fichier", async () => {
  const { page } = await open("#bilan-carbone");
  await page.waitForTimeout(2600);
  await page.click("#pdfOne"); await page.waitForSelector("#c-prenom");
  const [pdf] = await Promise.all([page.waitForEvent("download"), fillContact(page)]);
  assert.match(pdf.suggestedFilename(), /\.pdf$/);
  const [xl] = await Promise.all([page.waitForEvent("download"), page.click("#xlsOne")]);
  assert.match(xl.suggestedFilename(), /\.xlsx$/);
  await page.close();
});
