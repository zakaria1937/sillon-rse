/* Sillon — définitions des 12 copilotes : champs, calculs et sources. */
(function () {
  const nf = (x, d = 0) => (isFinite(x) ? Number(x).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }) : "–");
  const eur = (x) => nf(Math.round(x)) + " €";
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const num = (v, d = 0) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : d; };
  const S = {
    google: { n: "Google — énergie d'une requête Gemini", t: "Google / MIT Technology Review (août 2025) : requête texte médiane Gemini = 0,24 Wh ; 0,03 gCO2e ; 0,26 ml d'eau", url: "https://www.technologyreview.com/2025/08/21/1122288/google-gemini-ai-energy/" },
    altman: { n: "OpenAI — énergie d'une requête ChatGPT", t: "OpenAI (S. Altman, juin 2025) : ≈ 0,34 Wh par requête ChatGPT moyenne", url: "https://blog.samaltman.com/the-gentle-singularity" },
    luccioni: { n: "Luccioni et al. — énergie de la génération d'images", t: "Luccioni et al., « Power Hungry Processing » (2023) : ≈ 2,9 kWh pour 1 000 images générées", url: "https://arxiv.org/abs/2311.16863" },
    ademe: { n: "ADEME — Base Empreinte et impactCO2", t: "ADEME, Base Empreinte et impactCO2 (facteurs d'émission France)", url: "https://impactco2.fr" },
    vsme: { n: "EFRAG — norme VSME", t: "EFRAG, norme VSME (déc. 2024) et recommandation de la Commission européenne (juil. 2025)", url: "https://www.efrag.org/en/vsme" },
    omnibus: { n: "Union européenne — directive Omnibus I", t: "Directive Omnibus I, publiée au JOUE le 26/02/2026, en vigueur le 18/03/2026", url: "https://www.lw.com/en/insights/eu-sustainability-omnibus-published-in-the-official-journal" },
    ecovadis: { n: "EcoVadis — médailles et badges", t: "EcoVadis, « Understanding EcoVadis Medals and Badges » (règles 2025)", url: "https://support.ecovadis.com/hc/en-us/articles/210460227-Understanding-EcoVadis-Medals-and-Badges" },
    empco: { n: "Union européenne — directive EmpCo (2024/825)", t: "Directive (UE) 2024/825 « EmpCo » : application au 27/09/2026 (KPMG Avocats, oct. 2026)", url: "https://kpmg.com/av/fr/avocats/eclairages/2026/10/directive-empco-dite-ecgt.html" },
    agec: { n: "Légifrance — loi AGEC, décret 2022-748", t: "Loi AGEC art. 13 et décret 2022-748 : mentions « biodégradable » et « respectueux de l'environnement » interdites sur produits et emballages", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045726094" },
    climat12: { n: "Légifrance — loi Climat et résilience, décret 2022-539", t: "Loi Climat et résilience art. 12 et décret 2022-539 : encadrement des allégations de neutralité carbone", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045570611" },
    mp: { n: "Service-Public — critère environnemental des marchés publics", t: "Service-Public Entreprendre (18/08/2026) : critère et condition d'exécution environnementaux obligatoires au 21/08/2026", url: "https://entreprendre.service-public.gouv.fr/actualites/A19042" },
    fs: { n: "France Stratégie — RSE et compétitivité", t: "France Stratégie (2016), « RSE et compétitivité » : écart de performance économique d'environ 13 % en moyenne", url: "https://www.strategie.gouv.fr/publications/responsabilite-sociale-entreprises-competitivite" },
    iso: { n: "ISO — normes de systèmes de management", t: "ISO, structure harmonisée des normes de systèmes de management (Annexe SL)", url: "https://www.iso.org/management-system-standards.html" },
    beges: { n: "Ministère de la Transition écologique — BEGES", t: "Code de l'environnement art. L229-25 (BEGES) et ministère de la Transition écologique", url: "https://www.ecologie.gouv.fr/politiques-publiques/bilans-demissions-gaz-effet-serre" },
  };
  const YNP = [["1", "Oui"], ["0.5", "En partie"], ["0", "Non"]];


  /* ---------- 0. Bilan carbone ---------- */
  const FE = window.SILLON_REF.facteurs, SEUIL = window.SILLON_REF.seuils;
  const bilanC = {
    id: "bilan-carbone", fam: "mesurer", title: "Bilan carbone",
    short: "Vos émissions scopes 1, 2 et 3 avec les facteurs ADEME.",
    intro: "Un bilan simplifié à partir de vos factures et de vos volumes d'activité. Il alimente directement le point B3 de la VSME, le Benchmark et le critère environnemental des marchés publics.",
    calc: "scopes 1-2-3 · facteurs ADEME",
    icon: "flame",
    fields: [
      { type: "group", label: "Scope 1 · combustion et fuites" },
      { type: "number", id: "gaz", label: "Gaz naturel", unit: "kWh/an", def: 350000, min: 0, help: "0,227 kgCO2e/kWh" },
      { type: "number", id: "fioul", label: "Fioul domestique", unit: "L/an", def: 0, min: 0, help: "3,25 kgCO2e/L" },
      { type: "number", id: "gazole", label: "Gazole des véhicules", unit: "L/an", def: 12000, min: 0, help: "3,16 kgCO2e/L" },
      { type: "number", id: "essence", label: "Essence des véhicules", unit: "L/an", def: 2000, min: 0, help: "2,80 kgCO2e/L" },
      { type: "number", id: "clim", label: "Recharges de climatisation (R410A)", unit: "kg/an", def: 3, min: 0, help: "PRG 2 088" },
      { type: "group", label: "Scope 2 · électricité" },
      { type: "number", id: "elec", label: "Électricité consommée", unit: "kWh/an", def: 420000, min: 0, help: "0,052 kgCO2e/kWh, mix France" },
      { type: "group", label: "Scope 3 · déplacements" },
      { type: "number", id: "train", label: "Train", unit: "km/an", def: 40000, min: 0 },
      { type: "number", id: "avc", label: "Avion court et moyen courrier", unit: "km/an", def: 25000, min: 0 },
      { type: "number", id: "avl", label: "Avion long courrier", unit: "km/an", def: 30000, min: 0 },
      { type: "number", id: "voit", label: "Voiture (déplacements pro hors flotte)", unit: "km/an", def: 60000, min: 0 },
      { type: "number", id: "sal", label: "Salariés (trajets domicile-travail)", unit: "sal.", def: 140, min: 0, prof: "eff" },
      { type: "number", id: "dist", label: "Distance aller moyenne", unit: "km", def: 18, min: 0 },
      { type: "range", id: "pv", label: "Part des trajets en voiture", unit: "%", def: 70, min: 0, max: 100, step: 5 },
      { type: "number", id: "jours", label: "Jours sur site par an", unit: "j", def: 200, min: 0, max: 366 },
      { type: "group", label: "Scope 3 · achats (ratios monétaires)" },
      { type: "number", id: "aServ", label: "Services achetés", unit: "k€/an", def: 900, min: 0 },
      { type: "number", id: "rServ", label: "Ratio services", unit: "kgCO2e/k€", def: 150, min: 0, help: "Ratio indicatif : remplacez-le par celui de votre secteur." },
      { type: "number", id: "aMat", label: "Matières et biens achetés", unit: "k€/an", def: 2500, min: 0 },
      { type: "number", id: "rMat", label: "Ratio matières et biens", unit: "kgCO2e/k€", def: 700, min: 0, help: "Ratio indicatif." },
      { type: "number", id: "aNum", label: "Équipements numériques", unit: "k€/an", def: 150, min: 0 },
      { type: "number", id: "rNum", label: "Ratio numérique", unit: "kgCO2e/k€", def: 500, min: 0, help: "Ratio indicatif." },
    ],
    compute(v) {
      const k = (x) => num(v[x]);
      const P = [
        ["Gaz", 1, k("gaz") * FE.gaz], ["Fioul", 1, k("fioul") * FE.fioul], ["Carburants flotte", 1, k("gazole") * FE.gazole + k("essence") * FE.essence], ["Climatisation", 1, k("clim") * FE.r410a],
        ["Électricité", 2, k("elec") * FE.elec],
        ["Déplacements pro", 3, k("train") * FE.train + k("avc") * FE.avc + k("avl") * FE.avl + k("voit") * FE.voit],
        ["Domicile-travail", 3, k("sal") * k("dist") * 2 * k("jours") * (k("pv") / 100) * FE.voit],
        ["Achats", 3, k("aServ") * k("rServ") + k("aMat") * k("rMat") + k("aNum") * k("rNum")],
      ];
      const t = (x) => x / 1000;
      const sc = [1, 2, 3].map((s) => P.filter((p) => p[1] === s).reduce((a, p) => a + p[2], 0));
      const tot = sc[0] + sc[1] + sc[2];
      const per = k("sal") ? t(tot) / k("sal") : 0;
      const top = [...P].sort((a, b) => b[2] - a[2]);
      const F = [];
      F.push({ lvl: "crit", t: `Premier poste : ${top[0][0]} avec ${nf(t(top[0][2]))} tCO2e, soit ${nf((top[0][2] / (tot || 1)) * 100)} % du total.` });
      F.push({ lvl: sc[2] / (tot || 1) > 0.7 ? "warn" : "info", t: `Le scope 3 représente ${nf((sc[2] / (tot || 1)) * 100)} % des émissions : c'est là que se jouent les réductions.` });
      if (k("avl") * FE.avl > k("train") * FE.train * 5) F.push({ lvl: "warn", t: `L'avion pèse ${nf(t(k("avc") * FE.avc + k("avl") * FE.avl), 1)} tCO2e. Un trajet en TGV émet environ 90 fois moins par km qu'un vol court-courrier.` });
      F.push({ lvl: "info", t: `Les achats sont estimés par ratios monétaires : précision faible, à affiner avec les données de vos principaux fournisseurs.` });
      return {
        gauge: { val: Math.round(t(tot)), max: Math.max(1, Math.round(t(tot)) / Math.max(0.01, sc[2] / (tot || 1))), label: "TCO2E / AN", raw: true, show: nf(t(tot)) + " t" },
        verdict: `${nf(t(tot))} tCO2e par an`,
        summary: `Scope 1 : ${nf(t(sc[0]))} t · Scope 2 : ${nf(t(sc[1]))} t · Scope 3 : ${nf(t(sc[2]))} t. ${nf(per, 1)} tCO2e par salarié.`,
        kpis: [
          { l: "Scopes 1 et 2", v: nf(t(sc[0] + sc[1]), 1), u: "tCO2e", s: "Périmètre BEGES et VSME B3" },
          { l: "Scope 3", v: nf(t(sc[2])), u: "tCO2e", s: `${nf((sc[2] / (tot || 1)) * 100)} % du total` },
          { l: "Par salarié", v: nf(per, 1), u: "tCO2e", s: `${nf(k("sal"))} salariés` },
        ],
        chart: { type: "bars", unit: "tCO2e/an", items: P.filter((p) => p[2] > 0).map((p) => ({ l: p[0], v: t(p[2]), hot: p === top[0] })) },
        findings: F,
        actions: [
          `Bâtir un plan de réduction sur « ${top[0][0]} » et « ${top[1][0]} », qui pèsent ${nf(((top[0][2] + top[1][2]) / (tot || 1)) * 100)} % du total.`,
          "Demander à vos 10 premiers fournisseurs leur empreinte carbone pour remplacer les ratios monétaires.",
          "Fixer une politique de déplacements : train obligatoire sous 4 h de trajet.",
          "Publier les scopes 1 et 2 dans le rapport VSME (point B3).",
        ],
        hyp: "Facteurs ADEME (Base Empreinte, impactCO2) : gaz 0,227 kg/kWh ; fioul 3,25 kg/L ; gazole 3,16 kg/L ; essence 2,80 kg/L ; électricité 0,052 kg/kWh ; TGV 2,9 g/km ; avion 258 g/km (court) et 152 g/km (long, traînées incluses) ; voiture 218 g/km. Ratios monétaires indicatifs et modifiables.",
        sources: [S.ademe, S.beges, S.vsme],
      };
    },
  };

  /* ---------- 1. Carbone IA ---------- */
  const carbone = {
    id: "carbone-ia", fam: "mesurer", title: "Carbone IA",
    short: "Empreinte carbone de vos usages d'IA générative, matériel compris.",
    intro: "Estimez l'énergie et les émissions de vos requêtes texte, des requêtes longues de type « raisonnement » et des images générées, puis comparez-les au matériel acheté.",
    calc: "kWh · kgCO2e · équivalences ADEME",
    icon: "leaf",
    fields: [
      { type: "group", label: "Usages" },
      { type: "number", id: "users", label: "Collaborateurs qui utilisent l'IA", unit: "pers.", def: 25, min: 0 },
      { type: "number", id: "req", label: "Requêtes par jour et par utilisateur", unit: "req.", def: 15, min: 0 },
      { type: "range", id: "reason", label: "Part de requêtes longues ou « raisonnement »", unit: "%", def: 20, min: 0, max: 100, step: 5, help: "Analyses de documents, agents, modèles qui réfléchissent longtemps." },
      { type: "number", id: "img", label: "Images générées par mois", unit: "img.", def: 200, min: 0 },
      { type: "number", id: "days", label: "Jours travaillés par an", unit: "j", def: 220, min: 0, max: 366 },
      { type: "select", id: "host", label: "Hébergement des modèles", def: "0.45", options: [["0.45", "Non précisé ou mondial (≈ 0,45 kgCO2e/kWh)"], ["0.37", "États-Unis (≈ 0,37)"], ["0.25", "Union européenne (≈ 0,25)"], ["0.052", "France (0,052, ADEME)"]] },
      { type: "group", label: "Matériel" },
      { type: "number", id: "pcs", label: "Ordinateurs achetés pour ces usages cette année", unit: "u.", def: 2, min: 0, help: "Fabrication d'un ordinateur portable : 156 kgCO2e (ADEME)." },
    ],
    compute(v) {
      const users = num(v.users), req = num(v.req), r = clamp(num(v.reason), 0, 100) / 100, img = num(v.img), days = num(v.days), f = num(v.host, 0.45), pcs = num(v.pcs);
      const n = users * req * days;
      const kStd = (n * (1 - r) * 0.3) / 1000, kRea = (n * r * 3) / 1000, kImg = (img * 12 * 2.9) / 1000;
      const kwh = kStd + kRea + kImg;
      const kg = kwh * f, kgPc = pcs * 156, total = kg + kgPc;
      const perUser = users ? kg / users : 0;
      const hostPen = { "0.45": 12, "0.37": 10, "0.25": 5, "0.052": 0 }[String(v.host)] ?? 10;
      const score = Math.round(clamp(100 - r * 40 - Math.min(25, users ? (img / users) * 1.2 : 0) - hostPen - Math.min(20, pcs * 4), 5, 100));
      const F = [];
      if (kwh > 0 && kRea / kwh > 0.4) F.push({ lvl: "warn", t: `Les requêtes longues représentent ${nf((kRea / kwh) * 100)} % de l'énergie alors qu'elles ne pèsent que ${nf(r * 100)} % des requêtes. Réservez-les aux tâches qui en ont besoin.` });
      if (f >= 0.37) F.push({ lvl: "warn", t: `Le mix électrique de l'hébergement pèse lourd : à usage égal, un hébergement en France émettrait ${nf(f / 0.052, 1)} fois moins.` });
      if (kgPc > kg && pcs > 0) F.push({ lvl: "crit", t: `Le matériel domine : ${nf(kgPc)} kgCO2e pour ${pcs} ordinateur(s), soit ${nf(kgPc / Math.max(kg, 0.1), 1)} fois l'usage annuel de l'IA. Allonger la durée de vie des postes est le premier levier.` });
      F.push({ lvl: "info", t: `L'usage annuel de l'IA (${nf(kg, 1)} kgCO2e) équivaut à ${nf(kg / 0.218)} km en voiture thermique ou ${nf((kg / 156) * 100)} % de la fabrication d'un ordinateur portable.` });
      if (n > 0) F.push({ lvl: "ok", t: `Une requête texte standard reste sobre : environ 0,3 Wh, l'ordre de grandeur publié par Google (0,24 Wh) et OpenAI (0,34 Wh).` });
      return {
        gauge: { val: score, max: 100, label: "SOBRIÉTÉ" },
        verdict: score >= 75 ? "Usage sobre" : score >= 50 ? "Usage à optimiser" : "Usage intensif",
        summary: `${nf(total)} kgCO2e par an au total, dont ${nf(kg)} pour l'usage de l'IA et ${nf(kgPc)} pour le matériel.`,
        kpis: [
          { l: "Énergie consommée", v: nf(kwh), u: "kWh/an", s: `${nf(n)} requêtes texte/an` },
          { l: "Émissions de l'usage", v: nf(kg, 1), u: "kgCO2e/an", s: `${nf(perUser, 2)} kg par utilisateur` },
          { l: "Avec le matériel", v: nf(total), u: "kgCO2e", s: `${nf(total / 0.218)} km en voiture` },
        ],
        chart: { type: "bars", unit: "kgCO2e", items: [
          { l: "Requêtes standard", v: kStd * f }, { l: "Requêtes longues", v: kRea * f }, { l: "Images", v: kImg * f }, { l: "Matériel", v: kgPc, hot: true } ] },
        findings: F,
        actions: [
          "Fixer un modèle léger par défaut et réserver les modèles « raisonnement » aux tâches complexes.",
          "Choisir des offres hébergées en UE ou en France quand c'est possible et le demander par écrit au fournisseur.",
          "Allonger la durée de vie des postes à 5 ans minimum avant d'en acheter pour l'IA.",
          "Intégrer ce poste au scope 3 (catégorie « biens et services achetés ») de votre bilan carbone.",
        ],
        hyp: "Hypothèses : 0,3 Wh par requête standard, 3 Wh par requête longue (ordre de grandeur ×10), 2,9 Wh par image ; facteurs d'émission indiqués dans le formulaire.",
        sources: [S.google, S.altman, S.luccioni, S.ademe],
      };
    },
  };

  /* ---------- 2. Reporting VSME ---------- */
  const VS = [["ok", "Prêt"], ["part", "Partiel"], ["no", "Manquant"], ["na", "N/A"]];
  const vsmeB = [
    ["B1", "Base d'établissement", "Périmètre, filiales, option retenue", "ok"],
    ["B2", "Pratiques, politiques et initiatives de transition", "", "part"],
    ["B3", "Énergie et émissions de GES", "Consommations, scopes 1 et 2, intensité", "part"],
    ["B4", "Pollution de l'air, de l'eau et des sols", "", "na"],
    ["B5", "Biodiversité", "Sites dans ou près de zones sensibles", "no"],
    ["B6", "Eau", "Prélèvements, zones de stress hydrique", "ok"],
    ["B7", "Ressources, économie circulaire et déchets", "", "part"],
    ["B8", "Effectifs : caractéristiques générales", "Contrats, genre, pays, turnover", "ok"],
    ["B9", "Effectifs : santé et sécurité", "Accidents, décès", "ok"],
    ["B10", "Rémunération, négociation collective, formation", "", "part"],
    ["B11", "Condamnations et amendes pour corruption", "", "ok"],
  ];
  const vsmeC = [
    ["C1", "Stratégie : modèle d'affaires et durabilité", "", "no"],
    ["C2", "Description des pratiques et politiques", "", "part"],
    ["C3", "Objectifs GES et transition climatique", "", "no"],
    ["C4", "Risques climatiques", "", "no"],
    ["C5", "Effectifs : informations complémentaires", "", "part"],
    ["C6", "Droits humains : politiques et processus", "", "no"],
    ["C7", "Incidents graves en matière de droits humains", "", "ok"],
    ["C8", "Revenus de certains secteurs, exclusions des indices UE", "", "na"],
    ["C9", "Diversité de genre dans l'organe de gouvernance", "", "ok"],
  ];
  const toItems = (arr) => arr.map(([code, label, hint, def]) => ({ id: code, code, label, hint, def }));
  const vsme = {
    id: "reporting-vsme", fam: "conformer", title: "Reporting VSME",
    short: "État de préparation de votre rapport volontaire PME, point par point.",
    intro: "La VSME est le standard volontaire européen pour les PME. Depuis l'Omnibus, c'est aussi le plafond de ce que vos grands clients peuvent vous demander. Cochez où vous en êtes sur chaque point.",
    calc: "B1–B11 · C1–C9 · jours de travail",
    icon: "doc",
    fields: [
      { type: "seg", id: "mod", label: "Module visé", def: "base", options: [["base", "Base (B1–B11)"], ["full", "Base + complet (C1–C9)"]] },
      { type: "checklist", id: "b", label: "Module de base", states: VS, items: toItems(vsmeB) },
      { type: "checklist", id: "c", label: "Module complet", states: VS, items: toItems(vsmeC), showIf: { mod: "full" } },
    ],
    compute(v) {
      const items = [...vsmeB.map((x) => ({ code: x[0], label: x[1], s: (v.b || {})[x[0]] || x[3] }))];
      if (v.mod === "full") items.push(...vsmeC.map((x) => ({ code: x[0], label: x[1], s: (v.c || {})[x[0]] || x[3] })));
      const rel = items.filter((i) => i.s !== "na");
      const pts = rel.reduce((a, i) => a + (i.s === "ok" ? 1 : i.s === "part" ? 0.5 : 0), 0);
      const pct = rel.length ? Math.round((pts / rel.length) * 100) : 0;
      const miss = rel.filter((i) => i.s === "no"), part = rel.filter((i) => i.s === "part");
      const days = miss.length * 1.5 + part.length * 0.7;
      const F = [];
      const b3 = items.find((i) => i.code === "B3");
      if (b3 && b3.s !== "ok") F.push({ lvl: "crit", t: "B3 (énergie et GES) incomplet : c'est la donnée la plus demandée par les banques et les donneurs d'ordre. Priorité n°1." });
      miss.filter((i) => i.code !== "B3").forEach((i) => F.push({ lvl: "warn", t: `${i.code} · ${i.label} : à constituer.` }));
      part.filter((i) => i.code !== "B3").slice(0, 4).forEach((i) => F.push({ lvl: "info", t: `${i.code} · ${i.label} : à compléter.` }));
      if (!miss.length && !part.length) F.push({ lvl: "ok", t: "Tous les points pertinents sont prêts : vous pouvez rédiger le rapport." });
      return {
        gauge: { val: pct, max: 100, label: "PRÊT" },
        verdict: pct >= 80 ? "Rapport presque prêt" : pct >= 50 ? "À mi-parcours" : "Chantier à lancer",
        summary: `${rel.length} points pertinents : ${rel.length - miss.length - part.length} prêts, ${part.length} partiel(s), ${miss.length} manquant(s).`,
        kpis: [
          { l: "Complétude", v: pct, u: "%", s: v.mod === "full" ? "Base + complet" : "Module de base" },
          { l: "Points manquants", v: miss.length, u: "", s: `${part.length} partiels` },
          { l: "Charge estimée", v: nf(days, 1), u: "jours", s: "Hypothèse : 1,5 j par point manquant" },
        ],
        chart: { type: "bars", unit: "points", items: [
          { l: "Prêts", v: rel.length - miss.length - part.length }, { l: "Partiels", v: part.length }, { l: "Manquants", v: miss.length, hot: true }, { l: "Non pertinents", v: items.length - rel.length } ] },
        findings: F,
        actions: [
          "Désigner un responsable par point de données et une date de collecte.",
          "Commencer par B3 : relevés d'énergie sur 12 mois, puis calcul des scopes 1 et 2 avec les facteurs ADEME.",
          "Réutiliser les données RH existantes (registre du personnel, DUERP, bilan formation) pour B8 à B10.",
          "Envoyer le rapport VSME à vos clients plutôt que de remplir chaque questionnaire séparément.",
        ],
        hyp: "Charge : 1,5 jour par point manquant et 0,7 jour par point partiel, pour une PME de 20 à 250 salariés.",
        sources: [S.vsme, S.omnibus],
      };
    },
  };

  /* ---------- 3. Benchmark RSE ---------- */
  const pillars = {
    gouv: ["Gouvernance", [["g1", "Référent RSE nommé"], ["g2", "Feuille de route avec objectifs datés"], ["g3", "RSE à l'ordre du jour du comité de direction"], ["g4", "Dialogue formalisé avec les parties prenantes"]]],
    env: ["Environnement", [["e1", "Bilan GES réalisé (scopes 1, 2 et 3)"], ["e2", "Objectif de réduction chiffré"], ["e3", "Suivi mensuel des consommations d'énergie"], ["e4", "Tri des déchets 7 flux et biodéchets"]]],
    soc: ["Social", [["s1", "Plan de formation suivi en heures par salarié"], ["s2", "DUERP à jour et accidents analysés"], ["s3", "Démarche égalité femmes-hommes"], ["s4", "Mesure de la qualité de vie au travail"]]],
    eth: ["Éthique", [["t1", "Code de conduite diffusé"], ["t2", "Dispositif d'alerte opérationnel"], ["t3", "Conformité RGPD documentée"], ["t4", "Formation anticorruption des personnes exposées"]]],
    ach: ["Achats", [["a1", "Charte achats responsables signée par les fournisseurs"], ["a2", "Critères RSE dans les consultations"], ["a3", "Cartographie des risques fournisseurs"], ["a4", "Délais de paiement suivis"]]],
  };
  const bdef = { g1: "1", g2: "0.5", g3: "0", g4: "0", e1: "0.5", e2: "0", e3: "1", e4: "1", s1: "1", s2: "1", s3: "0.5", s4: "0", t1: "0.5", t2: "0", t3: "1", t4: "0", a1: "0", a2: "0.5", a3: "0", a4: "1" };
  const bench = {
    id: "benchmark-rse", fam: "mesurer", title: "Benchmark RSE",
    short: "Votre maturité sur 5 piliers, face à une grille de référence.",
    intro: "Vingt pratiques concrètes réparties en cinq piliers. Le résultat vous situe sur une grille de maturité en trois paliers : Démarrage, Structuré, Avancé.",
    calc: "5 piliers · radar · paliers",
    icon: "chart",
    fields: [
      { type: "select", id: "sect", label: "Secteur", def: "Industrie", prof: "secteur", options: [["Industrie", "Industrie"], ["Services", "Services aux entreprises"], ["BTP", "BTP"], ["Commerce", "Commerce et distribution"], ["Numérique", "Numérique"], ["Transport", "Transport et logistique"], ["Agroalimentaire", "Agroalimentaire"]] },
      ...Object.entries(pillars).map(([k, [lab, items]]) => ({ type: "checklist", id: k, label: lab, states: YNP, items: items.map(([id, label]) => ({ id, label, def: bdef[id] })) })),
    ],
    compute(v) {
      const res = Object.entries(pillars).map(([k, [lab, items]]) => {
        const s = items.reduce((a, [id]) => a + num((v[k] || {})[id] ?? bdef[id]), 0) / items.length;
        return { k, lab, s: Math.round(s * 100), gaps: items.filter(([id]) => num((v[k] || {})[id] ?? bdef[id]) < 1).map(([, l]) => l) };
      });
      const avg = Math.round(res.reduce((a, r) => a + r.s, 0) / res.length);
      const stage = avg >= 80 ? "Avancé" : avg >= 55 ? "Structuré" : avg >= 25 ? "Démarrage" : "Initial";
      const sorted = [...res].sort((a, b) => a.s - b.s);
      const F = [];
      sorted.slice(0, 2).forEach((r) => F.push({ lvl: r.s < 40 ? "crit" : "warn", t: `${r.lab} (${r.s}/100) : ${r.gaps.slice(0, 2).join(" ; ")}.` }));
      const best = sorted[sorted.length - 1];
      F.push({ lvl: "ok", t: `Point fort : ${best.lab} (${best.s}/100). Mettez-le en avant dans vos réponses clients.` });
      return {
        gauge: { val: avg, max: 100, label: "MATURITÉ" },
        verdict: `Palier ${stage}`,
        summary: `Score moyen ${avg}/100 dans le secteur ${v.sect || "Industrie"}. Palier suivant : ${avg >= 80 ? "maintenir et prouver" : avg >= 55 ? "Avancé à 80" : "Structuré à 55"}.`,
        kpis: res.map((r) => ({ l: r.lab, v: r.s, u: "/100", s: r.s >= 80 ? "Avancé" : r.s >= 55 ? "Structuré" : r.s >= 25 ? "Démarrage" : "Initial" })),
        chart: { type: "radar", axes: res.map((r) => r.lab), values: res.map((r) => r.s), rings: [[25, "Démarrage"], [55, "Structuré"], [80, "Avancé"]] },
        findings: F,
        actions: sorted.slice(0, 3).map((r) => `${r.lab} : traiter « ${r.gaps[0] || "consolider les preuves"} » dans les 90 jours.`),
        hyp: "Grille Sillon : Oui = 1, En partie = 0,5, Non = 0. Les paliers sont des repères de maturité, pas des moyennes sectorielles mesurées.",
        sources: [S.vsme, S.ecovadis],
      };
    },
  };

  /* ---------- 4. Fournisseurs ---------- */
  const ZONES = [["fr", "France", 1], ["ue", "Union européenne", 1.5], ["ocde", "OCDE hors UE", 2.5], ["mod", "Hors OCDE, risque modéré", 3.5], ["high", "Hors OCDE, risque élevé", 5]];
  const CATS = [["textile", "Textile, habillement", 5], ["elec", "Électronique", 4.5], ["agro", "Agroalimentaire", 4], ["chim", "Chimie, plastiques", 4], ["btp", "Matériaux, BTP", 3.5], ["energie", "Énergie", 3], ["transport", "Transport, logistique", 3], ["emb", "Emballages", 3], ["mob", "Mobilier, fournitures", 3], ["num", "Services numériques", 2], ["intel", "Services intellectuels", 1.5]];
  const CERTS = [["none", "Aucune", 1], ["iso", "ISO 14001", 0.8], ["eco", "Médaille EcoVadis", 0.7], ["sa", "SA8000 / amfori BSCI", 0.75]];
  const lk = (arr, k) => arr.find((x) => x[0] === k) || arr[0];
  const fourn = {
    id: "fournisseurs", fam: "mesurer", title: "Fournisseurs",
    short: "Cartographie des risques RSE de vos achats, pondérée par la dépense.",
    intro: "Listez vos principaux fournisseurs. Le risque combine la zone géographique, la catégorie d'achat et les certifications, puis il est pondéré par le montant dépensé.",
    calc: "risque pays × catégorie × dépense",
    icon: "truck",
    fields: [
      { type: "table", id: "rows", label: "Vos fournisseurs", columns: [
        { id: "nom", label: "Fournisseur", type: "text" },
        { id: "zone", label: "Zone", type: "select", options: ZONES.map((z) => [z[0], z[1]]) },
        { id: "cat", label: "Catégorie", type: "select", options: CATS.map((c) => [c[0], c[1]]) },
        { id: "dep", label: "Dépense €/an", type: "number" },
        { id: "cert", label: "Certification", type: "select", options: CERTS.map((c) => [c[0], c[1]]) } ],
        def: [
          { nom: "Atelier de confection", zone: "high", cat: "textile", dep: 42000, cert: "none" },
          { nom: "Cartes électroniques", zone: "mod", cat: "elec", dep: 65000, cert: "iso" },
          { nom: "Transporteur régional", zone: "fr", cat: "transport", dep: 38000, cert: "none" },
          { nom: "Emballages carton", zone: "ue", cat: "emb", dep: 21000, cert: "eco" },
          { nom: "Résines et colles", zone: "ocde", cat: "chim", dep: 30000, cert: "none" },
          { nom: "Expert-comptable", zone: "fr", cat: "intel", dep: 18000, cert: "none" } ] },
    ],
    compute(v) {
      const rows = (v.rows || []).filter((r) => r && (r.nom || num(r.dep)));
      const tot = rows.reduce((a, r) => a + num(r.dep), 0) || 1;
      const sc = rows.map((r) => {
        const z = lk(ZONES, r.zone), c = lk(CATS, r.cat), ce = lk(CERTS, r.cert);
        const risk = Math.round(((z[2] * c[2]) / 25) * 100 * ce[2]);
        return { nom: r.nom || "Sans nom", risk, dep: num(r.dep), share: num(r.dep) / tot, z: z[1], c: c[1], cert: ce[0] };
      });
      const w = Math.round(sc.reduce((a, s) => a + s.risk * s.share, 0));
      const hi = sc.filter((s) => s.risk >= 50);
      const hiShare = hi.reduce((a, s) => a + s.share, 0);
      const top = [...sc].sort((a, b) => b.risk * b.share - a.risk * a.share);
      const F = top.slice(0, 3).map((s) => ({ lvl: s.risk >= 50 ? "crit" : s.risk >= 25 ? "warn" : "ok", t: `${s.nom} : risque ${s.risk}/100 (${s.c}, ${s.z}), ${nf(s.share * 100)} % de la dépense${s.cert === "none" ? ", sans certification" : ""}.` }));
      if (!sc.length) F.push({ lvl: "info", t: "Ajoutez au moins un fournisseur pour lancer l'analyse." });
      return {
        gauge: { val: 100 - w, max: 100, label: "MAÎTRISE" },
        verdict: w >= 45 ? "Exposition élevée" : w >= 25 ? "Exposition modérée" : "Exposition contenue",
        summary: `${sc.length} fournisseurs, ${eur(tot)} de dépenses. ${nf(hiShare * 100)} % de la dépense est à risque élevé.`,
        kpis: [
          { l: "Risque pondéré", v: w, u: "/100", s: "Pondéré par la dépense" },
          { l: "Dépense à risque élevé", v: nf(hiShare * 100), u: "%", s: `${hi.length} fournisseur(s)` },
          { l: "Dépense analysée", v: nf(tot / 1000), u: "k€", s: `${sc.filter((s) => s.cert !== "none").length} certifié(s)` },
        ],
        chart: { type: "matrix", xl: "Risque RSE", yl: "Part de la dépense", points: sc.map((s) => ({ l: s.nom, x: s.risk, y: s.share * 100 })) },
        findings: F,
        actions: [
          "Envoyer un questionnaire RSE court aux fournisseurs du quadrant « risque élevé, dépense forte ».",
          "Ajouter une clause RSE (droits humains, environnement, droit d'audit) aux contrats renouvelés cette année.",
          "Demander une preuve datée : certificat ISO 14001, scorecard EcoVadis ou audit social.",
          "Rechercher une alternative européenne pour les catégories textile et électronique les plus exposées.",
        ],
        hyp: "Risque = (zone 1 à 5 × catégorie 1,5 à 5) / 25, réduit de 20 à 30 % si certifié. Grille indicative à affiner avec un audit.",
        sources: [S.omnibus, S.ecovadis],
      };
    },
  };

  /* ---------- 5. Réglementation ---------- */
  const regl = {
    id: "reglementation", fam: "conformer", title: "Réglementation",
    short: "Les obligations RSE qui s'appliquent vraiment à votre entreprise.",
    intro: "Renseignez la taille et l'activité de l'entreprise. Le copilote applique les seuils en vigueur en novembre 2026, Omnibus inclus.",
    calc: "16 textes · seuils 2026",
    icon: "scale",
    fields: [
      { type: "number", id: "eff", label: "Salariés en France", unit: "sal.", def: 140, min: 0, prof: "eff" },
      { type: "number", id: "effM", label: "Salariés du groupe dans le monde", unit: "sal.", def: 140, min: 0, prof: "effM" },
      { type: "number", id: "ca", label: "Chiffre d'affaires", unit: "M€", def: 28, min: 0, prof: "ca" },
      { type: "number", id: "surf", label: "Surface tertiaire (bureaux, commerces)", unit: "m²", def: 1200, min: 0, prof: "surf" },
      { type: "number", id: "gwh", label: "Consommation d'énergie annuelle", unit: "GWh", def: 3.1, min: 0, step: 0.1, prof: "gwh" },
      { type: "seg", id: "mp", label: "Vous répondez à des marchés publics", def: "oui", prof: "mp", options: [["oui", "Oui"], ["non", "Non"]] },
      { type: "seg", id: "b2c", label: "Vous communiquez des arguments écologiques", def: "oui", prof: "b2c", options: [["oui", "Oui"], ["non", "Non"]] },
    ],
    compute(v) {
      const e = num(v.eff), em = Math.max(num(v.effM), e), ca = num(v.ca), surf = num(v.surf), g = num(v.gwh);
      const L = [];
      const add = (st, name, t) => L.push({ st, name, t });
      add("oblig", "DUERP", "Document unique d'évaluation des risques, obligatoire dès le 1er salarié.");
      add("oblig", "Loi AGEC : tri des déchets", "Tri 7 flux (papier, métal, plastique, verre, bois, minéraux, textiles) et biodéchets.");
      if (e >= 20) add("oblig", "Emploi des travailleurs handicapés", "Obligation de 6 % de l'effectif (dès 20 salariés).");
      if (e >= 50) add("oblig", "Index égalité professionnelle", "Publication annuelle avant le 1er mars (dès 50 salariés).");
      if (e >= 50) add("verif", "Mobilité des salariés", "Thème obligatoire de la négociation annuelle si 50 salariés sur un même site.");
      if (e >= 100) add("verif", "Transparence salariale (directive 2023/970)", "Transposition française à suivre : rapports d'écart de rémunération à partir de 100 salariés.");
      if (e >= 300) add("oblig", "Bilan social", "Annuel, dès 300 salariés.");
      if (e > SEUIL.begesEffectif) add("oblig", "BEGES réglementaire", "Bilan des émissions tous les 4 ans et plan de transition (plus de 500 salariés).");
      else add("info", "BEGES réglementaire", "Non obligatoire sous 501 salariés : un bilan volontaire reste attendu par les clients.");
      if (e >= SEUIL.sapin2Effectif && ca > SEUIL.sapin2CA) add("oblig", "Loi Sapin II", "Programme anticorruption (500 salariés et 100 M€ de CA).");
      if (e >= 1000) add("oblig", "Loi Rixain", "Quotas de femmes parmi les cadres dirigeants (dès 1 000 salariés).");
      if (e >= 5000 || em >= 10000) add("oblig", "Devoir de vigilance", "Plan de vigilance publié (5 000 salariés en France ou 10 000 dans le monde).");
      if (em > SEUIL.csrdEffectif && ca > SEUIL.csrdCA) add("oblig", "CSRD", "Dans le champ après l'Omnibus (plus de 1 000 salariés et plus de 450 M€ de CA).");
      else add("info", "CSRD", "Hors champ depuis l'Omnibus. Vos clients ne peuvent pas exiger plus que le niveau VSME.");
      if (em > SEUIL.csdddEffectif && ca > SEUIL.csdddCA) add("oblig", "CSDDD", "Devoir de vigilance européen, conformité au 26/07/2029.");
      if (surf >= SEUIL.tertiaireSurface) add("oblig", "Décret tertiaire", "Réduction des consommations de -40 % en 2030, déclaration annuelle sur OPERAT.");
      if (g > SEUIL.smeEnergieGWh) add("oblig", "Système de management de l'énergie", "ISO 50001 au-delà d'environ 23,6 GWh/an (transposition de la directive efficacité énergétique).");
      else if (g > SEUIL.auditEnergieGWh) add("verif", "Audit énergétique", "Audit tous les 4 ans au-delà d'environ 2,75 GWh/an, selon la loi DDADUE 2025 : calendrier à confirmer.");
      if (v.mp === "oui") add("oblig", "Marchés publics", "Depuis le 21/08/2026 : au moins un critère d'attribution et une condition d'exécution environnementaux.");
      if (v.b2c === "oui") add("oblig", "Allégations environnementales", "Directive EmpCo applicable depuis le 27/09/2026 ; le droit français sanctionne déjà les pratiques trompeuses.");
      const ob = L.filter((x) => x.st === "oblig"), vf = L.filter((x) => x.st === "verif");
      const lv = { oblig: "crit", verif: "warn", info: "info" };
      return {
        gauge: { val: ob.length, max: 16, label: "OBLIGATIONS", raw: true },
        verdict: `${ob.length} obligations applicables`,
        summary: `${ob.length} obligations, ${vf.length} à vérifier, ${L.length - ob.length - vf.length} hors champ ou volontaires.`,
        kpis: [
          { l: "Applicables", v: ob.length, u: "", s: "À respecter dès maintenant" },
          { l: "À vérifier", v: vf.length, u: "", s: "Seuils ou calendrier à confirmer" },
          { l: "Taille retenue", v: nf(e), u: "sal.", s: `${nf(ca)} M€ de CA` },
        ],
        chart: null,
        findings: L.map((x) => ({ lvl: lv[x.st], tag: x.st === "oblig" ? "Obligatoire" : x.st === "verif" ? "À vérifier" : "Hors champ", t: `${x.name} : ${x.t}` })),
        actions: [
          "Inscrire chaque obligation dans un calendrier de conformité avec un responsable.",
          "Vérifier les seuils au niveau de l'entité juridique et du groupe avec votre expert-comptable.",
          "Mettre en place une veille réglementaire trimestrielle (transpositions EmpCo et transparence salariale en cours).",
        ],
        hyp: "Seuils simplifiés : certains textes s'apprécient par établissement, sur deux exercices consécutifs ou avec le bilan. Ceci n'est pas un avis juridique.",
        sources: [S.omnibus, S.beges, S.mp, S.empco],
      };
    },
  };

  /* ---------- 6. EcoVadis ---------- */
  const EV = [["0", "Rien"], ["1", "Basique"], ["2", "Structuré"], ["3", "Avancé"]];
  const evInd = [["pol", "Politiques formalisées", "Engagements écrits, objectifs, responsable"], ["act", "Actions déployées", "Mesures concrètes et couverture du périmètre"], ["kpi", "Résultats chiffrés", "Indicateurs suivis et publiés"], ["cert", "Certifications et reporting", "ISO, labels, rapport RSE"]];
  const evThemes = { env: ["Environnement", { pol: "2", act: "2", kpi: "1", cert: "1" }], lab: ["Social et droits humains", { pol: "2", act: "2", kpi: "2", cert: "1" }], eth: ["Éthique", { pol: "1", act: "1", kpi: "0", cert: "0" }], sup: ["Achats responsables", { pol: "1", act: "0", kpi: "0", cert: "0" }] };
  const W = { Industrie: [3, 2, 2, 1], Services: [1, 3, 2, 1], Commerce: [2, 2, 2, 3], BTP: [2, 3, 2, 2], Numérique: [2, 3, 2, 1], Transport: [3, 2, 2, 1], Agroalimentaire: [3, 2, 2, 2] };
  const ecov = {
    id: "ecovadis", fam: "conformer", title: "EcoVadis",
    short: "Estimation de votre score et de la médaille atteignable.",
    intro: "Évaluez vos pratiques sur les quatre thèmes EcoVadis. Le copilote estime le score, la pondération de votre secteur et la médaille visée.",
    calc: "4 thèmes · pondération · médailles 2025",
    icon: "medal",
    fields: [
      { type: "select", id: "sect", label: "Secteur", def: "Industrie", prof: "secteur", options: Object.keys(W).map((k) => [k, k]) },
      ...Object.entries(evThemes).map(([k, [lab, d]]) => ({ type: "checklist", id: k, label: lab, states: EV, items: evInd.map(([id, label, hint]) => ({ id, label, hint, def: d[id] })) })),
    ],
    compute(v) {
      const w = W[v.sect] || W.Industrie;
      const th = Object.entries(evThemes).map(([k, [lab, d]], i) => {
        const s = evInd.reduce((a, [id]) => a + num((v[k] || {})[id] ?? d[id]), 0);
        return { lab, sc: Math.round(15 + (s / 12) * 80), w: w[i] };
      });
      const tot = Math.round(th.reduce((a, t) => a + t.sc * t.w, 0) / th.reduce((a, t) => a + t.w, 0));
      const blocked = th.filter((t) => t.sc < 30);
      let medal = "Aucune médaille";
      if (!blocked.length) medal = tot >= 81 ? "Platine probable" : tot >= 73 ? "Or probable" : tot >= 66 ? "Argent probable" : tot >= 58 ? "Bronze probable" : tot >= 45 ? "Badge « Committed »" : "Aucune médaille";
      const next = [[58, "Bronze"], [66, "Argent"], [73, "Or"], [81, "Platine"]].find(([s]) => s > tot);
      const F = [];
      blocked.forEach((t) => F.push({ lvl: "crit", t: `${t.lab} : ${t.sc}/100. Sous 30 sur un thème, aucune médaille n'est possible.` }));
      [...th].sort((a, b) => a.sc * b.w - b.sc * a.w).slice(0, 2).forEach((t) => !blocked.includes(t) && F.push({ lvl: "warn", t: `${t.lab} (${t.sc}/100, poids ${t.w}) : thème prioritaire pour gagner des points.` }));
      if (next) F.push({ lvl: "info", t: `Il manque environ ${next[0] - tot} points pour viser le ${next[1]} (seuil indicatif ${next[0]}).` });
      return {
        gauge: { val: tot, max: 100, label: "SCORE EST." },
        verdict: medal,
        summary: `Score estimé ${tot}/100 pour le secteur ${v.sect || "Industrie"}. Les médailles se décident au percentile, sur 12 mois glissants.`,
        kpis: th.map((t) => ({ l: t.lab, v: t.sc, u: "/100", s: `Poids ${t.w}` })),
        chart: { type: "radar", axes: th.map((t) => t.lab), values: th.map((t) => t.sc), rings: [[30, "Seuil 30"], [58, "Bronze"], [73, "Or"]] },
        findings: F,
        actions: [
          "Formaliser une politique signée par la direction pour chaque thème : c'est le premier critère noté.",
          "Joindre des preuves datées (procédures, rapports, certificats) : sans document, l'action n'est pas comptée.",
          "Publier au moins deux indicateurs chiffrés par thème avec leur évolution sur deux ans.",
          "Lancer une charte achats responsables : le thème Achats est souvent le plus faible des PME.",
        ],
        hyp: "Médailles 2025 : Platine top 1 %, Or top 5 %, Argent top 15 %, Bronze top 35 %. Seuils de score indicatifs EcoVadis au 1/07/2024 : 81, 73, 66, 58. Estimation non officielle.",
        sources: [S.ecovadis],
      };
    },
  };

  /* ---------- 7. Audit ISO ---------- */
  const ISOS = [["ok", "Conforme"], ["part", "Partiel"], ["nc", "Non conforme"]];
  const hls = (spec) => [
    ["4.1", "Contexte et parties intéressées analysés", "ok"], ["4.3", "Domaine d'application défini", "ok"], ["5.2", "Politique signée par la direction", "ok"], ["5.3", "Rôles et responsabilités attribués", "part"],
    spec[0], ["6.1.3", "Veille et obligations de conformité", "part"], ["6.2", "Objectifs mesurables et plans d'action", "part"], ["7.2", "Compétences et formations tracées", "ok"],
    ["7.5", "Informations documentées maîtrisées", "part"], ["8.1", "Maîtrise opérationnelle", "part"], spec[1], ["9.1", "Surveillance, mesure et évaluation", "part"],
    ["9.2", "Audit interne réalisé", "nc"], ["9.3", "Revue de direction tenue", "nc"], ["10.2", "Non-conformités et actions correctives", "part"],
  ].map(([code, label, def]) => ({ id: code, code, label, def }));
  const isoLists = {
    "14001": hls([["6.1.2", "Aspects environnementaux significatifs identifiés", "part"], ["8.2", "Préparation aux situations d'urgence", "ok"]]),
    "45001": hls([["6.1.2", "Dangers identifiés et risques évalués", "ok"], ["8.2", "Préparation aux situations d'urgence", "part"]]),
    "50001": hls([["6.3", "Revue énergétique et usages significatifs", "part"], ["6.4", "Indicateurs et situation énergétique de référence", "nc"]]),
  };
  const isoA = {
    id: "audit-iso", fam: "conformer", title: "Audit ISO",
    short: "Audit interne guidé, clause par clause, avant la certification.",
    intro: "Passez en revue les exigences clés de la norme choisie. Le copilote calcule votre taux de conformité et signale les écarts bloquants pour l'audit de certification.",
    calc: "15 clauses · écarts bloquants",
    icon: "clip",
    fields: [
      { type: "seg", id: "norme", label: "Norme", def: "14001", options: [["14001", "ISO 14001"], ["45001", "ISO 45001"], ["50001", "ISO 50001"]] },
      { type: "checklist", id: "c14001", label: "ISO 14001 · management environnemental", states: ISOS, items: isoLists["14001"], showIf: { norme: "14001" } },
      { type: "checklist", id: "c45001", label: "ISO 45001 · santé et sécurité au travail", states: ISOS, items: isoLists["45001"], showIf: { norme: "45001" } },
      { type: "checklist", id: "c50001", label: "ISO 50001 · management de l'énergie", states: ISOS, items: isoLists["50001"], showIf: { norme: "50001" } },
    ],
    compute(v) {
      const n = v.norme || "14001", list = isoLists[n], st = v["c" + n] || {};
      const it = list.map((x) => ({ ...x, s: st[x.id] || x.def }));
      const pct = Math.round((it.reduce((a, x) => a + (x.s === "ok" ? 1 : x.s === "part" ? 0.5 : 0), 0) / it.length) * 100);
      const nc = it.filter((x) => x.s === "nc"), pa = it.filter((x) => x.s === "part");
      const crit = ["9.2", "9.3", "6.1.3", "5.2"];
      const blk = nc.filter((x) => crit.includes(x.code));
      const ready = pct >= 85 && !blk.length;
      const F = [];
      blk.forEach((x) => F.push({ lvl: "crit", t: `§${x.code} ${x.label} : écart majeur probable, il bloque la certification.` }));
      nc.filter((x) => !blk.includes(x)).forEach((x) => F.push({ lvl: "crit", t: `§${x.code} ${x.label} : non conforme.` }));
      pa.slice(0, 4).forEach((x) => F.push({ lvl: "warn", t: `§${x.code} ${x.label} : à compléter (écart mineur probable).` }));
      if (!nc.length && !pa.length) F.push({ lvl: "ok", t: "Aucun écart déclaré : planifiez un audit à blanc par un tiers." });
      return {
        gauge: { val: pct, max: 100, label: "CONFORMITÉ" },
        verdict: ready ? "Prêt pour l'audit à blanc" : blk.length ? "Écarts bloquants" : "En préparation",
        summary: `ISO ${n} : ${it.length - nc.length - pa.length} clauses conformes, ${pa.length} partielles, ${nc.length} non conformes.`,
        kpis: [
          { l: "Conformité", v: pct, u: "%", s: "Objectif : 85 % et plus" },
          { l: "Écarts bloquants", v: blk.length, u: "", s: "Audit interne, revue, veille, politique" },
          { l: "Délai estimé", v: ready ? "1–2" : blk.length ? "6–9" : "3–6", u: "mois", s: "Avant l'audit de certification" },
        ],
        chart: { type: "bars", unit: "clauses", items: [{ l: "Conformes", v: it.length - nc.length - pa.length }, { l: "Partielles", v: pa.length }, { l: "Non conformes", v: nc.length, hot: true }] },
        findings: F,
        actions: [
          "Planifier l'audit interne complet (§9.2) au moins 2 mois avant la certification.",
          "Tenir une revue de direction formalisée avec compte rendu (§9.3).",
          "Ouvrir une fiche d'action corrective par écart, avec pilote et échéance.",
        ],
        hyp: "Structure harmonisée ISO (Annexe SL). Délais indicatifs pour une PME de 50 à 250 salariés.",
        sources: [S.iso],
      };
    },
  };

  /* ---------- 8. Marchés publics ---------- */
  const mpItems = [
    ["bilan", "Empreinte carbone de l'offre chiffrée", 3, "1", "Empreinte carbone"], ["kpi", "Engagements chiffrés suivis pendant l'exécution", 3, "0", "Engagements suivis"],
    ["mat", "Produits ou matériaux recyclés, réemployés, biosourcés", 2, "0.5", "Matériaux"], ["log", "Logistique et déplacements bas carbone", 2, "0.5", "Logistique"],
    ["dech", "Réduction et reprise des déchets et emballages", 2, "1", "Déchets"], ["lab", "Labels ou certifications (ISO 14001, Écolabel…)", 2, "0", "Labels"],
    ["vie", "Durabilité, réparabilité, fin de vie", 2, "0.5", "Durabilité"], ["preuve", "Preuves jointes (fiches, attestations, rapports)", 2, "0", "Preuves"], ["soc", "Clause sociale : heures d'insertion, emploi local", 2, "0.5", "Clause sociale"],
  ];
  const mp = {
    id: "marches-publics", fam: "convaincre", title: "Marchés publics",
    short: "Votre note probable sur le critère environnemental, devenu obligatoire.",
    intro: "Depuis le 21 août 2026, chaque marché public comporte au moins un critère environnemental et une condition d'exécution environnementale. Estimez votre note et les points que vous laissez sur la table.",
    calc: "note /20 · points perdus",
    icon: "bank",
    fields: [
      { type: "range", id: "w", label: "Poids du critère environnemental dans le règlement", unit: "%", def: 15, min: 5, max: 40, step: 5 },
      { type: "number", id: "nb", label: "Consultations visées par an", unit: "AO", def: 12, min: 0 },
      { type: "number", id: "ticket", label: "Montant moyen d'un marché", unit: "€", def: 80000, min: 0 },
      { type: "checklist", id: "ev", label: "Ce que contient votre mémoire technique", states: YNP, items: mpItems.map(([id, label, w, def]) => ({ id, label, hint: `${w} points sur 20`, def })) },
    ],
    compute(v) {
      const w = num(v.w, 15), st = v.ev || {};
      const it = mpItems.map(([id, label, p, def, sh]) => ({ label, sh, p, s: num(st[id] ?? def) }));
      const note = it.reduce((a, x) => a + x.p * x.s, 0);
      const pts = (note / 20) * w, lost = w - pts;
      const miss = it.filter((x) => x.s < 1).sort((a, b) => b.p * (1 - b.s) - a.p * (1 - a.s));
      const F = miss.slice(0, 4).map((x) => ({ lvl: x.s === 0 ? "crit" : "warn", t: `${x.label} : +${nf(x.p * (1 - x.s), 1)} pt sur 20 possible.` }));
      F.push({ lvl: "info", t: "La condition d'exécution environnementale est contractuelle : un manquement peut entraîner des pénalités ou une résiliation." });
      return {
        gauge: { val: Math.round((note / 20) * 100), max: 100, label: "NOTE ENV.", show: nf(note, 1) + "/20" },
        verdict: note >= 15 ? "Offre différenciante" : note >= 10 ? "Offre dans la moyenne" : "Offre fragile",
        summary: `Note environnementale estimée ${nf(note, 1)}/20, soit ${nf(pts, 1)} points sur les ${w} du critère.`,
        kpis: [
          { l: "Note estimée", v: nf(note, 1), u: "/20", s: "Critère environnemental" },
          { l: "Points perdus", v: nf(lost, 1), u: "pts", s: `Sur 100 points de notation` },
          { l: "Volume en jeu", v: nf((num(v.nb) * num(v.ticket)) / 1000), u: "k€/an", s: `${nf(num(v.nb))} consultations` },
        ],
        chart: { type: "bars", unit: "pts /20", items: it.map((x) => ({ l: x.sh, v: x.p * x.s, max: x.p })) },
        findings: F,
        actions: [
          "Créer un bloc environnemental réutilisable pour le mémoire technique, avec chiffres et preuves.",
          "Proposer 2 ou 3 indicateurs suivis pendant l'exécution, avec un reporting trimestriel à l'acheteur.",
          "Calculer l'empreinte carbone d'une offre type (transport, matériaux, déchets) une fois, puis l'adapter.",
        ],
        hyp: "Barème Sillon sur 20 points, inspiré des pratiques d'acheteurs publics. Chaque règlement de consultation fixe ses propres sous-critères.",
        sources: [S.mp],
      };
    },
  };

  /* ---------- 9. ROI de la RSE ---------- */
  const roi = {
    id: "roi-rse", fam: "convaincre", title: "ROI de la RSE",
    short: "Ce que vos actions rapportent en euros, avec retour sur investissement.",
    intro: "Chiffrez les gains d'une démarche RSE : énergie, déchets, fidélisation des salariés et chiffre d'affaires préservé auprès des clients exigeants.",
    calc: "gains/an · VAN 5 ans · retour",
    icon: "trend",
    fields: [
      { type: "number", id: "inv", label: "Investissement initial", unit: "€", def: 45000, min: 0 },
      { type: "number", id: "run", label: "Coût annuel de la démarche", unit: "€/an", def: 8000, min: 0, help: "Temps interne, abonnements, audits." },
      { type: "group", label: "Énergie et déchets" },
      { type: "number", id: "en", label: "Facture d'énergie", unit: "€/an", def: 120000, min: 0 },
      { type: "range", id: "enr", label: "Baisse visée", unit: "%", def: 12, min: 0, max: 40 },
      { type: "number", id: "wa", label: "Coût de gestion des déchets", unit: "€/an", def: 25000, min: 0 },
      { type: "range", id: "war", label: "Baisse visée", unit: "%", def: 15, min: 0, max: 50 },
      { type: "group", label: "Salariés" },
      { type: "number", id: "eff", label: "Effectif", unit: "sal.", def: 80, min: 0, prof: "eff" },
      { type: "number", id: "dep", label: "Coût d'un départ (recrutement, intégration)", unit: "€", def: 15000, min: 0 },
      { type: "range", id: "turn", label: "Baisse du turnover visée", unit: "pts", def: 2, min: 0, max: 10, step: 0.5 },
      { type: "group", label: "Clients" },
      { type: "number", id: "ca", label: "Chiffre d'affaires", unit: "€", def: 12000000, min: 0, prof: "ca", profMul: 1000000 },
      { type: "range", id: "exig", label: "Part du CA chez des clients qui exigent des preuves RSE", unit: "%", def: 25, min: 0, max: 100, step: 5 },
      { type: "range", id: "perte", label: "Risque de perte de ces clients sans démarche", unit: "%", def: 5, min: 0, max: 50 },
      { type: "range", id: "marge", label: "Marge sur coûts variables", unit: "%", def: 30, min: 0, max: 80 },
    ],
    compute(v) {
      const gEn = num(v.en) * num(v.enr) / 100, gWa = num(v.wa) * num(v.war) / 100;
      const gRh = num(v.eff) * num(v.turn) / 100 * num(v.dep);
      const gCl = num(v.ca) * num(v.exig) / 100 * num(v.perte) / 100 * num(v.marge) / 100;
      const gross = gEn + gWa + gRh + gCl, net = gross - num(v.run), inv = num(v.inv);
      let van = -inv; for (let y = 1; y <= 5; y++) van += net / Math.pow(1.05, y);
      const pb = net > 0 ? inv / net : Infinity;
      const F = [];
      const parts = [["Énergie", gEn], ["Déchets", gWa], ["Fidélisation", gRh], ["Clients préservés", gCl]].sort((a, b) => b[1] - a[1]);
      F.push({ lvl: "ok", t: `Premier levier : ${parts[0][0]} avec ${eur(parts[0][1])} par an (${nf((parts[0][1] / (gross || 1)) * 100)} % des gains).` });
      if (net <= 0) F.push({ lvl: "crit", t: "Les gains annuels ne couvrent pas le coût de fonctionnement : revoyez le périmètre ou les objectifs." });
      else if (pb > 4) F.push({ lvl: "warn", t: `Retour sur investissement long (${nf(pb, 1)} ans) : commencez par les actions sans investissement.` });
      F.push({ lvl: "info", t: "France Stratégie a mesuré un écart de performance d'environ 13 % en moyenne en faveur des entreprises engagées en RSE." });
      return {
        gauge: { val: isFinite(pb) ? Math.round(clamp((5 - pb) / 5, 0, 1) * 100) : 0, max: 100, label: "RETOUR", show: isFinite(pb) ? (pb < 1 ? nf(pb * 12) + " mois" : nf(pb, 1) + " ans") : "–" },
        verdict: van > 0 ? "Démarche rentable sur 5 ans" : "Rentabilité non atteinte sur 5 ans",
        summary: `${eur(net)} de gains nets par an, VAN à 5 ans de ${eur(van)} au taux de 5 %.`,
        kpis: [
          { l: "Gains nets annuels", v: nf(net / 1000, 1), u: "k€", s: `Brut ${nf(gross / 1000, 1)} k€` },
          { l: "VAN sur 5 ans", v: nf(van / 1000, 1), u: "k€", s: "Actualisation 5 %" },
          { l: "Retour sur investissement", v: isFinite(pb) ? nf(pb, 1) : "–", u: "ans", s: `Investissement ${nf(inv / 1000)} k€` },
        ],
        chart: { type: "bars", unit: "€/an", items: parts.map(([l, x]) => ({ l, v: x })).concat([{ l: "Coût annuel", v: num(v.run), hot: true }]) },
        findings: F,
        actions: [
          "Lancer d'abord les gains sans investissement : réglages de chauffage, extinction des équipements, tri.",
          "Suivre chaque gain dans un tableau mensuel pour prouver le ROI à la direction.",
          "Présenter le CA préservé aux commerciaux : c'est souvent l'argument qui débloque le budget.",
        ],
        hyp: "Le coût d'un départ et le risque client sont vos hypothèses : ajustez-les avec vos chiffres RH et commerciaux.",
        sources: [S.fs, S.ademe],
      };
    },
  };

  /* ---------- 10. Objections ---------- */
  const OBJ = {
    cout: { l: "« Ça coûte trop cher »", args: ["Les premières actions (réglages, sobriété, tri, achats) coûtent peu et réduisent des factures existantes.", "Le copilote ROI chiffre les gains : énergie, déchets, turnover et clients préservés.", "Ne rien faire a aussi un coût : clients perdus, marchés publics moins bien notés, financement plus cher."], chiffre: "France Stratégie : environ 13 % de performance économique en plus en moyenne pour les entreprises engagées.", q: "Quel est aujourd'hui notre poste de dépense le plus gaspilleur ?" },
    petit: { l: "« On est trop petits »", args: ["Les grands clients interrogent leurs fournisseurs ; depuis l'Omnibus, la VSME fixe le niveau de ce qu'ils peuvent demander.", "La VSME a été conçue pour les PME : 11 points de données dans le module de base.", "Les marchés publics comportent tous un critère environnemental depuis le 21 août 2026."], chiffre: "Module de base VSME : 11 rubriques, B1 à B11.", q: "Combien de questionnaires RSE clients avons-nous reçus cette année ?" },
    clients: { l: "« Nos clients ne demandent rien »", args: ["Les demandes passent souvent par les achats ou les appels d'offres, pas par les commerciaux.", "EcoVadis et les questionnaires fournisseurs se généralisent chez les grands comptes.", "Être prêt avant la demande permet d'en faire un argument commercial."], chiffre: "Médaille EcoVadis Bronze : top 35 % des entreprises évaluées.", q: "Avons-nous perdu un appel d'offres sans en connaître la raison ?" },
    green: { l: "« On risque d'être accusés de greenwashing »", args: ["Le risque vient des allégations vagues, pas de l'action : il faut communiquer précis et prouvé.", "La directive EmpCo s'applique depuis le 27/09/2026 : elle interdit les allégations génériques et la neutralité par compensation.", "Le copilote Greenwashing repère les formulations à risque avant publication."], chiffre: "Allégations interdites par la loi AGEC : « biodégradable », « respectueux de l'environnement » sur les produits.", q: "Quelles preuves chiffrées avons-nous déjà et ne publions-nous pas ?" },
    temps: { l: "« On n'a pas le temps »", args: ["Commencer par trois actions et un indicateur chacune suffit pour une première année.", "Les données existent souvent déjà : factures d'énergie, DUERP, registre du personnel.", "Un rapport VSME unique évite de répondre dix fois à des questionnaires différents."], chiffre: "Charge moyenne estimée : 1,5 jour par donnée VSME manquante.", q: "Qui passe déjà du temps à remplir des questionnaires clients ?" },
    inutile: { l: "« Ça ne change rien »", args: ["Les achats (scope 3) pèsent souvent le plus : une PME peut entraîner ses fournisseurs.", "La démarche aide à recruter et à fidéliser, un enjeu concret dans les métiers en tension.", "Les résultats se mesurent : kWh, tonnes de déchets, taux d'accidents, turnover."], chiffre: "Une requête d'IA standard : environ 0,3 Wh ; un ordinateur portable fabriqué : 156 kgCO2e.", q: "Quel indicateur la direction aimerait-elle voir progresser d'ici un an ?" },
  };
  const objs = {
    id: "objections", fam: "convaincre", title: "Objections",
    short: "Des réponses argumentées aux freins de la direction ou des équipes.",
    intro: "Choisissez l'objection et le public. Vous obtenez trois arguments, un chiffre sourcé et une question à poser ; Claude peut ensuite rédiger la réponse adaptée à votre contexte.",
    calc: "6 objections · arguments sourcés",
    icon: "chat",
    fields: [
      { type: "select", id: "obj", label: "Objection entendue", def: "cout", options: Object.entries(OBJ).map(([k, o]) => [k, o.l]) },
      { type: "seg", id: "pub", label: "Public", def: "codir", options: [["codir", "Direction"], ["sal", "Salariés"], ["cli", "Clients"], ["fin", "Financeurs"]] },
      { type: "textarea", id: "ctx", label: "Contexte (facultatif)", def: "PME industrielle de 140 salariés, un client automobile vient d'envoyer un questionnaire EcoVadis.", rows: 3 },
    ],
    compute(v) {
      const o = OBJ[v.obj] || OBJ.cout;
      const pub = { codir: "la direction", sal: "les salariés", cli: "les clients", fin: "les financeurs" }[v.pub] || "la direction";
      return {
        gauge: null,
        verdict: o.l,
        summary: `Argumentaire pour ${pub}. Demandez à Claude une version rédigée à partir de votre contexte.`,
        kpis: [],
        chart: null,
        findings: [...o.args.map((t) => ({ lvl: "ok", tag: "Argument", t })), { lvl: "info", tag: "Chiffre", t: o.chiffre }, { lvl: "warn", tag: "Question", t: o.q }],
        actions: ["Répondre en reconnaissant d'abord l'objection, puis apporter un fait et une première étape concrète."],
        hyp: "",
        sources: [S.fs, S.vsme, S.empco, S.mp],
      };
    },
  };

  /* ---------- 11. Greenwashing ---------- */
  const GW = [
    [/neutres? en carbone|neutralité carbone|carbone? neutre|climatiquement neutre|net[- ]z[ée]ro|zéro carbone/gi, "crit", "Neutralité carbone", "Interdite par EmpCo si elle repose sur la compensation ; encadrée en France par la loi Climat (art. 12)."],
    [/compensation (carbone|de nos émissions)|compens(ons|ées?|é)\b/gi, "crit", "Compensation", "Une compensation ne peut pas fonder une allégation de neutralité ou d'impact réduit du produit."],
    [/respectueu(x|se)s? de l'environnement|biodégradables?/gi, "crit", "Mention interdite", "Interdite sur les produits et emballages par la loi AGEC (décret 2022-748)."],
    [/zéro (impact|émission|déchet)s?|sans impact|impact (nul|zéro)/gi, "crit", "Absolu non prouvable", "Une allégation absolue est presque impossible à prouver et sera jugée trompeuse."],
    [/éco-?responsables?|écologiques?|eco-?friendly|bon(ne)? pour la planète|(produits?|énergie|solutions?) verte?s?|green\b/gi, "crit", "Allégation générique", "EmpCo interdit les allégations génériques sans performance environnementale excellente reconnue."],
    [/(100 ?%|entièrement) recyclables?|recyclables?/gi, "warn", "Recyclabilité", "Préciser la part réellement recyclable et la filière ; éviter le 100 % sans preuve."],
    [/naturel(le)?s?/gi, "warn", "« Naturel »", "Terme vague : préciser la composition et la part d'ingrédients concernés."],
    [/durables?/gi, "warn", "« Durable »", "Ambigu : préciser s'il s'agit de durée de vie, de réparabilité ou d'impact, avec preuve."],
    [/(nous )?(visons|viserons|atteindrons)|d'ici (20\d\d)|à l'horizon 20\d\d/gi, "warn", "Engagement futur", "EmpCo exige un plan de mise en œuvre détaillé, des objectifs mesurables et une vérification indépendante."],
    [/label|certifi(é|ée|és|ées|cation)/gi, "warn", "Label", "Seuls les labels fondés sur un système de certification ou établis par une autorité publique sont admis."],
  ];
  const gwDef = "Chez nous, tous nos produits sont éco-responsables et 100 % recyclables. Notre entreprise est neutre en carbone grâce à la compensation de nos émissions. Nos emballages biodégradables sont respectueux de l'environnement, et nous visons zéro impact d'ici 2030.\n\nEn 2025, nous avons réduit de 18 % les émissions de nos scopes 1 et 2 par rapport à 2022, selon un bilan vérifié par un tiers.";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const gw = {
    id: "greenwashing", fam: "convaincre", title: "Greenwashing",
    short: "Détecte les formulations à risque avant publication, textes de loi à l'appui.",
    intro: "Collez un texte : site, plaquette, fiche produit, post. Chaque formulation risquée est surlignée et rattachée à la règle qu'elle enfreint.",
    calc: "10 règles · EmpCo · AGEC · Climat",
    icon: "search",
    fields: [{ type: "textarea", id: "txt", label: "Texte à vérifier", def: gwDef, rows: 9, wide: true }],
    compute(v) {
      const txt = String(v.txt ?? gwDef);
      const hits = [];
      GW.forEach(([re, lvl, cat, rule]) => { re.lastIndex = 0; let m; while ((m = re.exec(txt))) { if (!hits.some((h) => m.index < h.e && m.index + m[0].length > h.s)) hits.push({ s: m.index, e: m.index + m[0].length, w: m[0], lvl, cat, rule }); } });
      hits.sort((a, b) => a.s - b.s);
      let html = "", p = 0;
      hits.forEach((h) => { html += esc(txt.slice(p, h.s)) + `<mark class="hl${h.lvl === "warn" ? " w" : ""}" title="${esc(h.cat)}">${esc(h.w)}</mark>`; p = h.e; });
      html += esc(txt.slice(p));
      const nc = hits.filter((h) => h.lvl === "crit").length, nw = hits.length - nc;
      const precise = (txt.match(/\d+[,.]?\d*\s?%[^.]{0,80}(20\d\d)|(20\d\d)[^.]{0,80}\d+[,.]?\d*\s?%/g) || []).length;
      const score = Math.round(clamp(100 - nc * 14 - nw * 5 + precise * 5, 0, 100));
      const byCat = {};
      hits.forEach((h) => { (byCat[h.cat] ||= { ...h, n: 0, words: [] }).n++; byCat[h.cat].words.push(h.w); });
      const F = Object.values(byCat).map((c) => ({ lvl: c.lvl, tag: c.cat, t: `« ${[...new Set(c.words)].slice(0, 3).join(" », « ")} » : ${c.rule}` }));
      if (precise) F.push({ lvl: "ok", tag: "Bonne pratique", t: `${precise} allégation(s) chiffrée(s) et datée(s) détectée(s) : c'est le format à généraliser.` });
      if (!hits.length) F.push({ lvl: "ok", t: "Aucune formulation à risque détectée par les règles automatiques." });
      return {
        gauge: { val: score, max: 100, label: "FIABILITÉ" },
        verdict: nc >= 3 ? "Risque élevé" : nc >= 1 ? "Risque à corriger" : nw ? "Vigilance" : "Texte sûr",
        summary: `${nc} formulation(s) à risque juridique, ${nw} à préciser, ${precise} allégation(s) chiffrée(s).`,
        kpis: [
          { l: "À risque", v: nc, u: "", s: "À retirer ou reformuler" },
          { l: "À préciser", v: nw, u: "", s: "Ajouter preuve ou périmètre" },
          { l: "Allégations chiffrées", v: precise, u: "", s: "Chiffre + année de référence" },
        ],
        chart: { type: "highlight", html },
        findings: F,
        actions: [
          "Remplacer chaque terme générique par un fait mesuré : quoi, combien, par rapport à quand, sur quel périmètre.",
          "Retirer toute neutralité carbone fondée sur la compensation ; parler de contribution à des projets, séparément.",
          "Garder un dossier de preuves pour chaque allégation publiée.",
        ],
        hyp: "Détection par règles : un juriste doit valider les textes à fort enjeu.",
        sources: [S.empco, S.agec, S.climat12],
      };
    },
  };

  /* ---------- 12. Visibilité RSE ---------- */
  const visItems = [
    ["page", "Page RSE accessible depuis l'accueil", 10, "1", "Page dédiée"], ["chif", "Chiffres clés avec année de référence", 15, "0.5", "Chiffres clés"], ["obj", "Objectifs datés et chiffrés", 15, "0", "Objectifs"],
    ["av", "Avancement publié d'une année sur l'autre", 10, "0", "Avancement"], ["pre", "Preuves : labels, notation, certificats avec date", 10, "0.5", "Preuves"], ["rap", "Rapport ou synthèse téléchargeable", 10, "0", "Rapport"],
    ["hum", "Actions incarnées par des salariés", 10, "1", "Incarnation"], ["contact", "Interlocuteur RSE identifié", 5, "0", "Contact"], ["maj", "Mise à jour depuis moins de 12 mois", 10, "0.5", "Fraîcheur"], ["claims", "Allégations vérifiées (copilote Greenwashing)", 5, "0", "Allégations"],
  ];
  const vis = {
    id: "visibilite-rse", fam: "convaincre", title: "Visibilité RSE",
    short: "Audit de la crédibilité de votre communication RSE en ligne.",
    intro: "Évaluez votre page RSE sur dix critères de crédibilité. Collez son texte si vous voulez une vérification automatique des chiffres et des dates.",
    calc: "10 critères · signaux du texte",
    icon: "eye",
    fields: [
      { type: "checklist", id: "ck", label: "Votre page RSE aujourd'hui", states: YNP, items: visItems.map(([id, label, w, def]) => ({ id, label, hint: `${w} points`, def })) },
      { type: "textarea", id: "txt", label: "Texte de la page (facultatif)", def: "", rows: 5, wide: true, help: "Le copilote compte les chiffres, les années, les scopes et les labels cités." },
    ],
    compute(v) {
      const st = v.ck || {};
      const it = visItems.map(([id, label, w, def, sh]) => ({ label, sh, w, s: num(st[id] ?? def) }));
      let score = it.reduce((a, x) => a + x.w * x.s, 0);
      const t = String(v.txt || "");
      const sig = t ? { nums: (t.match(/\d+[,.]?\d*\s?(%|t|tonnes?|kWh|MWh|GWh|kg|tCO2e?)/gi) || []).length, years: (t.match(/\b20\d\d\b/g) || []).length, scope: /scope|périmètre/i.test(t), label: /ecovadis|iso ?\d{4,5}|b ?corp|lucie|label/i.test(t) } : null;
      const F = [];
      it.filter((x) => x.s < 1).sort((a, b) => b.w * (1 - b.s) - a.w * (1 - a.s)).slice(0, 4).forEach((x) => F.push({ lvl: x.s === 0 ? "crit" : "warn", t: `${x.label} : +${nf(x.w * (1 - x.s))} points possibles.` }));
      if (sig) {
        F.push({ lvl: sig.nums >= 3 ? "ok" : "warn", tag: "Texte", t: `${sig.nums} donnée(s) chiffrée(s), ${sig.years} année(s) citée(s)${sig.scope ? ", périmètre précisé" : ", périmètre non précisé"}${sig.label ? ", label ou notation cité" : ""}.` });
        if (sig.nums < 3) score = Math.max(0, score - 5);
      }
      score = Math.round(score);
      return {
        gauge: { val: score, max: 100, label: "CRÉDIBILITÉ" },
        verdict: score >= 75 ? "Communication crédible" : score >= 45 ? "Communication à renforcer" : "Communication peu convaincante",
        summary: `Score de crédibilité ${score}/100. Des chiffres datés et des preuves rendent une communication RSE plus crédible.`,
        kpis: [
          { l: "Crédibilité", v: score, u: "/100", s: "10 critères pondérés" },
          { l: "Critères remplis", v: it.filter((x) => x.s === 1).length, u: "/10", s: `${it.filter((x) => x.s === 0.5).length} en partie` },
          { l: "Chiffres dans le texte", v: sig ? sig.nums : "–", u: "", s: sig ? `${sig.years} années citées` : "Collez le texte pour analyser" },
        ],
        chart: { type: "bars", unit: "pts", items: it.map((x) => ({ l: x.sh, v: x.w * x.s, max: x.w })) },
        findings: F,
        actions: [
          "Publier 5 indicateurs clés avec leur année de référence et la tendance.",
          "Afficher chaque objectif avec une date, une valeur cible et l'avancement.",
          "Faire relire la page avec le copilote Greenwashing avant mise en ligne.",
        ],
        hyp: "Grille Sillon sur 100 points.",
        sources: [S.empco, S.vsme],
      };
    },
  };

  window.SILLON = {
    families: [
      { id: "mesurer", title: "Mesurer", sub: "Chiffrer l'impact, les risques et les gains." },
      { id: "conformer", title: "Se conformer", sub: "Savoir ce qui s'applique et être prêt à le prouver." },
      { id: "convaincre", title: "Convaincre", sub: "Gagner des marchés et communiquer sans risque." },
    ],
    copilots: [bilanC, carbone, fourn, bench, regl, vsme, ecov, isoA, mp, gw, vis, roi, objs],
    sources: S, num,
    nf, eur,
  };
})();
