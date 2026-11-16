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
    ademe: { n: "ADEME — Base Empreinte", t: "Base publique de facteurs d’émission et de données d’inventaire. Les valeurs préremplies dans Sillon ne sont pas rapprochées individuellement d’une fiche, d’une version et d’un périmètre ADEME ; elles ne doivent pas être présentées comme des facteurs ADEME certifiés.", url: "https://base-empreinte.ademe.fr/" },
    vsme: { n: "EFRAG — norme VSME", t: "EFRAG, norme VSME (déc. 2024) et recommandation de la Commission européenne (juil. 2025)", url: "https://www.efrag.org/en/vsme" },
    omnibus: { n: "EUR-Lex — directive (UE) 2026/470 (Omnibus I)", t: "Texte officiel publié au Journal officiel de l’Union européenne le 26/02/2026 ; modifications CSRD et CSDDD.", url: "https://eur-lex.europa.eu/eli/dir/2026/470/oj?locale=fr" },
    ocde: { n: "OCDE — Guide sur le devoir de diligence pour une conduite responsable des entreprises", t: "Guide OCDE 2018 : diligence fondée sur le risque, proportionnée à la gravité et à la probabilité des impacts négatifs ; processus continu en six étapes.", url: "https://www.oecd.org/en/publications/oecd-due-diligence-guidance-for-responsible-business-conduct_15f5f4b3-en.html" },
    ecovadis: { n: "EcoVadis — médailles, badges et seuils mensuels", t: "EcoVadis : médailles fondées sur les percentiles, seuils de score publiés mensuellement et critères d’éligibilité complémentaires.", url: "https://support.ecovadis.com/hc/fr/articles/39606014723090-Mise-%C3%A0-jour-des-seuils-mensuels-des-m%C3%A9dailles" },
    empco: { n: "EUR-Lex — directive (UE) 2024/825 (EmpCo)", t: "Directive relative à la protection des consommateurs contre les allégations environnementales trompeuses ; application à partir du 27/09/2026.", url: "https://eur-lex.europa.eu/eli/dir/2024/825/oj?locale=fr" },
    agec: { n: "Légifrance — loi AGEC, art. 13 et décret n° 2022-748", t: "Encadrement des mentions « biodégradable » et « respectueux de l’environnement » sur les produits et emballages.", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045726094" },
    dechets: { n: "Légifrance — Code de l’environnement, art. L.541-21-2 et D.543-281", t: "Tri à la source et collecte séparée des flux de déchets non dangereux applicables, avec règles spécifiques aux déchets de chantier et aux textiles.", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041626981" },
    climat12: { n: "Légifrance — loi Climat et résilience, décret 2022-539", t: "Loi Climat et résilience art. 12 et décret 2022-539 : encadrement des allégations de neutralité carbone", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045570611" },
    mp: { n: "Service-Public — critère environnemental des marchés publics", t: "Service-Public Entreprendre (18/08/2026) : critère et condition d'exécution environnementaux obligatoires au 21/08/2026", url: "https://entreprendre.service-public.gouv.fr/actualites/A19042" },
    fs: { n: "France Stratégie — RSE et compétitivité", t: "France Stratégie (2016), « RSE et compétitivité » : écart de performance économique d'environ 13 % en moyenne", url: "https://www.strategie.gouv.fr/publications/responsabilite-sociale-entreprises-competitivite" },
    iso14001: { n: "ISO 14001:2026", t: "Édition 4 publiée en avril 2026 ; remplace ISO 14001:2015.", url: "https://www.iso.org/standard/14001" },
    iso45001: { n: "ISO 45001:2018", t: "Édition actuelle confirmée en 2024 ; amendement climat 2024.", url: "https://www.iso.org/standard/45001" },
    iso50001: { n: "ISO 50001:2018", t: "Édition actuelle confirmée en 2024 ; amendement climat 2024.", url: "https://www.iso.org/standard/69426.html" },
    beges: { n: "Légifrance — Code de l’environnement, art. L.229-25", t: "Seuils BEGES : entreprises privées >500 salariés en métropole, >250 en outre-mer ; personnes morales de droit public >250 salariés, et collectivités concernées de plus de 50 000 habitants.", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051559662" },
    energie: { n: "Légifrance — Code de l’énergie, art. L.233-1", t: "Loi n° 2025-391 du 30 avril 2025, art. 25 : seuils de 2,75 et 23,6 GWh, audit quadriennal et système de management certifié.", url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023983208/LEGISCTA000027718472/" },
    pay: { n: "EUR-Lex — directive (UE) 2023/970, art. 9", t: "Échéances de reporting des écarts de rémunération : 250+, 150–249 et 100–149 salariés.", url: "https://eur-lex.europa.eu/legal-content/FR/ALL/?uri=celex:32023L0970" },
  };
  const YNP = [["1", "Oui"], ["0.5", "En partie"], ["0", "Non"]];


  /* ---------- 0. Bilan carbone ---------- */
  const FE = window.SILLON_REF.facteurs, SEUIL = window.SILLON_REF.seuils;
  const bilanC = {
    id: "bilan-carbone", fam: "mesurer", title: "Estimation GES simplifiée",
    short: "Une première estimation de plusieurs postes des scopes 1, 2 et 3.",
    intro: "Estimation pédagogique sur un nombre limité de postes à partir de données d’activité et de ratios. Ce module n’est pas un BEGES complet : plusieurs postes du scope 3 ne sont pas couverts et les facteurs préremplis doivent être vérifiés avant tout usage externe, réglementaire ou décisionnel.",
    calc: "postes sélectionnés · facteurs indicatifs",
    icon: "flame",
    fields: [
      { type: "group", label: "Scope 1 · combustion et fuites" },
      { type: "number", id: "gaz", label: "Gaz naturel", unit: "kWh/an", def: 350000, min: 0, help: "Valeur indicative préremplie ; vérifier le facteur exact, son année et son périmètre dans Base Empreinte." },
      { type: "number", id: "fioul", label: "Fioul domestique", unit: "L/an", def: 0, min: 0, help: "Valeur indicative préremplie ; vérifier le facteur exact, son année et son périmètre dans Base Empreinte." },
      { type: "number", id: "gazole", label: "Gazole des véhicules", unit: "L/an", def: 12000, min: 0, help: "Valeur indicative préremplie ; vérifier le facteur exact, son année et son périmètre dans Base Empreinte." },
      { type: "number", id: "essence", label: "Essence des véhicules", unit: "L/an", def: 2000, min: 0, help: "Valeur indicative préremplie ; vérifier le facteur exact, son année et son périmètre dans Base Empreinte." },
      { type: "number", id: "clim", label: "Recharges de climatisation (R410A)", unit: "kg/an", def: 3, min: 0, help: "PRG indicatif à confirmer selon le gaz exact et la référence méthodologique retenue." },
      { type: "group", label: "Scope 2 · électricité" },
      { type: "number", id: "elec", label: "Électricité consommée", unit: "kWh/an", def: 420000, min: 0, help: "Valeur indicative préremplie. Le facteur électrique dépend notamment de l’année, du périmètre et de la méthode ; vérifier la fiche ADEME adaptée." },
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
      F.push({ lvl: "warn", t: `Périmètre incomplet : le scope 3 ne couvre ici que certains déplacements, le domicile-travail et trois catégories d’achats. Les déchets, le fret, les immobilisations, les combustibles et l’énergie en amont, l’utilisation et la fin de vie des produits vendus, entre autres postes pertinents, ne sont pas évalués.` });
      F.push({ lvl: "info", t: `Les achats sont estimés par ratios monétaires : précision faible, à affiner avec les données physiques et les facteurs documentés des principaux fournisseurs.` });
      return {
        gauge: { val: Math.round(t(tot)), max: Math.max(1, Math.round(t(tot)) / Math.max(0.01, sc[2] / (tot || 1))), label: "TCO2E / AN", raw: true, show: nf(t(tot)) + " t" },
        verdict: `${nf(t(tot))} tCO2e par an`,
        summary: `Estimation partielle — postes sélectionnés uniquement. Scope 1 : ${nf(t(sc[0]))} t · Scope 2 : ${nf(t(sc[1]))} t · Scope 3 partiel : ${nf(t(sc[2]))} t. ${nf(per, 1)} tCO2e par salarié sur ce périmètre incomplet.`,
        kpis: [
          { l: "Scopes 1 et 2", v: nf(t(sc[0] + sc[1]), 1), u: "tCO2e", s: "Périmètre BEGES et VSME B3" },
          { l: "Scope 3 (partiel)", v: nf(t(sc[2])), u: "tCO2e", s: `${nf((sc[2] / (tot || 1)) * 100)} % du total calculé` },
          { l: "Par salarié", v: nf(per, 1), u: "tCO2e", s: `${nf(k("sal"))} salariés` },
        ],
        chart: { type: "bars", unit: "tCO2e/an", items: P.filter((p) => p[2] > 0).map((p) => ({ l: p[0], v: t(p[2]), hot: p === top[0] })) },
        findings: F,
        actions: [
          `Bâtir un plan de réduction sur « ${top[0][0]} » et « ${top[1][0]} », qui pèsent ${nf(((top[0][2] + top[1][2]) / (tot || 1)) * 100)} % du total.`,
          "Demander à vos 10 premiers fournisseurs leur empreinte carbone pour remplacer les ratios monétaires.",
          "Fixer une politique de déplacements : train obligatoire sous 4 h de trajet.",
          "Compléter les postes manquants et documenter les facteurs avant toute intégration dans un reporting VSME ou un BEGES.",
        ],
        hyp: "Les facteurs préremplis sont des ordres de grandeur de démonstration, pas une extraction vérifiée de fiches ADEME. Leur année, géographie, unité fonctionnelle, périmètre (amont, combustion, fabrication, traînées aériennes, etc.) et statut doivent être rapprochés individuellement d’une fiche Base Empreinte avant utilisation. Les ratios monétaires d’achats sont des hypothèses modifiables. Le calcul ne couvre qu’une sélection de postes : il ne constitue ni un BEGES réglementaire, ni un bilan carbone exhaustif, ni un audit.",
        sources: [S.ademe, S.beges, S.vsme],
      };
    },
  };

  /* ---------- 1. Carbone IA ---------- */
  const carbone = {
    id: "carbone-ia", fam: "mesurer", title: "Carbone IA",
    short: "Empreinte carbone de vos usages d'IA générative, matériel compris.",
    intro: "Estimation exploratoire des usages texte, des requêtes longues et des images générées. Les consommations par requête et les facteurs géographiques sont des hypothèses variables selon les modèles, les centres de données et les méthodes de calcul : ce module ne mesure pas les consommations réelles du fournisseur.",
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
        gauge: { val: score, max: 100, label: "INDICE INTERNE" },
        verdict: score >= 75 ? "Indice interne favorable" : score >= 50 ? "Indice interne intermédiaire" : "Indice interne à optimiser",
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
        hyp: "Estimation indicative et non mesure réelle : 0,3 Wh par requête standard et 3 Wh par requête longue sont des hypothèses de modélisation (la seconde est une hypothèse ×10, non une donnée mesurée universelle) ; 2,9 Wh/image est issu d’une étude sur un modèle et un protocole donnés, non généralisable à tous les générateurs. Le facteur kgCO2e/kWh dépend de la localisation et de l’année du mix électrique. Le facteur de fabrication du PC est un ordre de grandeur à vérifier selon le modèle et le cycle de vie. Le calcul ne couvre pas de manière exhaustive les équipements des centres de données, le refroidissement, le réseau, l’eau ni l’ensemble du cycle de vie des infrastructures. L’indice 0–100 est une formule interne Sillon, sans référentiel externe ni valeur de certification.",
        sources: [S.google, S.altman, S.luccioni, S.ademe],
      };
    },
  };

  /* ---------- 2. Reporting VSME ---------- */
  const VS = [["ok", "Prêt"], ["part", "Partiel"], ["no", "Manquant"], ["na", "N/A"]];
  const vsmeB = [
    ["B1", "Base d'établissement", "Périmètre, filiales, option retenue", "ok"],
    ["B2", "Pratiques, politiques et initiatives de transition", "", "part"],
    ["B3", "Énergie et émissions de GES", "Consommation totale d'énergie (MWh), ventilation renouvelable/non renouvelable si disponible, scopes 1 et 2 location-based, intensité GES", "part"],
    ["B4", "Pollution de l'air, de l'eau et des sols", "Polluants déclarés aux autorités ou suivis volontairement dans un système de management environnemental", "na"],
    ["B5", "Biodiversité", "Nombre et surface des sites détenus, loués ou gérés dans ou près de zones sensibles", "no"],
    ["B6", "Eau", "Prélèvements totaux et prélèvements sur sites en zones de stress hydrique ; consommation si procédés fortement consommateurs", "ok"],
    ["B7", "Ressources, économie circulaire et déchets", "Principes d'économie circulaire, déchets dangereux/non dangereux, réemploi/recyclage et flux matières significatifs", "part"],
    ["B8", "Effectifs : caractéristiques générales", "Effectifs par type de contrat et genre, pays si activité multi-pays ; turnover si 50 salariés ou plus", "ok"],
    ["B9", "Effectifs : santé et sécurité", "Accidents du travail enregistrables, taux d'accidents et décès liés au travail", "ok"],
    ["B10", "Rémunération, négociation collective, formation", "Rémunération adéquate, couverture de négociation collective et heures de formation", "part"],
    ["B11", "Condamnations et amendes pour corruption", "", "ok"],
  ];
  const vsmeC = [
    ["C1", "Stratégie : modèle d'affaires et durabilité", "", "no"],
    ["C2", "Description des pratiques et politiques", "", "part"],
    ["C3", "Objectifs GES et transition climatique", "Cibles absolues scopes 1 et 2, année de base/cible, périmètre et principales actions ; scope 3 significatif si cible fixée", "no"],
    ["C4", "Risques climatiques", "Aléas physiques et événements de transition identifiés, exposition et horizon temporel", "no"],
    ["C5", "Effectifs : informations complémentaires", "", "part"],
    ["C6", "Droits humains : politiques et processus", "Politiques, mécanismes de diligence raisonnable et canaux de signalement", "no"],
    ["C7", "Incidents graves en matière de droits humains", "", "ok"],
    ["C8", "Revenus de certains secteurs, exclusions des indices UE", "", "na"],
    ["C9", "Diversité de genre dans l'organe de gouvernance", "", "ok"],
  ];
  const toItems = (arr) => arr.map(([code, label, hint, def]) => ({ id: code, code, label, hint, def }));
  const vsme = {
    id: "reporting-vsme", fam: "conformer", title: "Reporting VSME",
    short: "État de préparation de votre rapport volontaire PME, point par point.",
    intro: "La VSME est le standard volontaire européen pour les PME. La protection « value-chain cap » issue de la directive Omnibus concerne les entreprises protégées de la chaîne de valeur d’une entreprise soumise au reporting CSRD : elles peuvent refuser certaines demandes d’informations dépassant les standards volontaires applicables, dans le cadre et sous les conditions du texte. Ce n’est pas un plafond universel opposable à toute demande client. Cochez où vous en êtes sur chaque point.",
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
      if (b3 && b3.s !== "ok") F.push({ lvl: "warn", t: "B3 (énergie et GES) incomplet : point important du module de base à documenter, selon les données pertinentes et disponibles pour l’entreprise." });
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
          "Proposer un reporting VSME comme base de dialogue avec les clients, en vérifiant les demandes complémentaires et le champ de protection juridique applicable.",
        ],
        hyp: "Le pourcentage est un indice interne de complétude, avec une pondération égale des points déclarés pertinents ; il ne s’agit pas d’un score EFRAG. La charge de 1,5 jour par point manquant et 0,7 jour par point partiel est une hypothèse indicative à recalibrer selon la taille, les systèmes de données et le niveau de preuve. Les points ne sont à renseigner que lorsqu’ils sont applicables. La protection value-chain cap n’est pas générale : elle vise les entreprises protégées au sens de la directive 2026/470 et les demandes formulées pour le reporting CSRD d’une entreprise déclarante.",
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
    id: "benchmark-rse", fam: "mesurer", title: "Diagnostic de maturité RSE",
    short: "Auto-évaluation de 20 pratiques sur 5 piliers.",
    intro: "Vingt pratiques concrètes réparties en cinq piliers. Le résultat vous situe sur une grille interne de maturité en quatre paliers. Il ne s'agit pas d'un benchmark sectoriel : aucune base de comparaison d'entreprises ou de moyennes sectorielles n'est utilisée.",
    calc: "5 piliers · radar · indice interne",
    icon: "chart",
    fields: [
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
        summary: `Indice interne moyen ${avg}/100. Palier suivant : ${avg >= 80 ? "maintenir et prouver" : avg >= 55 ? "Avancé à 80" : "Structuré à 55"}.`,
        kpis: res.map((r) => ({ l: r.lab, v: r.s, u: "/100", s: r.s >= 80 ? "Avancé" : r.s >= 55 ? "Structuré" : r.s >= 25 ? "Démarrage" : "Initial" })),
        chart: { type: "radar", axes: res.map((r) => r.lab), values: res.map((r) => r.s), rings: [[25, "Démarrage"], [55, "Structuré"], [80, "Avancé"]] },
        findings: F,
        actions: sorted.slice(0, 3).map((r) => `${r.lab} : traiter « ${r.gaps[0] || "consolider les preuves"} » dans les 90 jours.`),
        hyp: "Grille interne Sillon : Oui = 1, En partie = 0,5, Non = 0. Pondération égale des 20 pratiques. Les paliers sont des repères pédagogiques non validés par une étude sectorielle, sans comparaison à des entreprises homologues et sans valeur de certification.",
        sources: [S.vsme, S.ecovadis],
      };
    },
  };

  /* ---------- 4. Fournisseurs ---------- */
  const ZONES = [["fr", "France", 1], ["ue", "Union européenne", 1.5], ["ocde", "OCDE hors UE", 2.5], ["mod", "Hors OCDE, risque modéré", 3.5], ["high", "Hors OCDE, risque élevé", 5]];
  const CATS = [["textile", "Textile, habillement", 5], ["elec", "Électronique", 4.5], ["agro", "Agroalimentaire", 4], ["chim", "Chimie, plastiques", 4], ["btp", "Matériaux, BTP", 3.5], ["energie", "Énergie", 3], ["transport", "Transport, logistique", 3], ["emb", "Emballages", 3], ["mob", "Mobilier, fournitures", 3], ["num", "Services numériques", 2], ["intel", "Services intellectuels", 1.5]];
  const CERTS = [["none", "Aucune preuve déclarée", 1], ["iso", "ISO 14001", 1], ["eco", "Évaluation EcoVadis", 1], ["sa", "SA8000 / amfori BSCI", 1]];
  const lk = (arr, k) => arr.find((x) => x[0] === k) || arr[0];
  const fourn = {
    id: "fournisseurs", fam: "mesurer", title: "Fournisseurs",
    short: "Cartographie des risques RSE de vos achats, pondérée par la dépense.",
    intro: "Pré-cartographie exploratoire des risques d’achats : la grille combine une exposition géographique et une sensibilité sectorielle, puis pondère les résultats par les dépenses. Elle ne constitue pas une analyse de risques de diligence raisonnable. Les labels et certificats sont des éléments de preuve à examiner, pas une garantie d’absence de risque ni une réduction automatique du score.",
    calc: "indice de présélection pays × catégorie × dépense",
    icon: "truck",
    fields: [
      { type: "table", id: "rows", label: "Vos fournisseurs", columns: [
        { id: "nom", label: "Fournisseur", type: "text" },
        { id: "zone", label: "Zone", type: "select", options: ZONES.map((z) => [z[0], z[1]]) },
        { id: "cat", label: "Catégorie", type: "select", options: CATS.map((c) => [c[0], c[1]]) },
        { id: "dep", label: "Dépense €/an", type: "number" },
        { id: "cert", label: "Preuve ou démarche déclarée", type: "select", options: CERTS.map((c) => [c[0], c[1]]) } ],
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
        const risk = Math.round(((z[2] * c[2]) / 25) * 100);
        return { nom: r.nom || "Sans nom", risk, dep: num(r.dep), share: num(r.dep) / tot, z: z[1], c: c[1], cert: ce[0] };
      });
      const w = Math.round(sc.reduce((a, s) => a + s.risk * s.share, 0));
      const hi = sc.filter((s) => s.risk >= 50);
      const hiShare = hi.reduce((a, s) => a + s.share, 0);
      const top = [...sc].sort((a, b) => b.risk * b.share - a.risk * a.share);
      const F = top.slice(0, 3).map((s) => ({ lvl: s.risk >= 50 ? "crit" : s.risk >= 25 ? "warn" : "ok", t: `${s.nom} : risque ${s.risk}/100 (${s.c}, ${s.z}), ${nf(s.share * 100)} % de la dépense${s.cert === "none" ? ", sans preuve déclarée" : ""}.` }));
      if (!sc.length) F.push({ lvl: "info", t: "Ajoutez au moins un fournisseur pour lancer l'analyse." });
      return {
        gauge: { val: w, max: 100, label: "EXPOSITION" },
        verdict: w >= 45 ? "Exposition présumée élevée" : w >= 25 ? "Exposition présumée modérée" : "Exposition présumée contenue",
        summary: `${sc.length} fournisseurs, ${eur(tot)} de dépenses. ${nf(hiShare * 100)} % de la dépense est associée à une exposition élevée selon la grille interne.`,
        kpis: [
          { l: "Indice d'exposition pondéré", v: w, u: "/100", s: "Indice interne pondéré par la dépense" },
          { l: "Dépense à risque élevé", v: nf(hiShare * 100), u: "%", s: `${hi.length} fournisseur(s)` },
          { l: "Dépense analysée", v: nf(tot / 1000), u: "k€", s: `${sc.filter((s) => s.cert !== "none").length} avec preuve déclarée` },
        ],
        chart: { type: "matrix", xl: "Risque RSE", yl: "Part de la dépense", points: sc.map((s) => ({ l: s.nom, x: s.risk, y: s.share * 100 })) },
        findings: F,
        actions: [
          "Envoyer un questionnaire RSE court aux fournisseurs du quadrant « risque élevé, dépense forte ».",
          "Ajouter une clause RSE (droits humains, environnement, droit d'audit) aux contrats renouvelés cette année.",
          "Demander une preuve datée : certificat ISO 14001, scorecard EcoVadis ou audit social.",
          "Rechercher une alternative européenne pour les catégories textile et électronique les plus exposées.",
        ],
        hyp: "Indice interne de présélection : exposition géographique (échelle qualitative Sillon de 1 à 5) × sensibilité de catégorie (échelle qualitative Sillon de 1,5 à 5), normalisées sur 25, puis pondérées par la dépense. Ces coefficients ne sont ni des données statistiques ni une notation pays/secteur validée. Les preuves déclarées (ISO 14001, évaluation EcoVadis, SA8000/BSCI) ne réduisent pas mécaniquement l’indice : leur périmètre, validité, site couvert, date, audit et éventuelles non-conformités doivent être vérifiés. Le résultat n’est pas un score de conformité ni une diligence raisonnable complète.",
        sources: [S.ocde, S.omnibus],
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
      { type: "select", id: "begesStatut", label: "Statut pour le BEGES", def: "prive", options: [["prive", "Entreprise privée"], ["public", "Autre personne morale de droit public"], ["collectivite", "Collectivité territoriale / groupement"]] },
      { type: "select", id: "begesTerritoire", label: "Territoire (entreprise privée)", def: "metro", options: [["metro", "Métropole"], ["outremer", "Outre-mer"]] },
      { type: "number", id: "begesPop", label: "Population de la collectivité (si concernée)", unit: "hab.", def: 0, min: 0 },
      { type: "seg", id: "mp", label: "Vous répondez à des marchés publics", def: "oui", prof: "mp", options: [["oui", "Oui"], ["non", "Non"]] },
      { type: "seg", id: "b2c", label: "Vous communiquez des arguments écologiques", def: "oui", prof: "b2c", options: [["oui", "Oui"], ["non", "Non"]] },
    ],
    compute(v) {
      const e = num(v.eff), em = Math.max(num(v.effM), e), ca = num(v.ca), surf = num(v.surf), g = num(v.gwh);
      const L = [];
      const add = (st, name, t) => L.push({ st, name, t });
      add("oblig", "DUERP", "Document unique d'évaluation des risques, obligatoire dès le 1er salarié.");
      add("oblig", "Tri à la source des déchets", "Tri à la source et collecte séparée des déchets non dangereux selon les flux effectivement produits : papier/carton, métal, plastique, verre, bois et textiles ; fractions minérales et plâtre pour les déchets de chantier. Tri à la source des biodéchets selon les règles applicables. Vérifier les exceptions, seuils et modalités propres au site.");
      if (e >= 20) add("oblig", "Emploi des travailleurs handicapés", "Obligation de 6 % de l'effectif (dès 20 salariés).");
      if (e >= 50) add("oblig", "Index égalité professionnelle", "Publication annuelle avant le 1er mars (dès 50 salariés).");
      if (e >= 50) add("verif", "Mobilité des salariés", "À vérifier : la négociation sur les mobilités vise notamment les entreprises concernées par la négociation obligatoire et employant au moins 50 salariés sur un même site ; l’effectif total France seul ne suffit pas à conclure.");
      if (e >= 250) add("verif", "Transparence salariale (directive 2023/970)", "Rapport sur les écarts de rémunération chaque année à compter du 7 juin 2027 (art. 9). Vérifier les modalités françaises de transposition.");
      else if (e >= 150) add("verif", "Transparence salariale (directive 2023/970)", "Rapport sur les écarts de rémunération tous les trois ans à compter du 7 juin 2027 (art. 9). Vérifier les modalités françaises de transposition.");
      else if (e >= 100) add("verif", "Transparence salariale (directive 2023/970)", "Rapport sur les écarts de rémunération tous les trois ans à compter du 7 juin 2031 (art. 9). Vérifier les modalités françaises de transposition.");
      if (e >= 300) add("oblig", "Bilan social", "Annuel, dès 300 salariés.");
      const statut = v.begesStatut || "prive", territoire = v.begesTerritoire || "metro", pop = num(v.begesPop);
      const seuilBEGES = statut === "collectivite" ? (pop > 50000) : statut === "public" ? (e > 250) : territoire === "outremer" ? (e > 250) : (e > 500);
      if (seuilBEGES) add("oblig", "BEGES réglementaire", statut === "collectivite" ? "Collectivité de plus de 50 000 habitants : BEGES et plan de transition publics, mise à jour tous les 3 ans." : statut === "public" ? "Personne morale de droit public de plus de 250 salariés : BEGES et plan de transition publics, mise à jour tous les 3 ans." : territoire === "outremer" ? "Personne morale de droit privé de plus de 250 salariés en outre-mer : BEGES et plan de transition publics, mise à jour tous les 4 ans." : "Personne morale de droit privé de plus de 500 salariés en métropole : BEGES et plan de transition publics, mise à jour tous les 4 ans.");
      else add("info", "BEGES réglementaire", "Seuil non atteint avec les informations saisies. Vérifier le statut juridique, le territoire, l'effectif de référence, le périmètre de groupe et les éventuelles obligations sectorielles avant de conclure.");
      if (e >= SEUIL.sapin2Effectif && ca > SEUIL.sapin2CA) add("oblig", "Loi Sapin II", "Programme anticorruption (500 salariés et 100 M€ de CA).");
      if (e >= 1000) add("oblig", "Loi Rixain", "Quotas de femmes parmi les cadres dirigeants (dès 1 000 salariés).");
      if (e >= 5000 || em >= 10000) add("oblig", "Devoir de vigilance", "Plan de vigilance publié (5 000 salariés en France ou 10 000 dans le monde).");
      if (em > SEUIL.csrdEffectif && ca > SEUIL.csrdCA) add("oblig", "CSRD", "Dans le champ après l'Omnibus (plus de 1 000 salariés et plus de 450 M€ de CA).");
      else add("info", "CSRD", "Hors champ selon les seuils CSRD simplifiés ; vérifier le périmètre consolidé et les dispositions applicables. Les demandes de données des clients doivent être examinées au regard du statut d’entreprise protégée et du standard volontaire pertinent.");
      if (em > SEUIL.csdddEffectif && ca > SEUIL.csdddCA) add("oblig", "CSDDD", "Devoir de vigilance européen, conformité au 26/07/2029.");
      if (surf >= SEUIL.tertiaireSurface) add("oblig", "Décret tertiaire", "Réduction des consommations de -40 % en 2030, déclaration annuelle sur OPERAT.");
      if (g >= SEUIL.smeEnergieGWh) add("oblig", "Système de management de l'énergie", "Système de management de l'énergie certifié requis dès 23,6 GWh/an de consommation annuelle moyenne (Code de l'énergie, art. L.233-1).");
      else if (g >= SEUIL.auditEnergieGWh) add("verif", "Audit énergétique", "Audit énergétique tous les quatre ans dès 2,75 GWh/an de consommation annuelle moyenne, si l'entreprise n'a pas de système de management de l'énergie certifié (Code de l'énergie, art. L.233-1).");
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
        sources: [S.omnibus, S.beges, S.dechets, S.mp, S.empco, S.energie, S.pay],
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
    short: "Auto-évaluation pédagogique des pratiques sur les quatre thèmes.",
    intro: "Évaluez vos pratiques et vos preuves sur quatre thèmes. Le résultat est un indice interne Sillon, non un score EcoVadis : la méthodologie de notation, les pondérations et les percentiles ne sont pas reproduits par cet outil. Aucune médaille ne peut être prédite.",
    calc: "4 thèmes · indice interne non officiel",
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
      const F = [];
      F.push({ lvl: "warn", t: "Cet indice est une grille pédagogique interne Sillon : il ne reproduit pas le score EcoVadis et ne permet pas de prédire une médaille. Les percentiles et seuils varient chaque mois ; l’éligibilité dépend aussi de la veille 360° et de restrictions sectorielles." });
      return {
        gauge: { val: tot, max: 100, label: "SCORE EST." },
        verdict: "Indice interne de maturité",
        summary: "Indice pédagogique Sillon : résultat non officiel, sans équivalence avec le score EcoVadis et sans prédiction de médaille.",
        kpis: th.map((t) => ({ l: t.lab, v: t.sc, u: "/100", s: `Poids ${t.w}` })),
        chart: { type: "radar", axes: th.map((t) => t.lab), values: th.map((t) => t.sc), rings: [[30, "Repère"], [60, "Intermédiaire"], [80, "Avancé"]] },
        findings: F,
        actions: [
          "Formaliser une politique signée par la direction pour chaque thème : c'est le premier critère noté.",
          "Joindre des preuves datées (procédures, rapports, certificats) : sans document, l'action n'est pas comptée.",
          "Publier au moins deux indicateurs chiffrés par thème avec leur évolution sur deux ans.",
          "Lancer une charte achats responsables : le thème Achats est souvent le plus faible des PME.",
        ],
        hyp: "Grille interne Sillon, sans validation ni équivalence avec le questionnaire ou l’algorithme EcoVadis. EcoVadis attribue les médailles selon des percentiles mondiaux (Top 1 %, 5 %, 15 %, 35 %) et publie des seuils mensuels variables. En novembre 2026, les seuils initiaux publiés étaient 89, 82, 75 et 67, mais ils peuvent évoluer au cours du mois. L’éligibilité dépend aussi du score minimal de 30 dans chacun des quatre thèmes réels, de la veille 360° et de restrictions sectorielles. Aucun résultat du module ne prédit une médaille.",
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
    id: "audit-iso", fam: "conformer", title: "Auto-évaluation ISO",
    short: "Grille de repérage avant une revue approfondie du système de management.",
    intro: "Auto-évaluation pédagogique d'un échantillon de points de contrôle. Ce module n'est ni un audit clause par clause, ni une détermination de conformité ou de certification. Attention : ISO 14001:2026 a remplacé l'édition 2015 en avril 2026 ; les listes de contrôle Sillon doivent encore être remappées et validées sur les textes complets des éditions en vigueur.",
    calc: "15 points de contrôle simplifiés · grille interne",
    icon: "clip",
    fields: [
      { type: "seg", id: "norme", label: "Norme", def: "14001", options: [["14001", "ISO 14001:2026"], ["45001", "ISO 45001:2018"], ["50001", "ISO 50001:2018"]] },
      { type: "checklist", id: "c14001", label: "ISO 14001 · management environnemental", states: ISOS, items: isoLists["14001"], showIf: { norme: "14001" } },
      { type: "checklist", id: "c45001", label: "ISO 45001 · santé et sécurité au travail", states: ISOS, items: isoLists["45001"], showIf: { norme: "45001" } },
      { type: "checklist", id: "c50001", label: "ISO 50001 · management de l'énergie", states: ISOS, items: isoLists["50001"], showIf: { norme: "50001" } },
    ],
    compute(v) {
      const n = v.norme || "14001", list = isoLists[n], st = v["c" + n] || {};
      const it = list.map((x) => ({ ...x, s: st[x.id] || x.def }));
      const pct = Math.round((it.reduce((a, x) => a + (x.s === "ok" ? 1 : x.s === "part" ? 0.5 : 0), 0) / it.length) * 100);
      const nc = it.filter((x) => x.s === "nc"), pa = it.filter((x) => x.s === "part");
      const F = [];
      nc.forEach((x) => F.push({ lvl: "warn", t: "§" + x.code + " " + x.label + " : point de contrôle déclaré non traité dans la grille Sillon ; qualifier l'écart au regard du texte intégral et des preuves." }));
      pa.slice(0, 4).forEach((x) => F.push({ lvl: "info", t: "§" + x.code + " " + x.label + " : point de contrôle à compléter et à documenter." }));
      if (!nc.length && !pa.length) F.push({ lvl: "ok", t: "Aucun écart déclaré sur cet échantillon : cela ne démontre pas la conformité à la norme." });
      return {
        gauge: { val: pct, max: 100, label: "COUVERTURE SILLON" },
        verdict: pct >= 85 && !nc.length ? "Avancement élevé sur la grille interne" : "Auto-évaluation à compléter",
        summary: "ISO " + n + " : " + (it.length - nc.length - pa.length) + " points conformes selon la déclaration, " + pa.length + " partiels, " + nc.length + " à traiter.",
        kpis: [
          { l: "Couverture de la grille", v: pct, u: "%", s: "Indice interne, non normatif" },
          { l: "Points à traiter", v: nc.length, u: "", s: "Sur cet échantillon de contrôle" },
          { l: "Points partiels", v: pa.length, u: "", s: "À documenter et vérifier" },
        ],
        chart: { type: "bars", unit: "points de contrôle", items: [{ l: "Déclarés conformes", v: it.length - nc.length - pa.length }, { l: "Partiels", v: pa.length }, { l: "À traiter", v: nc.length, hot: true }] },
        findings: F,
        actions: [
          "Vérifier la version de la norme et établir une matrice de correspondance avec les exigences officielles en vigueur.",
          "Réaliser un audit interne couvrant l'ensemble du domaine d'application, des processus et des exigences applicables.",
          "Documenter les constats, preuves, responsables, actions correctives et échéances.",
        ],
        hyp: "Grille Sillon simplifiée et non exhaustive : 15 points de contrôle génériques ou sélectionnés, avec des clauses héritées de versions antérieures. ISO 14001:2026 est publiée depuis avril 2026 ; ISO 45001:2018 et ISO 50001:2018 restent les éditions publiées en vigueur, avec amendements climat 2024. Les numéros de clauses, les exigences et les preuves doivent être revérifiés dans chaque édition officielle avant tout audit. Le pourcentage et le verdict ne préjugent ni d'un écart majeur/mineur, ni d'une décision de certification.",
        sources: [S.iso14001, S.iso45001, S.iso50001],
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
    short: "Simulez une note environnementale à partir d'une grille interne.",
    intro: "Depuis le 21 août 2026, les acheteurs publics doivent intégrer des considérations environnementales dans les critères d'attribution et les conditions d'exécution des marchés concernés. Ce simulateur applique une grille Sillon générique : il ne prédit pas la note d'un appel d'offres réel, dont les critères, la pondération et les preuves exigées figurent dans le règlement de consultation.",
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
          { l: "Écart au maximum du critère", v: nf(lost, 1), u: "pts", s: `Sur les ${w} points du critère environnemental` },
          { l: "Montant cumulé ciblé", v: nf((num(v.nb) * num(v.ticket)) / 1000), u: "k€", s: `${nf(num(v.nb))} consultations × montant moyen saisi` },
        ],
        chart: { type: "bars", unit: "pts /20", items: it.map((x) => ({ l: x.sh, v: x.p * x.s, max: x.p })) },
        findings: F,
        actions: [
          "Créer un bloc environnemental réutilisable pour le mémoire technique, avec chiffres et preuves.",
          "Proposer 2 ou 3 indicateurs suivis pendant l'exécution, avec un reporting trimestriel à l'acheteur.",
          "Calculer l'empreinte carbone d'une offre type (transport, matériaux, déchets) une fois, puis l'adapter.",
        ],
        hyp: "Barème fictif Sillon sur 20 points, sans valeur prédictive ni correspondance garantie avec les critères d'un acheteur. Chaque règlement de consultation fixe ses propres sous-critères, pondérations, exigences de preuve et modalités d'évaluation. La note doit être recalculée à partir du dossier réel.",
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
      F.push({ lvl: "info", t: "Une étude de France Stratégie publiée en 2016 a observé une association moyenne entre engagement RSE et performance économique. Ce résultat historique n'est ni une causalité démontrée pour chaque entreprise ni une prévision de gains pour votre simulation." });
      return {
        gauge: { val: isFinite(pb) ? Math.round(clamp((5 - pb) / 5, 0, 1) * 100) : 0, max: 100, label: "RETOUR", show: isFinite(pb) ? (pb < 1 ? nf(pb * 12) + " mois" : nf(pb, 1) + " ans") : "–" },
        verdict: van > 0 ? "VAN positive selon les hypothèses" : "VAN non positive selon les hypothèses",
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
        hyp: "Simulation simplifiée : économies d'énergie et déchets, coûts évités de turnover et marge associée au risque commercial estimé. Les taux de baisse, de perte client, de marge et le coût d'un départ sont des hypothèses utilisateur, non des gains garantis. VAN calculée sur 5 ans avec flux annuels constants et taux d'actualisation fixe de 5 % ; délai de retour simple inv/net. Le modèle n'intègre pas le calendrier réel des investissements, fiscalité, inflation, financement, risques de double comptage ni incertitudes. Construire un business case avec scénarios et données historiques avant décision.",
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
    intro: "Collez un texte : site, plaquette, fiche produit, post. Le moteur repère certaines expressions et les rapproche de règles ciblées. Il ne vérifie pas exhaustivement le droit applicable ni la véracité des preuves : absence d'alerte ne signifie pas conformité juridique.",
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
        gauge: { val: score, max: 100, label: "INDICE INTERNE" },
        verdict: nc >= 3 ? "Signaux de risque nombreux" : nc >= 1 ? "Signaux de risque à revoir" : nw ? "Points à préciser" : "Aucun signal détecté — relecture nécessaire",
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
        hyp: "Indice heuristique interne : pénalités/bonus par expressions repérées et par présence de motifs chiffrés. Ce score n'est ni un score juridique ni une probabilité de conformité. Les règles automatiques peuvent produire des faux positifs et faux négatifs ; elles ne contrôlent ni les preuves, ni le contexte, ni l'ensemble des obligations. Faire relire les allégations à enjeu par un juriste compétent.",
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
        gauge: { val: score, max: 100, label: "INDICE INTERNE" },
        verdict: score >= 75 ? "Signaux documentaires nombreux" : score >= 45 ? "Signaux à renforcer" : "Peu de signaux documentaires",
        summary: `Indice interne de présence de signaux documentaires : ${score}/100. Il ne vérifie ni l'authenticité des preuves ni la conformité des allégations.`,
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
        hyp: "Grille heuristique interne Sillon sur 100 points. Le texte est seulement analysé par expressions régulières : le module compte certains chiffres, années, périmètres et labels, sans vérifier les sources, les calculs, les pièces justificatives ou la validité d'un label. Un score élevé n'établit pas la crédibilité réelle de la communication.",
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
