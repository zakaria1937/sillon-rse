# Architecture SaaS multi-entreprises — Sillon

## Décision d'architecture proposée

La fondation cible repose sur **Supabase Auth + PostgreSQL avec Row Level Security (RLS)**. Ce choix fournit une identité gérée, une base relationnelle et une isolation des lignes au niveau de la base. La migration SQL de référence est `supabase/migrations/0001_multi_tenant_foundation.sql`.

**État réel : fondation préparatoire uniquement.** Le site Netlify actuel continue de fonctionner avec son stockage navigateur et ses fonctions Netlify. Une interface de connexion et un espace organisations/dossiers sont préparés, mais aucun projet Supabase n'est connecté, aucun compte d'entreprise n'est provisionné et aucune donnée de production n'est migrée. Les passerelles Netlify indépendantes (`/api/auth` et `/api/tenant`) sont toutefois préparées ; elles restent inactives tant que les variables Supabase ne sont pas configurées. Cette séparation évite de présenter un faux mode collaboratif ou de créer une sécurité uniquement visuelle.

## Modèle de données

- `organizations` : une entreprise/organisation.
- `organization_memberships` : relation utilisateur–organisation et rôle.
- `dossiers` : dossiers RSE appartenant obligatoirement à une organisation, données JSON versionnées.
- `audit_events` : journal append-only des événements de création, modification et suppression d'un dossier. Il ne contient pas le contenu du dossier.

Rôles :
- `admin` : administration de l'organisation et suppression des dossiers.
- `rse_lead` : pilotage RSE et gestion des dossiers.
- `contributor` : lecture et contribution aux dossiers.
- `reader` : lecture seule.

La migration permet à un utilisateur authentifié de créer une organisation via la fonction transactionnelle `create_organization()`, qui lui attribue le rôle admin. La fonction `set_organization_member_role()` réserve le changement de rôle aux administrateurs, verrouille l'organisation pour sérialiser les transferts et interdit de rétrograder le dernier administrateur. Les créations d'adhésions et changements de rôle sont journalisés dans `audit_events`. La suppression d'un membre devra passer par une future RPC dédiée qui écrira l'événement avant la suppression ; les invitations et la révocation d'accès ne sont pas encore disponibles.

## Passerelle serveur préparée

`netlify/functions/auth.mjs` prépare les opérations de connexion, renouvellement et déconnexion : le refresh token est conservé dans un cookie `HttpOnly`, `Secure` et `SameSite=Strict`, tandis que seul l'access token court est renvoyé au navigateur. Les tentatives de connexion sont limitées par IP. `netlify/functions/tenant.mjs` expose les opérations organisations/dossiers, la lecture des adhésions et le changement de rôle via une RPC réservée aux administrateurs. Elle vérifie le jeton auprès de Supabase Auth (`/auth/v1/user`), puis transmet le même JWT utilisateur à PostgREST. La base applique donc les politiques RLS pour chaque opération. Seule la clé publique `SUPABASE_ANON_KEY` est utilisée côté serveur ; aucune clé `service_role` n'est nécessaire ni attendue. Les appels sont limités dans le temps, les identifiants sont validés et les opérations de modification exigent une origine autorisée.

Variables Netlify à configurer avant activation : `SUPABASE_URL` et `SUPABASE_ANON_KEY`. La procédure de staging détaillée est décrite dans `docs/CONFIGURATION_SUPABASE_NETLIFY.md`. L'interface de connexion est raccordée aux endpoints : l'access token reste en mémoire, le refresh token dans un cookie `HttpOnly`, et les organisations/dossiers vierges passent par la passerelle RLS. L'interface affiche les rôles et propose aux administrateurs de modifier ceux des membres existants ; le rôle lecteur ne voit pas les commandes d'édition. Restent à réaliser : provisionnement/invitations, révocation/suppression des membres, synchronisation/import du dossier local existant, récupération de mot de passe, et migration des données. Ne pas publier le mode SaaS avant leur réalisation et leurs tests.

## Contrôles de sécurité prévus

- RLS activée sur les quatre tables.
- Les triggers de base imposent l'auteur à l'identité authentifiée, rendent l'organisation et l'auteur initial immuables, et incrémentent la version côté base.
- Les fonctions privilégiées utilisent un `search_path` vide et des références qualifiées pour réduire les risques de détournement d'objets SQL.
- La CI exécute désormais la migration sur PostgreSQL 16 et vérifie réellement l'isolation entre deux organisations, les quatre rôles (admin, RSE lead, contributeur, lecteur), l'immutabilité des métadonnées et le journal d'audit.
- Chaque lecture/écriture de dossier est filtrée par appartenance à l'organisation et rôle.
- Les utilisateurs ne peuvent pas s'ajouter eux-mêmes à une organisation.
- Les écritures directes sur les adhésions et le journal d'audit sont interdites aux clients authentifiés.
- Le journal enregistre les métadonnées des dossiers et des adhésions créées ou dont le rôle change (acteur, membre ciblé, ancien/nouveau rôle), sans recopier les données métier.
- Le rôle `service_role` ne doit jamais être exposé dans le navigateur.
- Le code secret de sauvegarde historique n'est pas un mécanisme d'identité ni un substitut à l'authentification.

## Intégration nécessaire avant toute ouverture aux utilisateurs

1. Créer un projet Supabase distinct (développement/staging puis production), activer MFA pour les comptes privilégiés et configurer les URL de redirection.
2. Appliquer la migration et vérifier les politiques avec deux organisations et au moins quatre utilisateurs de rôles différents.
3. Valider en staging la connexion, le renouvellement rotatif et la révocation de session, activer MFA pour les comptes privilégiés et tester l'interface initiale. La passerelle Netlify valide les JWT auprès de Supabase Auth. Les requêtes PostgREST utilisent le JWT utilisateur afin que la RLS reste l'autorité d'accès. Ne jamais faire confiance à un `organization_id` fourni seul par le navigateur.
4. Implémenter invitations à durée limitée, ajout de membres, révocation/suppression des adhésions et cycle de vie des comptes ; les changements de rôle existants passent déjà par une RPC admin avec verrouillage du dernier administrateur et audit.
5. Remplacer progressivement le stockage navigateur par l'API authentifiée. Conserver import/export local comme portabilité.
6. Définir sauvegardes, restauration testée, rétention, suppression organisation/utilisateur, gestion des clés, alertes et procédure d'incident.
7. Réaliser revue RGPD (responsable/sous-traitant, DPA, localisation, sous-traitants, durées, droits, AIPD si nécessaire), threat model et test d'intrusion indépendant.
8. N'autoriser des données d'entreprise réelles qu'après validation sécurité et tests d'isolation.

## Matrice minimale de tests d'autorisation

| Scénario | Résultat attendu |
|---|---|
| Utilisateur A lit un dossier de son organisation | Autorisé |
| Utilisateur A lit un dossier de l'organisation B | Refusé par RLS |
| Utilisateur A consulte les adhésions de l'organisation B | Refusé par RLS |
| Lecteur consulte son rôle et les dossiers de son organisation | Autorisé, sans action de modification |
| Lecteur modifie un dossier | Refusé |
| Contributeur crée/modifie un dossier de son organisation | Autorisé |
| Contributeur supprime un dossier | Refusé |
| Admin/RSE lead supprime un dossier de son organisation | Autorisé |
| Utilisateur modifie directement son rôle | Refusé |
| Administrateur modifie le rôle d'un membre existant | Autorisé via RPC, avec audit |
| Non-administrateur modifie un rôle | Refusé |
| Dernier administrateur tente de se rétrograder | Refusé par verrouillage et contrôle transactionnel |
| Utilisateur écrit directement dans audit_events | Refusé |
| Utilisateur non authentifié appelle create_organization | Refusé |

## Limites et points à valider

- Cette migration est une base technique, pas une certification de sécurité ni une revue exhaustive.
- La politique de conservation et le droit à l'effacement doivent être arbitrés avec les exigences d'audit : une suppression d'organisation entraîne ici la suppression en cascade de ses événements.
- Les champs JSONB permettent une migration initiale rapide du modèle Sillon actuel, mais les données structurées fréquemment interrogées pourront être normalisées ensuite.
- Le journal est append-only pour les rôles clients via RLS et privilèges ; l'administrateur de base reste techniquement capable de modifier les données.
- Les liens de preuves documentaires ne doivent pas devenir publics par défaut. L'accès à la GED doit rester soumis à ses propres contrôles.
