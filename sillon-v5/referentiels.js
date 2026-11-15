/* Sillon — données de référence : facteurs d'émission, seuils réglementaires et échéances.
   C'est le seul fichier à modifier quand une loi ou un facteur change. Mettre à jour `version` à chaque modification. */
(function () {
  const num = (v, d = 0) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : d; };
  window.SILLON_REF = {
    version: "2026-11-11",
    // Facteurs d'émission ADEME (Base Empreinte, impactCO2), en kgCO2e par unité.
    facteurs: { gaz: 0.227, fioul: 3.25, gazole: 3.16, essence: 2.8, r410a: 2088, elec: 0.052, train: 0.0029, avc: 0.258, avl: 0.152, voit: 0.218, ordinateurPortable: 156 },
    // Énergie des usages d'IA, en Wh.
    ia: { requeteStandard: 0.3, requeteLongue: 3, image: 2.9 },
    // Seuils réglementaires (effectifs en salariés, chiffre d'affaires en M€, énergie en GWh, surface en m²).
    seuils: { csrdEffectif: 1000, csrdCA: 450, csdddEffectif: 5000, csdddCA: 1500, begesEffectif: 500, sapin2Effectif: 500, sapin2CA: 100, tertiaireSurface: 1000, auditEnergieGWh: 2.75, smeEnergieGWh: 23.6 },
    // Médailles EcoVadis : score indicatif minimal (au 1er juillet 2024) et seuil bloquant par thème.
    ecovadis: { platine: 81, or: 73, argent: 66, bronze: 58, committed: 45, plancherTheme: 30 },
    // Échéances réglementaires ; `ap(profil)` dit si l'échéance concerne l'entreprise.
    echeances: [
    { d: "2026-02-26", t: "Omnibus I publié au Journal officiel de l'UE", s: "CSRD et CSDDD recentrées sur les grandes entreprises.", ap: () => true },
    { d: "2026-03-18", t: "Entrée en vigueur de l'Omnibus I", s: "CSRD : plus de 1 000 salariés et plus de 450 M€ de CA. Demandes aux PME plafonnées au niveau VSME.", ap: () => true },
    { d: "2026-06-07", t: "Transposition de la directive transparence salariale", s: "Directive (UE) 2023/970 : écarts de rémunération et transparence à l'embauche.", ap: (p) => num(p.eff) >= 100, check: true },
    { d: "2026-08-21", t: "Critère environnemental obligatoire dans les marchés publics", s: "Au moins un critère d'attribution et une condition d'exécution environnementaux.", ap: (p) => p.mp === "oui" },
    { d: "2026-09-27", t: "Application de la directive EmpCo", s: "Fin des allégations génériques et de la neutralité carbone par compensation.", ap: (p) => p.b2c === "oui" },
    { d: "2026-09-30", t: "Déclaration annuelle OPERAT (décret tertiaire)", s: "Consommations de l'année précédente pour les bâtiments de 1 000 m² et plus.", ap: (p) => num(p.surf) >= 1000 },
    { d: "2026-10-11", t: "Audit énergétique selon la nouvelle directive efficacité énergétique", s: "Seuil fondé sur la consommation (environ 2,75 GWh/an).", ap: (p) => num(p.gwh) > 2.75, check: true },
    { d: "2027-03-01", t: "Publication de l'index égalité professionnelle", s: "Chaque année, dès 50 salariés.", ap: (p) => num(p.eff) >= 50 },
    { d: "2027-03-19", t: "Transposition de la CSRD révisée", s: "Les États membres intègrent les nouveaux seuils dans leur droit.", ap: (p) => num(p.effM) > 1000 && num(p.ca) > 450 },
    { d: "2027-06-07", t: "Premiers rapports d'écart de rémunération", s: "Entreprises de 150 salariés et plus, selon la transposition française.", ap: (p) => num(p.eff) >= 150, check: true },
    { d: "2027-09-30", t: "Déclaration annuelle OPERAT", s: "Consommations 2026.", ap: (p) => num(p.surf) >= 1000 },
    { d: "2027-10-11", t: "Système de management de l'énergie (ISO 50001)", s: "Au-delà d'environ 23,6 GWh/an.", ap: (p) => num(p.gwh) > 23.6, check: true },
    { d: "2028-07-26", t: "Transposition de la CSDDD", s: "Devoir de vigilance européen : plus de 5 000 salariés et 1,5 Md€ de CA.", ap: (p) => num(p.effM) > 5000 },
    { d: "2029-07-26", t: "Application de la CSDDD", s: "Plans de vigilance et due diligence obligatoires.", ap: (p) => num(p.effM) > 5000 },
    { d: "2030-12-31", t: "Décret tertiaire : -40 % de consommation", s: "Objectif par rapport à l'année de référence choisie (2010 au plus tôt).", ap: (p) => num(p.surf) >= 1000 },
  ],
  };
})();
