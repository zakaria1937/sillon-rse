# Sillon · copilotes RSE pour PME et ETI

**Sillon** aide les PME et ETI françaises à structurer leur démarche RSE avec 13 copilotes. Ils calculent avec des facteurs publics (ADEME, EFRAG, EcoVadis), appliquent les seuils réglementaires en vigueur en novembre 2026, lisent les documents de l'entreprise, rédigent une analyse avec Claude et produisent un rapport PDF, Excel ou une présentation.

**Démo en ligne : https://zakaria1937.github.io/sillon-rse/**

![Tests](https://github.com/zakaria1937/sillon-rse/actions/workflows/tests.yml/badge.svg)

## Les 13 copilotes

| Famille | Copilote | Ce qu'il calcule |
|---|---|---|
| Mesurer | Bilan carbone | Scopes 1, 2 et 3 avec les facteurs ADEME |
| Mesurer | Carbone IA | kWh et kgCO2e des usages d'IA générative, matériel compris |
| Mesurer | Fournisseurs | Risque RSE des achats : zone × catégorie × certification, pondéré par la dépense |
| Mesurer | Benchmark RSE | Maturité sur 5 piliers et 20 pratiques, radar et paliers |
| Se conformer | Réglementation | Obligations applicables selon la taille (Omnibus, BEGES, Sapin II, décret tertiaire…) |
| Se conformer | Reporting VSME | Complétude des points B1 à B11 et C1 à C9, charge de travail |
| Se conformer | EcoVadis | Score estimé, pondération sectorielle, médaille atteignable |
| Se conformer | Audit ISO | Conformité ISO 14001, 45001 ou 50001, écarts bloquants |
| Convaincre | Marchés publics | Note sur le critère environnemental obligatoire depuis le 21/08/2026 |
| Convaincre | Greenwashing | Formulations à risque (EmpCo, AGEC, loi Climat) surlignées dans le texte |
| Convaincre | Visibilité RSE | Crédibilité de la communication RSE en ligne |
| Convaincre | ROI de la RSE | Gains annuels, VAN sur 5 ans, délai de retour |
| Convaincre | Objections | Argumentaire sourcé face aux freins internes |

## Fonctionnalités

- **Profil d'entreprise partagé** : renseigné une fois, repris par tous les copilotes.
- **Copilotes reliés** : le bilan carbone remplit le point B3 de la VSME, le Benchmark et les marchés publics ; le score Greenwashing alimente Visibilité RSE.
- **Import de documents** : PDF, image ou texte ; Claude extrait les chiffres et remplit les champs.
- **Analyse par Claude** de chaque copilote, avec un plan à 30 jours, 90 jours et 12 mois.
- **Assistant** qui connaît le profil et tous les résultats.
- **Plan d'action global** trié par impact et effort, avec responsable, échéance et statut.
- **Historique et référence** : courbe d'évolution des scores et comparaison avant/après.
- **Veille réglementaire** : frise des échéances 2026-2030, celles qui concernent l'entreprise sont mises en avant.
- **Exports** : PDF consolidé, classeur Excel, mode présentation plein écran.
- **Français et anglais**, thème clair et sombre, navigation au clavier, respect de `prefers-reduced-motion`.

## Méthode

Chaque copilote affiche sa formule, ses hypothèses et ses sources (page « Méthode » dans l'application). Principales références :

- ADEME, Base Empreinte et impactCO2 (facteurs d'émission France)
- EFRAG, norme VSME (déc. 2024) et recommandation de la Commission européenne (juil. 2025)
- Directive Omnibus I (JOUE du 26/02/2026, en vigueur le 18/03/2026)
- Directive (UE) 2024/825 « EmpCo », applicable au 27/09/2026
- Loi Climat et résilience art. 35 : critère environnemental des marchés publics au 21/08/2026
- EcoVadis, règles des médailles 2025
- Google (0,24 Wh par requête Gemini médiane, 2025), OpenAI (0,34 Wh), Luccioni et al. (2023)

Les résultats sont des estimations. Ils ne remplacent ni un bilan GES réglementaire, ni un audit de certification, ni un conseil juridique. Les barèmes Benchmark, Marchés publics et Visibilité sont des grilles de maturité conçues pour l'outil, pas des moyennes sectorielles mesurées.

## Lancer en local

Aucune compilation : ce sont des fichiers HTML et JavaScript statiques.

```bash
git clone https://github.com/zakaria1937/sillon-rse.git
cd sillon-rse
npx serve .          # ou : python3 -m http.server
npm test             # tests des calculs (Node 18+)
```

### Analyse par Claude

- **Dans claude.ai**, l'analyse utilise le compte Claude de la personne qui ouvre la page, après son accord.
- **Ailleurs** (GitHub Pages, local), cliquez sur l'icône réglages et collez votre clé API Anthropic. Elle reste dans le navigateur (`localStorage`) et n'est envoyée qu'à `api.anthropic.com`. Pour un usage public, placez plutôt la clé derrière une petite fonction serveur.

## Architecture

| Fichier | Rôle |
|---|---|
| `copilots.js` | Les 13 copilotes : champs, calculs, sources (aucune dépendance au DOM, testable sous Node) |
| `core.js` | État, profil, liens entre copilotes, historique, plan d'action, veille, appels à Claude, téléchargements |
| `views.js` | Vues : accueil, copilote, profil, plan, veille, méthode, rapport |
| `extras.js` | Import de documents, assistant, réglages IA, mode présentation |
| `exports.js` | Export PDF (jsPDF) et Excel (SheetJS) |
| `main.js` | Scène 3D (Three.js) et routage |
| `i18n.js` | Textes français et anglais |
| `tests/` | Tests des calculs (`node --test`) |

Bibliothèques chargées depuis cdnjs : Three.js r128, jsPDF 2.5.1, SheetJS 0.18.5, pdf.js 3.11.174.

## Feuille de route

- Ratios monétaires ADEME par secteur pour le scope 3
- Traduction anglaise des questions détaillées
- Sauvegarde partagée entre plusieurs utilisateurs d'une même entreprise
- Relecture juridique des copilotes Réglementation et Greenwashing

## Auteur

Projet conçu par **Zakaria Ghannam**, avec Claude (Anthropic).

Licence MIT.
