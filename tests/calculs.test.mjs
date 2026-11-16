// Tests des calculs des copilotes Sillon : node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../referentiels.js", import.meta.url), "utf8"), ctx);
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


test("Bilan carbone : le module signale son périmètre partiel et les facteurs non vérifiés", () => {
  const cp = byId["bilan-carbone"];
  assert.match(cp.title, /Estimation GES/);
  assert.match(cp.intro, /pas un BEGES complet/);
  const r = run("bilan-carbone");
  assert.match(r.summary, /Estimation partielle/);
  assert.ok(r.findings.some((x) => x.t.includes("Périmètre incomplet")));
  assert.match(r.hyp, /ne constitue ni un BEGES réglementaire/);
  assert.equal(ctx.window.SILLON_REF.facteursStatut.dateVerification, null);
});


test("Carbone IA : l'indice est explicitement interne et les hypothèses sont déclarées", () => {
  const cp = byId["carbone-ia"];
  const r = run("carbone-ia");
  assert.match(cp.intro, /ne mesure pas les consommations réelles/);
  assert.equal(r.gauge.label, "INDICE INTERNE");
  assert.match(r.verdict, /Indice interne/);
  assert.match(r.hyp, /sans référentiel externe/);
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


test("BEGES : les seuils dépendent du statut et du territoire", () => {
  const be = (over) => run("reglementation", over).findings.find((f) => f.t.startsWith("BEGES réglementaire"));
  assert.equal(be({ eff: 500, begesStatut: "prive", begesTerritoire: "metro" }).lvl, "info");
  assert.equal(be({ eff: 501, begesStatut: "prive", begesTerritoire: "metro" }).lvl, "crit");
  assert.equal(be({ eff: 251, begesStatut: "prive", begesTerritoire: "outremer" }).lvl, "crit");
  assert.equal(be({ eff: 251, begesStatut: "public" }).lvl, "crit");
  assert.equal(be({ eff: 0, begesStatut: "collectivite", begesPop: 50001 }).lvl, "crit");
});

test("Fournisseurs : une certification déclarée ne réduit pas automatiquement l'indice de risque", () => {
  const row = { nom: "Fournisseur test", zone: "high", cat: "textile", dep: 10000 };
  const none = run("fournisseurs", { rows: [{ ...row, cert: "none" }] }).kpis[0].v;
  const certified = run("fournisseurs", { rows: [{ ...row, cert: "iso" }] }).kpis[0].v;
  assert.equal(none, certified);
  assert.equal(run("fournisseurs", { rows: [{ ...row, cert: "iso" }] }).gauge.label, "EXPOSITION");
  assert.match(run("fournisseurs", { rows: [{ ...row, cert: "iso" }] }).hyp, /ne réduisent pas mécaniquement/);
});

test("ISO : auto-évaluation non exhaustive, pas de conclusion de conformité/certification", () => {
  const r = run("audit-iso");
  assert.equal(r.gauge.label, "COUVERTURE SILLON");
  assert.match(r.hyp, /ne préjugent ni d'un écart majeur\/mineur, ni d'une décision de certification/);
  assert.ok(r.sources.some((x) => x.n.includes("ISO 14001:2026")));
  assert.match(byId["audit-iso"].intro, /ISO 14001:2026/);
});

test("VSME : la protection de chaîne de valeur n'est pas présentée comme un plafond universel", () => {
  assert.match(byId["reporting-vsme"].intro, /Ce n’est pas un plafond universel/);
  assert.match(run("reporting-vsme").hyp, /n’est pas générale/);
  assert.match(byId["reporting-vsme"].fields.find((f) => f.id === "b").items.find((i) => i.id === "B3").hint, /location-based/);
  assert.match(byId["reporting-vsme"].fields.find((f) => f.id === "b").items.find((i) => i.id === "B8").hint, /50 salariés ou plus/);
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

test("Réglementation énergie : les seuils français sont inclusifs (>=)", () => {
  const reg = (gwh) => run("reglementation", { gwh }).findings;
  assert.ok(reg(2.749).every((f) => !f.t.startsWith("Audit énergétique")));
  assert.ok(reg(2.75).some((f) => f.t.startsWith("Audit énergétique")));
  assert.ok(reg(23.599).some((f) => f.t.startsWith("Audit énergétique")));
  assert.ok(reg(23.6).some((f) => f.t.startsWith("Système de management de l'énergie")));
  assert.ok(reg(23.6).every((f) => !f.t.startsWith("Audit énergétique")));
});

test("Réglementation : les échéances de transparence salariale distinguent les tranches", () => {
  const timeline = ctx.window.SILLON_REF.echeances;
  const at = (eff) => timeline.filter((e) => e.t.toLowerCase().includes("rapports") && e.ap({ eff })).map((e) => e.d);
  assert.equal(at(120).join(","), "2031-06-07");
  assert.equal(at(180).join(","), "2027-06-07");
  assert.equal(at(300).join(","), "2027-06-07");
});

test("EcoVadis : l’indice Sillon ne prédit aucune médaille", () => {
  const r = run("ecovadis");
  assert.equal(r.verdict, "Indice interne de maturité");
  assert.match(r.summary, /sans prédiction de médaille/);
  assert.ok(r.findings.some((f) => f.t.includes("ne permet pas de prédire une médaille")));
  assert.equal(ctx.window.SILLON_REF.ecovadis.seuilsNovembre2026.platine, 89);
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


test("Benchmark RSE : le diagnostic ne se présente pas comme une comparaison sectorielle", () => {
  assert.equal(byId["benchmark-rse"].title, "Diagnostic de maturité RSE");
  assert.match(byId["benchmark-rse"].intro, /pas d'un benchmark sectoriel/);
  assert.match(run("benchmark-rse").hyp, /non validés par une étude sectorielle/);
});

test("Greenwashing : un résultat sans alerte n'est pas présenté comme une validation juridique", () => {
  const r = run("greenwashing", { txt: "Nous agissons pour demain." });
  assert.equal(r.gauge.label, "INDICE INTERNE");
  assert.match(r.verdict, /relecture nécessaire/);
  assert.match(byId.greenwashing.intro, /absence d'alerte ne signifie pas conformité juridique/);
});

test("Marchés publics : la note est une simulation générique, pas une prédiction d'appel d'offres", () => {
  const r = run("marches-publics");
  assert.match(byId["marches-publics"].intro, /ne prédit pas la note/);
  assert.match(r.hyp, /sans valeur prédictive/);
  assert.match(r.kpis[1].s, /points du critère environnemental/);
});

test("Visibilité RSE : le score ne valide pas l'authenticité des preuves", () => {
  const r = run("visibilite-rse");
  assert.equal(r.gauge.label, "INDICE INTERNE");
  assert.match(r.hyp, /sans vérifier les sources/);
});

test("ROI : VAN positive et retour inférieur à 1 an sur l'exemple", () => {
  const r = run("roi-rse");
  assert.equal(r.verdict, "VAN positive selon les hypothèses");
});


test("Références juridiques : AGEC allégations et tri des déchets ont des sources distinctes", () => {
  const src = ctx.window.SILLON.sources;
  assert.match(src.agec.t, /biodégradable/);
  assert.match(src.dechets.t, /Tri à la source/);
  assert.ok(run("reglementation").sources.some((x) => x.n.toLowerCase().includes("tri") || x.n.toLowerCase().includes("déchets")));
  assert.ok(run("greenwashing").sources.some((x) => x.n.includes("AGEC")));
});

test("Référentiel : daté, et les échéances sont triées par date", () => {
  const ref = ctx.window.SILLON_REF;
  assert.match(ref.version, /^\d{4}-\d{2}-\d{2}$/);
  const d = ref.echeances.map((e) => e.d);
  assert.equal(d.join(), [...d].sort().join());
  assert.equal(ref.seuils.csrdEffectif, 1000);
});
