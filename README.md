# Sillon · copilotes RSE pour PME et ETI

**Sillon** aide les PME et ETI françaises à structurer leur démarche RSE avec 13 copilotes. Ils calculent avec des facteurs publics (ADEME, EFRAG, EcoVadis), appliquent les seuils réglementaires en vigueur en novembre 2026, lisent les documents de l'entreprise, rédigent une analyse avec Claude et produisent un rapport PDF, Excel ou une présentation.

**Site : https://sillon-rse.netlify.app** (voir [DEPLOIEMENT.md](DEPLOIEMENT.md) pour la mise en ligne)

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
- **Import de documents** : PDF, image ou texte ; l'IA (Mistral) extrait les chiffres et remplit les champs.
- **Analyse par l'IA (Mistral)** de chaque copilote, avec un plan à 30 jours, 90 jours et 12 mois.
- **Assistant** qui connaît le profil et tous les résultats.
- **Plan d'action global** trié par impact et effort, avec responsable, échéance et statut.
- **Historique et référence** : courbe d'évolution des scores et comparaison avant/après.
- **Veille réglementaire** : frise des échéances 2026-2030, celles qui concernent l'entreprise sont mises en avant.
- **Exports** : PDF consolidé, classeur Excel, mode présentation plein écran.
- **Français** (version anglaise en préparation), thème clair et sombre, navigation au clavier, respect de `prefers-reduced-motion`.

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
npm install
npm test             # tests de calcul et de passerelles (Node 18+)
npm run test:e2e     # tests dans un vrai navigateur (npx playwright install chromium)
npx netlify dev      # site + fonction en local (clé dans un fichier .env)
```

### Analyse par l'IA et contacts

- Les visiteurs n'ont rien à configurer. Avant la première analyse, le premier import ou le premier export, ils renseignent leurs coordonnées (avec consentement RGPD).
- La fonction serveur `netlify/functions/claude.mjs` appelle l'API de Mistral AI (offre gratuite, entreprise française) avec la clé du propriétaire, et bascule sur Groq si un quota est atteint, stockée dans les variables d'environnement Netlify. Elle vérifie l'origine des appels, limite l'usage par IP et par jour, et restreint l'assistant aux sujets RSE.
- Les formulaires Netlify envoient au propriétaire un e-mail à chaque nouveau contact, demande d'accompagnement ou rapport téléchargé.

## Architecture

| Fichier | Rôle |
|---|---|
| `referentiels.js` | Données de référence datées : facteurs d'émission, seuils réglementaires, échéances |
| `copilots.js` | Les 13 copilotes : champs, calculs, sources (aucune dépendance au DOM, testable sous Node) |
| `core.js` | État, profil, liens entre copilotes, historique, plan d'action, veille, appels à l'IA, téléchargements |
| `views.js` | Vues : accueil, copilote, profil, plan, veille, méthode, rapport |
| `extras.js` | Import de documents, assistant, réglages IA, mode présentation |
| `exports.js` | Export PDF (jsPDF) et Excel (SheetJS) |
| `main.js` | Scène 3D (Three.js) et routage |
| `legal.js` | Politique de confidentialité et mentions légales |
| `netlify/functions/claude.mjs` | Passerelle sécurisée vers l'IA (Mistral, secours Groq) |
| `netlify/functions/contact.mjs` | Réception filtrée des contacts et demandes |
| `netlify/functions/dossier.mjs` | Sauvegarde en ligne des dossiers (Netlify Blobs) |
| `netlify.toml` | Configuration Netlify |
| `i18n.js` | Textes français et anglais |
| `tests/` | Tests des calculs et de la passerelle (`npm test`) |

Bibliothèques et polices hébergées dans le dépôt (`vendor/`, `fonts/`) : Three.js r128, jsPDF 2.5.1, SheetJS 0.18.5, PDF.js 3.11.174, Bricolage Grotesque et IBM Plex (OFL). Voir [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Conformité

- **Aucun cookie ni traceur**, aucune requête vers un service tiers (polices et scripts auto-hébergés, politique de sécurité CSP stricte dans `netlify.toml`).
- Pages : confidentialité, CGU, politique cookies, mentions légales, crédits et licences, accessibilité, **Mes données** (export, effacement, désinscription, demande de suppression).
- Fiche contact : consentement explicite et attestation de majorité et d'usage professionnel, cases non pré-cochées.
- Adresses IP jamais stockées en clair (empreinte salée, effacée sous 24 h).
- Accessibilité : audit axe-core WCAG 2.1 A/AA sans violation, navigation clavier, focus piégé dans les fenêtres.
- Coordonnées de l'éditeur à compléter dans l'objet `BUSINESS` en haut de `legal.js`.

## Feuille de route

- Ratios monétaires ADEME par secteur pour le scope 3
- Traduction anglaise des questions détaillées
- Sauvegarde partagée entre plusieurs utilisateurs d'une même entreprise
- Relecture juridique des copilotes Réglementation et Greenwashing

## Auteur

Projet conçu par **Zakaria Ghannam**, avec l'aide de Claude (Anthropic).

Licence MIT.
