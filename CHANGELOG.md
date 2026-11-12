# Journal des versions

## 4.1.0 · 12 novembre 2026

- Plan d'action : une action n'est enregistrée qu'avec un intitulé (formulaire Enregistrer / Annuler) ; les actions vides ne sont plus comptées ni exportées ; suppression possible d'une action personnalisée.
- Exports PDF et Excel libres, sans coordonnées, avec un message de confirmation ou d'échec affiché sous les boutons.
- Coordonnées : besoin annoncé avant le clic ; l'accord pour être recontacté devient une case séparée et facultative.
- Profil : un profil enregistré sans nom est affiché comme enregistré, avec la mention du nom à compléter.
- Sources : libellés descriptifs à la place des liens « lien ».
- Version anglaise retirée de l'interface tant qu'elle n'est pas complète.
- Correction d'un débordement en largeur sur téléphone (page Fournisseurs).
- Tests navigateur étendus : 13 copilotes (champs vides, valeurs négatives, exports), téléphone et tablette, politique de sécurité de production.

## 4.0.0 · 11 novembre 2026

- **Sauvegarde en ligne facultative** : dossier enregistré sous un code secret, repris sur un autre appareil ou partagé avec un collègue, sans compte ni mot de passe.
- **Données de référence séparées** dans `referentiels.js` (facteurs d'émission, seuils réglementaires, échéances), avec une date de version.
- **Passerelle `/api/contact`** : filtre anti-robots, contrôle de l'e-mail et limite d'envois avant transmission au formulaire.
- **Alertes techniques** par e-mail au propriétaire (IA indisponible, plafond quotidien atteint), une fois par jour au plus.
- **Chargement plus léger** : la 3D et le module PDF ne sont chargés qu'au besoin (environ 1 Mo de moins à l'ouverture).
- **Parcours guidé** en quatre étapes sur l'accueil.
- **Tests de bout en bout** dans un vrai navigateur (7 scénarios) en plus des tests de calcul et de passerelles, lancés à chaque envoi sur GitHub.

## 3.2.0 · 7 novembre 2026

- Polices et bibliothèques auto-hébergées : plus aucune requête vers Google Fonts ou cdnjs.
- En-têtes de sécurité : CSP stricte, HSTS.
- Nouvelles pages : CGU, politique cookies, crédits et licences, accessibilité, Mes données.
- Bandeau d'information (aucun cookie, aucun traceur), sans demande d'acceptation inutile.
- Fiche contact : attestation de majorité et d'usage professionnel ; champ « langue » supprimé.
- Mes données : export JSON, effacement local avec confirmation, désinscription, demande de suppression envoyée à l'éditeur.
- Adresses IP hachées et compteurs effacés sous 24 h.
- Contrastes corrigés (WCAG AA), focus clavier piégé dans les fenêtres, audit axe-core sans violation.
- Formulations sans promesse non prouvée (délai de réponse, « expert »).

## 3.1.0 · 6 novembre 2026

- L'IA passe sur Mistral AI (offre gratuite, entreprise française), avec Groq en secours facultatif. Plus aucun coût d'IA au démarrage.

## 3.0.0 · 6 novembre 2026

- Mise en production sur Netlify : plus aucune clé à saisir pour les visiteurs.
- Passerelle serveur vers l'IA : clé protégée, contrôle d'origine, limites par IP et globale, assistant restreint à la RSE, réponses en continu.
- Fiche contact (RGPD) avant l'IA, l'import et les exports ; notification e-mail au propriétaire à chaque contact, demande d'accompagnement et rapport téléchargé.
- Bouton « Être accompagné » sur chaque copilote et dans le rapport.
- Politique de confidentialité et mentions légales.
- Tests de la passerelle.

## 2.0.0 · 4 novembre 2026

- Nouveau copilote Bilan carbone (scopes 1, 2 et 3, facteurs ADEME).
- Profil d'entreprise partagé entre les copilotes.
- Copilotes reliés : bilan carbone vers VSME, Benchmark, EcoVadis et marchés publics ; Greenwashing vers Visibilité ; Fournisseurs vers Benchmark ; Audit ISO vers marchés publics.
- Import de documents PDF, image ou texte avec extraction par Claude.
- Assistant de conversation sur l'ensemble des résultats.
- Plan d'action global (impact, effort, responsable, échéance, statut).
- Historique des scores et comparaison avec une référence.
- Veille réglementaire 2026-2030.
- Mode présentation, export Excel, version anglaise, améliorations d'accessibilité.
- Analyse par clé API Anthropic hors de claude.ai.
- Tests automatiques des calculs et intégration continue.

## 1.0.0 · 4 novembre 2026

- 12 copilotes, scène 3D, analyse par Claude, export PDF.
- Seuils à jour : Omnibus I, EmpCo, marchés publics au 21/08/2026, médailles EcoVadis 2025.
