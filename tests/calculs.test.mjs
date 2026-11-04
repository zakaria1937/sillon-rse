// Tests des calculs des copilotes Sillon : node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../copilots.js", import.meta.url), "utf8"), ctx);
const { copilots } = ctx.window.SILLON;
const byId = Object.fromEntries(copilots.map((c) => [c.id, c]));

function defaults(cp) {
  const v = {};
  cp.fields.forEach((f) => {
    if (f.type === "group") return;
    if (f.type === "checklist") v[f.id] = Object.fromEntries(f.items.map((i) => [i.id, i.def ?? f.states[f.states.length - 1][0]]));
    else if (f.type === "table") v[f.id] = JSON.parse(JSON.stringify(f.def));
    else v[f.id] = f.def;
  });
  return v;
}
const run = (id, over = {}) => { const cp = byId[id]; return cp.compute({ ...defaults(cp), ...over }); };

test("13 copilotes, chacun calcule sans erreur avec ses valeurs d'exemple", () => {
  assert.equal(copilots.length, 13);
  for (const cp of copilots) {
    const r = cp.compute(defaults(cp));
    assert.ok(r.verdict && r.summary, cp.id);
    assert.ok(Array.isArray(r.findings) && r.findings.length > 0, cp.id);
    assert.ok(r.sources.every((s) => s.url.startsWith("https://")), cp.id);
  }
});

test("Carbone IA : 25 utilisateurs x 15 requêtes x 220 j, 20 % longues, 200 images/mois", () => {
  const r = run("carbone-ia");
  // 82 500 requêtes : 0,8 x 0,3 Wh + 0,2 x 3 Wh = 69,3 kWh ; images 2 400 x 2,9 Wh = 6,96 kWh
  assert.equal(r.kpis[0].v, "76");
  assert.equal(r.kpis[1].v, "34,3"); // 76,26 kWh x 0,45
});

test("Bilan carbone : électricité 100 000 kWh seule = 5,2 tCO2e", () => {
  const zero = Object.fromEntries(byId["bilan-carbone"].fields.filter((f) => f.type === "number" || f.type === "range").map((f) => [f.id, 0]));
  const r = run("bilan-carbone", { ...zero, elec: 100000, sal: 1 });
  assert.equal(r.kpis[0].v, "5,2");
});

test("Réglementation : PME de 140 salariés = 7 obligations", () => {
  assert.equal(run("reglementation").kpis[0].v, 7);
});

test("Réglementation : CSRD applicable seulement au-delà de 1 000 salariés ET 450 M€", () => {
  const csrd = (r) => r.findings.find((f) => f.t.startsWith("CSRD"));
  assert.equal(csrd(run("reglementation", { eff: 1200, effM: 1200, ca: 500 })).lvl, "crit");
  assert.equal(csrd(run("reglementation", { eff: 1200, effM: 1200, ca: 300 })).lvl, "info");
  assert.equal(csrd(run("reglementation", { eff: 900, effM: 900, ca: 600 })).lvl, "info");
});

test("EcoVadis : un thème sous 30 bloque toute médaille", () => {
  const r = run("ecovadis", { eth: { pol: "0", act: "0", kpi: "0", cert: "0" } });
  assert.equal(r.verdict, "Aucune médaille");
  const top = { pol: "3", act: "3", kpi: "3", cert: "3" };
  assert.equal(run("ecovadis", { env: top, lab: top, eth: top, sup: top }).verdict, "Platine probable");
});

test("Greenwashing : détecte la neutralité carbone et la mention AGEC interdite", () => {
  const r = run("greenwashing", { txt: "Produit neutre en carbone, emballage biodégradable." });
  const tags = r.findings.map((f) => f.tag);
  assert.ok(tags.includes("Neutralité carbone"));
  assert.ok(tags.includes("Mention interdite"));
  assert.equal(run("greenwashing", { txt: "En 2025, -18 % sur les scopes 1 et 2 par rapport à 2022." }).kpis[0].v, 0);
});

test("VSME : 70 % de complétude sur l'exemple du module de base", () => {
  assert.equal(run("reporting-vsme").gauge.val, 70);
});

test("ROI : VAN positive et retour inférieur à 1 an sur l'exemple", () => {
  const r = run("roi-rse");
  assert.equal(r.verdict, "Démarche rentable sur 5 ans");
});
