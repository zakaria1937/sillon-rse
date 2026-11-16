/* Sillon — données de référence : facteurs d'émission, seuils réglementaires et échéances.
   C'est le seul fichier à modifier quand une loi ou un facteur change. Mettre à jour `version` à chaque modification. */
(function () {
  const num = (v, d = 0) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : d; };
  window.SILLON_REF = {
    version: "2026-11-16",
    // Facteurs de démonstration non rapprochés individuellement d’une fiche ADEME : ne pas les présenter comme des valeurs officielles validées.
    facteurs: { gaz: 0.227, fioul: 3.25, gazole: 3.16, essence: 2.8, r410a: 2088, elec: 0.052, train: 0.0029, avc: 0.258, avl: 0.152, voit: 0.218, ordinateurPortable: 156 },
    facteursStatut: { source: "ADEME — Base Empreinte", versionBase: "à confirmer pour chaque fiche", statut: "ordres de grandeur non vérifiés individuellement", dateVerification: null, usage: "simulation pédagogique uniquement tant que les fiches, unités, périmètres et années ne sont pas documentés" },
    // Énergie des usages d'IA, en Wh.
    ia: { requeteStandard: 0.3, requeteLongue: 3, image: 2.9 },
    // Seuils réglementaires (effectifs en salariés, chiffre d'affaires en M€, énergie en GWh, surface en m²).
    seuils: { csrdEffectif: 1000, csrdCA: 450, csdddEffectif: 5000, csdddCA: 1500, begesEffectif: 500, sapin2Effectif: 500, sapin2CA: 100, tertiaireSurface: 1000, auditEnergieGWh: 2.75, smeEnergieGWh: 23.6 },
    // EcoVadis : percentiles officiels ; seuils de score publiés mensuellement et variables.
    ecovadis: { percentiles: { platine: 99, or: 95, argent: 85, bronze: 65 }, seuilsNovembre2026: { platine: 89, or: 82, argent: 75, bronze: 67 }, badgeCommitted: 45, plancherTheme: 30, dateSeuils: "2026-11-01", statut: "instantané mensuel initial, seuils susceptibles d’évoluer" },
    // Échéances réglementaires ; `ap(profil)` dit si l'échéance concerne l'entreprise.
    echeances: [
    { d: "2026-02-26", t: "Omnibus I publié au Journal officiel de l'UE", s: "CSRD et CSDDD recentrées sur les grandes entreprises.", ap: () => true },
    { d: "2026-03-18", t: "Entrée en vigueur de l'Omnibus I", s: "CSRD : plus de 1 000 salariés et plus de 450 M€ de CA. Demandes aux PME plafonnées au niveau VSME.", ap: () => true },
    { d: "2026-06-07", t: "Date limite de transposition de la directive transparence salariale", s: "Directive (UE) 2023/970, art. 34 : échéance de transposition par les États membres ; vérifier le texte français applicable.", ap: () => true, check: true },
    { d: "2026-08-21", t: "Critère environnemental obligatoire dans les marchés publics", s: "Au moins un critère d'attribution et une condition d'exécution environnementaux.", ap: (p) => p.mp === "oui" },
    { d: "2026-09-27", t: "Application de la directive EmpCo", s: "Fin des allégations génériques et de la neutralité carbone par compensation.", ap: (p) => p.b2c === "oui" },
    { d: "2026-09-30", t: "Déclaration annuelle OPERAT (décret tertiaire)", s: "Consommations de l'année précédente pour les bâtiments de 1 000 m² et plus.", ap: (p) => num(p.surf) >= 1000 },
    { d: "2026-10-11", t: "Premier audit énergétique pour les entreprises nouvellement assujetties", s: "Loi n° 2025-391, art. 25 : première échéance au 11/10/2026 pour les entreprises nouvellement soumises (moyenne de consommation d’énergie finale, seuil ≥ 2,75 GWh/an, hors système de management de l’énergie certifié).", ap: (p) => num(p.gwh) >= 2.75 && num(p.gwh) < 23.6, check: true },
    { d: "2027-03-01", t: "Publication de l'index égalité professionnelle", s: "Chaque année, dès 50 salariés.", ap: (p) => num(p.eff) >= 50 },
    { d: "2027-03-19", t: "Transposition de la CSRD révisée", s: "Les États membres intègrent les nouveaux seuils dans leur droit.", ap: (p) => num(p.effM) > 1000 && num(p.ca) > 450 },
    { d: "2027-06-07", t: "Premiers rapports sur les écarts de rémunération", s: "Directive (UE) 2023/970, art. 9 : ≥ 250 salariés chaque année ; 150 à 249 salariés tous les trois ans, sur l’année civile précédente. Vérifier les modalités françaises de transposition.", ap: (p) => num(p.eff) >= 150, check: true },
    { d: "2027-09-30", t: "Déclaration annuelle OPERAT", s: "Consommations 2026.", ap: (p) => num(p.surf) >= 1000 },
    { d: "2027-10-11", t: "Échéance du système de management de l’énergie", s: "Directive (UE) 2023/1791, art. 11 : système certifié requis au plus tard le 11/10/2027 pour les entreprises dont la consommation annuelle moyenne des trois années précédentes dépasse 85 TJ (≈ 23,6 GWh). En France, voir le Code de l’énergie, art. L.233-1.", ap: (p) => num(p.gwh) >= 23.6, check: true },
    { d: "2028-07-26", t: "Transposition de la CSDDD", s: "Devoir de vigilance européen : plus de 5 000 salariés et 1,5 Md€ de CA.", ap: (p) => num(p.effM) > 5000 },
    { d: "2029-07-26", t: "Application de la CSDDD", s: "Plans de vigilance et due diligence obligatoires.", ap: (p) => num(p.effM) > 5000 },
    { d: "2030-12-31", t: "Décret tertiaire : -40 % de consommation", s: "Objectif par rapport à l'année de référence choisie (2010 au plus tôt).", ap: (p) => num(p.surf) >= 1000 },
    { d: "2031-06-07", t: "Rapports sur les écarts de rémunération pour les entreprises de 100 à 149 salariés", s: "Directive (UE) 2023/970, art. 9 : tous les trois ans à compter du 07/06/2031, sur l’année civile précédente. Vérifier les modalités françaises de transposition.", ap: (p) => num(p.eff) >= 100 && num(p.eff) < 150, check: true },
  ],
  };
})();
