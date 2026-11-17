# Sillon · copilotes RSE pour PME et ETI

**Sillon** aide les PME et ETI françaises à structurer leur démarche RSE avec 13 copilotes. Ils mobilisent, selon les modules, des sources publiques (ADEME, EFRAG, textes officiels, OCDE, ISO et EcoVadis), des calculs documentés et des grilles internes de diagnostic. Ils aident à lire des documents, préparer une analyse assistée par IA et produire un rapport PDF, Excel ou une présentation. Les indices internes ne sont pas des scores officiels ni des certifications.

**Site : https://sillon-rse.netlify.app** (voir [DEPLOIEMENT.md](DEPLOIEMENT.md) pour la mise en ligne)

![Tests](https://github.com/zakaria1937/sillon-rse/actions/workflows/tests.yml/badge.svg)

## Les 13 copilotes

| Famille | Copilote | Ce qu'il calcule |
|---|---|---|
| Mesurer | Estimation GES simplifiée | Estimation partielle de postes sélectionnés ; facteurs préremplis à vérifier |
| Mesurer | Carbone IA | kWh et kgCO2e des usages d'IA générative, matériel compris |
| Mesurer | Fournisseurs | Indice interne d’exposition des achats : zone × catégorie, pondéré par la dépense |
| Mesurer | Diagnostic de maturité RSE | Auto-évaluation interne sur 5 piliers et 20 pratiques, sans benchmark sectoriel |
| Se conformer | Réglementation | Obligations applicables selon la taille (Omnibus, BEGES, Sapin II, décret tertiaire…) |
| Se conformer | Reporting VSME | Complétude des points B1 à B11 et C1 à C9, charge de travail |
| Se conformer | EcoVadis | Auto-évaluation interne non équivalente au score EcoVadis et sans prédiction de médaille |
| Se conformer | Auto-évaluation ISO | Grille simplifiée non exhaustive ; ne conclut ni à la conformité ni à la certification |
| Convaincre | Marchés publics | Simulation indicative à recalculer selon chaque règlement de consultation |
| Convaincre | Greenwashing | Repérage heuristique de formulations ciblées ; ne remplace pas une validation juridique |
| Convaincre | Visibilité RSE | Indice interne de signaux documentaires, sans vérification des preuves |
| Convaincre | ROI de la RSE | Simulation de gains, VAN sur 5 ans et délai de retour selon hypothèses utilisateur |
| Convaincre | Objections | Argumentaire sourcé face aux freins internes |

## Fonctionnalités

- **Profil d'entreprise partagé** : renseigné une fois, repris par tous les copilotes.
- **Copilotes reliés** : l’estimation GES peut alimenter une première réflexion sur le point B3 de la VSME, le diagnostic de maturité et les marchés publics ; l'indice heuristique Greenwashing alimente les signaux de Visibilité RSE.
- **Import de documents** : PDF, image ou texte ; l'IA (Mistral) extrait les chiffres et remplit les champs.
- **Analyse par l'IA (Mistral)** de chaque copilote, avec un plan à 30 jours, 90 jours et 12 mois.
- **Assistant** qui connaît le profil et tous les résultats.
- **Plan d'action global** trié par impact et effort, avec responsable, échéance et statut.
- **Historique et référence** : courbe d'évolution des scores et comparaison avant/après.
- **Veille réglementaire** : frise des échéances 2026-2030, celles qui concernent l'entreprise sont mises en avant.
- **Exports et portabilité** : PDF consolidé, classeur Excel, mode présentation plein écran, export JSON du dossier et restauration contrôlée depuis une sauvegarde.
- **Sauvegarde en ligne historique** : dossier chiffré côté navigateur (AES-GCM) avant transmission ; le code secret est nécessaire pour le restaurer. Le serveur ne reçoit pas le dossier en clair.
- **Espace entreprise en préversion** : fondation Supabase/PostgreSQL RLS, connexion avec refresh token HttpOnly, organisations, dossiers cloud, rôles par membre, journal d'activité et import ponctuel du dossier local (sans conversations IA ni coordonnées de contact). Cette fonction reste inactive tant que le projet Supabase et les variables Netlify ne sont pas configurés ; l'import crée une copie indépendante, sans synchronisation continue.
- **Français** (version anglaise en préparation), thème clair et sombre, navigation au clavier, respect de `prefers-reduced-motion`.

## Méthode

Chaque copilote affiche sa formule, ses hypothèses et ses sources (page « Méthode » dans l'application). Principales références :

- ADEME, Base Empreinte et impactCO2 (facteurs d'émission France)
- EFRAG, norme VSME (déc. 2024) et recommandation de la Commission européenne (juil. 2025)
- Directive Omnibus I (JOUE du 26/02/2026, en vigueur le 18/03/2026)
- Directive (UE) 2024/825 « EmpCo », applicable au 27/09/2026
- Loi Climat et résilience art. 35 : critère environnemental des marchés publics au 21/08/2026
- OCDE, Guide sur le devoir de diligence pour une conduite responsable des entreprises (2018)
- EcoVadis, percentiles et seuils mensuels des médailles
- Google (0,24 Wh par requête Gemini médiane, 2025), OpenAI (0,34 Wh), Luccioni et al. (2023)

Les résultats sont des estimations ou indices internes. Ils ne remplacent ni un BEGES réglementaire, ni une analyse de risques fournisseurs/diligence raisonnable, ni un audit de certification, ni un conseil juridique. Les indices Diagnostic de maturité, Marchés publics, Greenwashing et Visibilité sont des grilles heuristiques conçues pour l'outil, pas des moyennes sectorielles mesurées ni des validations réglementaires.

## Données, sauvegarde et limites d'accès

Voir [SECURITE_DONNEES.md](docs/SECURITE_DONNEES.md) pour le modèle de stockage, les sauvegardes et les limites actuelles. Le site actuellement déployé reste un dossier de travail par navigateur/session. La branche de préparation SaaS ajoute le schéma RLS, les passerelles d'authentification et une interface préversion, mais aucun projet Supabase n'est relié et aucun compte d'entreprise n'est encore provisionné. La procédure de configuration est décrite dans [CONFIGURATION_SUPABASE_NETLIFY.md](docs/CONFIGURATION_SUPABASE_NETLIFY.md) et l'état technique dans [ARCHITECTURE_SAAS_MULTI_ENTREPRISES.md](docs/ARCHITECTURE_SAAS_MULTI_ENTREPRISES.md). Ne saisissez pas de données sensibles dans la préversion et n'utilisez pas Sillon comme GED.

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
| `netlify/functions/dossier.mjs` | Sauvegarde en ligne historique des dossiers (Netlify Blobs) |
| `netlify/functions/auth.mjs` | Session Supabase, refresh token HttpOnly |
| `netlify/functions/tenant.mjs` | API organisations/dossiers soumise à PostgreSQL RLS |
| `saas.js` | Interface de connexion et espace entreprise en préversion |
| `supabase/migrations/0001_multi_tenant_foundation.sql` | Schéma multi-entreprises, rôles et politiques RLS |
| `netlify.toml` | Configuration Netlify |
| `i18n.js` | Textes français et anglais |
| `tests/` | Tests unitaires, passerelles, sessions, schéma SQL et interface (`npm test`) ; tests E2E navigateur |

Bibliothèques et polices hébergées dans le dépôt (`vendor/`, `fonts/`) : Three.js r128, jsPDF 2.5.1, SheetJS 0.18.5, PDF.js 3.11.174, Gloock, Newsreader, Atkinson Hyperlegible Next et Martian Mono (OFL). Relief : IGN RGE ALTI, Licence Ouverte 2.0. Voir [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Conformité

- **Aucun cookie ni traceur sur l'espace public**, aucune requête vers un service tiers (polices et scripts auto-hébergés, politique CSP stricte). Si l'espace entreprise est activé, il utilise un cookie de session strictement nécessaire, HttpOnly et SameSite=Strict.
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
