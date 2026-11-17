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
  "/api/auth": (await import("../netlify/functions/auth.mjs")).default,
  "/api/tenant": (await import("../netlify/functions/tenant.mjs")).default,
};
// Même politique de sécurité (CSP) qu'en production, lue dans netlify.toml.
const CSP = fs.readFileSync(path.join(root, "netlify.toml"), "utf8").match(/Content-Security-Policy = "([^"]+)"/)[1];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".bin": "application/octet-stream" };
let server, browser;

before(async () => {
  server = http.createServer(async (q, s) => {
    const u = q.url.split("?")[0];
    if (fns[u]) {
      let body = ""; for await (const c of q) body += c;
      const r = await fns[u](new Request(BASE + q.url, { method: q.method, headers: q.headers, body: ["GET", "HEAD"].includes(q.method) ? undefined : body }), { ip: "9.9.9.9" });
      s.writeHead(r.status, Object.fromEntries(r.headers)); s.end(Buffer.from(await r.arrayBuffer())); return;
    }
    fs.readFile(path.join(root, u === "/" ? "index.html" : u), (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "Content-Security-Policy": CSP, "Content-Type": TYPES[path.extname(u)] || "text/html" }); s.end(d); });
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
async function fillContact(page, recontact = false) {
  await page.fill("#c-prenom", "Claire"); await page.fill("#c-nom", "Martin"); await page.fill("#c-email", "claire@atelier.fr"); await page.fill("#c-entreprise", "Atelier");
  await page.check("#c-adult"); await page.check("#c-consent"); if (recontact) await page.check("#c-recontact"); await page.click(".modal button[type=submit]");
}

test("chaque page s'ouvre sans erreur et sans appel à un service tiers", async () => {
  const { page, errors } = await open();
  const hosts = new Set(); page.on("request", (r) => hosts.add(new URL(r.url()).host));
  for (const h of ["", "#profil", "#plan", "#preuves", "#veille", "#methode", "#rapport", "#mes-donnees", "#confidentialite", "#cgu", "#cookies", "#mentions", "#credits", "#accessibilite", "#bilan-carbone", "#carbone-ia", "#fournisseurs", "#benchmark-rse", "#reglementation", "#reporting-vsme", "#ecovadis", "#audit-iso", "#marches-publics", "#greenwashing", "#visibilite-rse", "#roi-rse", "#objections"]) {
    await page.goto(BASE + "/" + h); await page.waitForTimeout(120);
    assert.ok((await page.textContent("h1")).trim().length > 0, h);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual([...hosts], [`localhost:${PORT}`]);
  await page.close();
});

test("l'espace entreprise s'ouvre et signale proprement que Supabase doit être configuré", async () => {
  const { page, errors } = await open();
  await page.click("[data-saas-open]");
  await page.waitForSelector("#saas-login");
  assert.match(await page.textContent("#saas-title"), /Connexion/);
  await page.locator("[data-saas-close]").focus();
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute("type")), "submit");
  await page.fill('#saas-login input[name="email"]', "test@example.fr");
  await page.fill('#saas-login input[name="password"]', "motdepasse-test");
  await page.click('#saas-login button[type="submit"]');
  await page.waitForFunction(() => document.querySelector("[data-saas-error]")?.textContent.includes("pas encore configuré"));
  assert.deepEqual(errors, []);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".saas-overlay").isVisible(), false);
  await page.close();
});

test("parcours entreprise : connexion, création d'organisation et dossier cloud vierge", async () => {
  const { page, errors } = await open();
  const orgId = "50000000-0000-4000-8000-000000000005";
  const dossierId = "60000000-0000-4000-8000-000000000006";
  let orgCreated = false, dossierCreated = false, roleUpdated = false;
  await page.route("**/api/auth**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("action") === "refresh") {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "session_expired" }) });
    } else if (url.searchParams.get("action") === "login") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        access_token: "mock-access-token-long-enough-for-e2e",
        expires_in: 3600, user: { id: "70000000-0000-4000-8000-000000000007", email: "test@atelier.fr" }
      }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
  await page.route("**/api/tenant**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    assert.match(request.headers().authorization || "", /^Bearer mock-access-token/);
    if (url.searchParams.get("resource") === "organizations" && request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(orgCreated ? [
        { id: orgId, name: "Atelier Démo", created_at: "2026-11-17T10:00:00Z" }
      ] : []) });
    } else if (url.searchParams.get("resource") === "organizations" && request.method() === "POST") {
      orgCreated = true;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: orgId }) });
    } else if (url.searchParams.get("resource") === "memberships" && request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
        { user_id: "70000000-0000-4000-8000-000000000007", role: "admin", created_at: "2026-11-17T10:00:00Z" },
        { user_id: "80000000-0000-4000-8000-000000000008", role: roleUpdated ? "contributor" : "reader", created_at: "2026-11-17T10:00:00Z" }
      ]) });
    } else if (url.searchParams.get("resource") === "memberships" && request.method() === "PATCH") {
      const body = request.postDataJSON();
      assert.equal(body.user_id, "80000000-0000-4000-8000-000000000008");
      assert.equal(body.role, "contributor");
      roleUpdated = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ updated: true }) });
    } else if (url.searchParams.get("resource") === "dossiers" && request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(dossierCreated ? [
        { id: dossierId, name: "Diagnostic initial", version: 1, updated_at: "2026-11-17T10:00:00Z" }
      ] : []) });
    } else if (url.searchParams.get("resource") === "dossiers" && request.method() === "POST") {
      dossierCreated = true;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        id: dossierId, organization_id: orgId, name: "Diagnostic initial", version: 1
      }) });
    } else {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "not_found" }) });
    }
  });
  await page.click("[data-saas-open]");
  await page.fill('#saas-login input[name="email"]', "test@atelier.fr");
  await page.fill('#saas-login input[name="password"]', "motdepasse-test");
  await page.click('#saas-login button[type="submit"]');
  await page.fill('#saas-create-org input[name="name"]', "Atelier Démo");
  await page.click('#saas-create-org button[type="submit"]');
  await page.waitForSelector('[data-saas-org="' + orgId + '"]');
  await page.click('[data-saas-org="' + orgId + '"]');
  await page.waitForFunction(() => document.querySelector("#saas-dossiers")?.textContent.includes("Administrateur"));
  await page.fill('#saas-create-dossier input[name="name"]', "Diagnostic initial");
  await page.click('#saas-create-dossier button[type="submit"]');
  await page.waitForFunction(() => document.querySelector("#saas-dossiers")?.textContent.includes("Diagnostic initial"));
  await page.selectOption('form[data-saas-member="80000000-0000-4000-8000-000000000008"] select[name="role"]', "contributor");
  await page.click('form[data-saas-member="80000000-0000-4000-8000-000000000008"] button[type="submit"]');
  await page.waitForFunction(() => document.querySelector("#saas-dossiers")?.textContent.includes("Contributeur"));
  assert.equal(orgCreated, true);
  assert.equal(dossierCreated, true);
  assert.equal(roleUpdated, true);
  assert.deepEqual(errors, []);
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

test("la sauvegarde en ligne est chiffrée côté navigateur et restaurable dans un autre navigateur", async () => {
  const { page } = await open("#profil");
  let cloudPayload;
  page.on("request", req => { if (req.url().includes("/api/dossier") && req.method() === "PUT") cloudPayload = JSON.parse(req.postData()); });
  await page.fill("#p-nom", "Atelier Normand"); await page.click("#pform button[type=submit]");
  await page.evaluate(() => { window.SX.state().documents = [{ id: "large", title: "Pièce volumineuse", ref: "GED/TEST", note: "x".repeat(70000) }]; window.SX.save(); });
  await page.waitForTimeout(450);
  await page.reload();
  await page.goto(BASE + "/#mes-donnees"); await page.click("#clOn"); await page.waitForSelector("#clCode");
  assert.equal(cloudPayload.data.v, 2);
  assert.equal(typeof cloudPayload.data.ciphertext, "string");
  assert.equal(cloudPayload.data.inputs, undefined);
  const code = await page.textContent("#clCode");
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  await p2.goto(BASE + "/#dossier-" + code); await p2.waitForSelector("#cl-in");
  await p2.click("#clF button[type=submit]"); await p2.waitForFunction(() => location.hash === "#accueil");
  assert.match(await p2.textContent(".dash"), /Atelier Normand/);
  assert.equal(await p2.evaluate(() => JSON.parse(localStorage.getItem("sillon.v2")).documents[0].note.length), 70000);
  await ctx2.close(); await page.close();
});

test("une sauvegarde JSON locale peut être restaurée après confirmation", async () => {
  const { page } = await open("#mes-donnees");
  const backup = { source: "Sillon", exporte_le: new Date().toISOString(), donnees: { inputs: {}, profile: { nom: "Entreprise restaurée", secteur: "Industrie", eff: 42, effM: 42, ca: 8, surf: 500, gwh: 1, mp: "oui", b2c: "non" }, used: {}, custom: [], documents: [], plan: {}, hist: {}, ai: {}, touched: {}, base: {}, chat: [], cloud: null } };
  page.on("dialog", dialog => dialog.accept());
  await page.setInputFiles("#mdImportFile", { name: "sillon-backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await page.waitForTimeout(400);
  assert.match(await page.textContent(".dash"), /Entreprise restaurée/);
  await page.close();
});

test("désinscription et demande de suppression arrivent chez l'éditeur ; l'effacement local vide le navigateur", async () => {
  const { page } = await open("#bilan-carbone");
  await page.waitForTimeout(2600);
  await page.click("#aiGo"); await fillContact(page, true); await page.waitForTimeout(400);
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

const COPILOTS = ["bilan-carbone", "carbone-ia", "fournisseurs", "benchmark-rse", "reglementation", "reporting-vsme", "ecovadis", "audit-iso", "marches-publics", "greenwashing", "visibilite-rse", "roi-rse", "objections"];

test("les exports PDF et Excel se téléchargent sans donner ses coordonnées, avec un message de confirmation", async () => {
  const { page, errors } = await open("#bilan-carbone");
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.click("#pdfOne")]);
  assert.match(pdf.suggestedFilename(), /\.pdf$/);
  assert.ok((await fs.promises.stat(await pdf.path())).size > 3000);
  assert.match(await page.textContent("#exportStatus"), /Fichier téléchargé/);
  const [xl] = await Promise.all([page.waitForEvent("download"), page.click("#xlsOne")]);
  assert.match(xl.suggestedFilename(), /\.xlsx$/);
  assert.equal(await page.locator(".modal").count(), 0);
  assert.equal(forms.filter((f) => /téléchargé/.test(f.evenement)).length, 0);
  assert.deepEqual(errors, []);
  await page.close();
});

test("rapport : la synthèse de pilotage est visible et le PDF exécutif est exportable", async () => {
  const { page, errors } = await open("#rapport");
  assert.match(await page.textContent(".dash"), /Synthèse de pilotage/);
  assert.match(await page.textContent(".dash"), /valeurs d'exemple/);
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.click("#pdfAll")]);
  assert.match(pdf.suggestedFilename(), /sillon-rapport-.*\.pdf$/);
  assert.ok((await fs.promises.stat(await pdf.path())).size > 5000);
  assert.deepEqual(errors, []);
  await page.close();
});

test("les 13 copilotes : résultats, champs vidés sans valeur aberrante, exports PDF et Excel", async () => {
  const { page, errors } = await open();
  for (const id of COPILOTS) {
    await page.goto(BASE + "/#" + id); await page.waitForSelector("#res .verdict h3");
    for (const inp of await page.locator('#form input[type="number"]').all()) await inp.fill("");
    for (const ta of await page.locator("#form textarea").all()) await ta.fill("");
    await page.waitForTimeout(250);
    const res = await page.textContent("#res");
    assert.doesNotMatch(res, /NaN|undefined|Infinity|\[object/, id + " (champs vides)");
    const numericInputs = await page.locator('#form input[type="number"]').all();
    for (const inp of numericInputs) await inp.fill("-5");
    await page.waitForTimeout(250);
    assert.doesNotMatch(await page.textContent("#res"), /NaN|undefined|Infinity|\[object/, id + " (valeurs négatives)");
    for (const inp of numericInputs) {
      if (await inp.getAttribute("min") === "0") assert.equal(await inp.getAttribute("aria-invalid"), "true", id + " (rejet d'une valeur négative)");
    }
    const [pdf] = await Promise.all([page.waitForEvent("download"), page.click("#pdfOne")]);
    assert.match(pdf.suggestedFilename(), new RegExp(id + ".*\\.pdf$"), id);
    const [xl] = await Promise.all([page.waitForEvent("download"), page.click("#xlsOne")]);
    assert.match(xl.suggestedFilename(), /\.xlsx$/, id);
    assert.equal(await page.locator('#res .sources a:text-is("lien")').count(), 0, id);
  }
  assert.deepEqual(errors, []);
  await page.close();
});

test("plan d'action : une action sans intitulé n'est jamais enregistrée", async () => {
  const { page } = await open("#plan");
  await page.click("#addAct"); await page.click("#draftF button[type=submit]");
  assert.match(await page.textContent("#draftErr"), /intitulé/);
  await page.click("#draftNo");
  assert.equal(await page.evaluate(() => (JSON.parse(localStorage.getItem("sillon.v2") || "{}").custom || []).length), 0);
  await page.click("#addAct"); await page.fill("#draftT", "Former les commerciaux à la RSE"); await page.click("#draftF button[type=submit]");
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("sillon.v2")).custom.length), 1);
  await page.fill('input[data-k="owner"]', "Responsable QSE");
  await page.fill('input[data-k="due"]', "2027-03-31");
  await page.fill('input[data-k="kpi"]', "100 % des commerciaux formés");
  await page.fill('input[data-k="evidence"]', "Feuilles de présence et support de formation");
  await page.fill('input[data-k="evidenceRef"]', "GED/RSE/FORMATION-2027");
  await page.fill('input[data-k="evidenceDate"]', "2027-04-02");
  await page.selectOption('select[data-k="evidenceStatus"]', "verified");
  await page.fill('input[data-k="evidenceVerifier"]', "Auditeur interne");
  await page.waitForTimeout(400);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("sillon.v2")).custom[0]);
  assert.equal(saved.owner, "Responsable QSE");
  assert.equal(saved.due, "2027-03-31");
  assert.equal(saved.kpi, "100 % des commerciaux formés");
  assert.equal(saved.evidence, "Feuilles de présence et support de formation");
  assert.equal(saved.evidenceRef, "GED/RSE/FORMATION-2027");
  assert.equal(saved.evidenceDate, "2027-04-02");
  assert.equal(saved.evidenceStatus, "verified");
  assert.equal(saved.evidenceVerifier, "Auditeur interne");
  await page.fill('td.act input', ""); await page.locator('td.act input').blur(); await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("sillon.v2")).custom[0].text), "Former les commerciaux à la RSE");
  await page.goto(BASE + "/#accueil");
  assert.match(await page.textContent(".dash"), /1\s*actions ouvertes/);
  await page.close();
});

test("registre documentaire : référence GED classée et exportée", async () => {
  const { page, errors } = await open("#preuves");
  assert.match(await page.textContent("h1"), /Registre documentaire/);
  await page.fill("#docTitle", "Bilan carbone 2026");
  await page.fill("#docRef", "GED/RSE/ENV/BC-2026");
  await page.selectOption("#docCategory", "environnement");
  await page.fill("#docDate", "2026-10-31");
  await page.fill("#docExpiry", "2020-01-01");
  await page.fill("#docVersion", "V1");
  await page.fill("#docOwner", "Responsable RSE");
  await page.selectOption("#docStatus", "valid");
  await page.fill("#docNote", "Périmètre France, exercice 2026");
  await page.click('#docForm button[type="submit"]');
  await page.waitForTimeout(350);
  assert.match(await page.textContent(".tbl-wrap"), /Bilan carbone 2026/);
  const doc = await page.evaluate(() => JSON.parse(localStorage.getItem("sillon.v2")).documents[0]);
  assert.equal(doc.ref, "GED/RSE/ENV/BC-2026");
  assert.equal(doc.category, "environnement");
  assert.equal(doc.status, "valid");
  assert.equal(doc.version, "V1");
  assert.equal(doc.validUntil, "2020-01-01");
  assert.match(await page.textContent("body"), /Documents expirés/);
  const prompts = ["V2", "GED/RSE/ENV/BC-2026-V2", "2027-12-31"];
  page.on("dialog", async dialog => { await dialog.accept(prompts.shift()); });
  await page.click('[data-revision]');
  await page.waitForTimeout(350);
  const revised = await page.evaluate(() => JSON.parse(localStorage.getItem("sillon.v2")).documents[0]);
  assert.equal(revised.version, "V2");
  assert.equal(revised.ref, "GED/RSE/ENV/BC-2026-V2");
  assert.equal(revised.validUntil, "2027-12-31");
  assert.equal(revised.history.length, 1);
  assert.equal(revised.history[0].version, "V1");
  await page.goto(BASE + "/#rapport");
  const [xlsx] = await Promise.all([page.waitForEvent("download"), page.click("#xlsAll")]);
  assert.match(xlsx.suggestedFilename(), /\.xlsx$/);
  assert.deepEqual(errors, []);
  await page.close();
});

test("profil : un profil enregistré sans nom n'est pas affiché comme « non renseigné »", async () => {
  const { page } = await open("#profil");
  await page.click("#pform button[type=submit]"); await page.goto(BASE + "/#accueil");
  const dash = await page.textContent(".dash");
  assert.doesNotMatch(dash, /non renseigné/);
  assert.match(dash, /Profil enregistré/); assert.match(dash, /nom de l'entreprise à compléter/);
  await page.close();
});

test("les coordonnées sont annoncées avant le clic, et l'accord pour être recontacté est facultatif", async () => {
  const { page } = await open("#bilan-carbone");
  assert.match(await page.textContent("#aiBox"), /demandent vos coordonnées/);
  await page.waitForTimeout(2600);
  const n = forms.length;
  await page.click("#aiGo");
  assert.equal(await page.isChecked("#c-recontact"), false);
  await fillContact(page);
  await page.waitForFunction(() => document.getElementById("aiOut").textContent.includes("Réponse simulée"));
  assert.match(forms.slice(n).find((f) => f.evenement === "Nouveau contact").consentement, /NON/);
  await page.close();
});

for (const [nom, w, h] of [["téléphone", 390, 844], ["tablette", 820, 1180]]) {
  test(`${nom} (${w} px) : aucune page ne déborde en largeur`, async () => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    for (const hsh of ["", "#profil", "#plan", "#preuves", "#veille", "#methode", "#rapport", "#mes-donnees", "#confidentialite", "#cookies", ...COPILOTS.map((c) => "#" + c)]) {
      await page.goto(BASE + "/" + hsh); await page.waitForSelector("h1"); await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, hsh || "accueil");
    }
    await page.goto(BASE + "/#bilan-carbone"); await page.click("#aiGo");
    assert.equal(await page.evaluate(() => { const m = document.querySelector(".modal-box").getBoundingClientRect(); return m.left >= 0 && m.right <= window.innerWidth; }), true);
    await page.close();
  });
}
