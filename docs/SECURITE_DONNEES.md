# Sécurité des données, sauvegardes et modèle d'accès

Dernière mise à jour : 17 novembre 2026.

## Périmètre et état du produit

Sillon conserve actuellement un mode de fonctionnement local et une sauvegarde en ligne distincts de la fondation SaaS préparée dans la branche `feat/saas-multi-tenant-foundation`.

**La fondation multi-entreprises n'est pas activée sur le site de production.** Aucun projet Supabase n'est connecté, aucune variable d'environnement SaaS n'est configurée et aucune donnée métier n'a été migrée. L'interface et les passerelles préparées ne constituent pas, à elles seules, une ouverture du service aux entreprises. La branche reste une préversion technique et ne doit pas être fusionnée ni déployée sans validation.

## Données et sauvegardes actuellement disponibles

### Stockage local
- Le dossier actif est conservé dans le stockage local du navigateur (`localStorage`).
- L'utilisateur peut exporter une sauvegarde JSON depuis « Mes données ».
- Une sauvegarde JSON Sillon peut être restaurée depuis le même écran. La restauration remplace le dossier ouvert après confirmation.
- L'import vérifie le format Sillon, la présence de l'objet de données et la structure minimale des champs avant de remplacer l'état.

Le stockage local n'est pas un coffre-fort : il n'est pas chiffré par Sillon et reste accessible à une personne ayant accès au profil du navigateur ou à l'appareil.

### Sauvegarde en ligne historique
- La sauvegarde est chiffrée dans le navigateur avec AES-GCM avant son envoi.
- Une clé est dérivée par SHA-256 du code secret généré dans le navigateur ; chaque sauvegarde utilise un vecteur d'initialisation aléatoire de 96 bits.
- Le serveur conserve le bloc chiffré, la date de mise à jour et l'empreinte SHA-256 du code pour retrouver le dossier. Il ne reçoit pas le dossier en clair.
- Le code est envoyé dans le corps d'une requête POST lors de la restauration, pas dans l'URL.
- La conservation serveur est limitée à 365 jours sans mise à jour ; la limite de taille est de 400 Ko.
- Les anciens dossiers sauvegardés avant le chiffrement restent lisibles pour assurer la transition. Leur prochaine sauvegarde les réécrit au format chiffré.
- La perte du code secret peut rendre la sauvegarde en ligne irrécupérable. Il faut le conserver dans un endroit sûr et distinct de l'appareil.

Le chiffrement protège le contenu stocké côté fournisseur, mais ne protège pas un navigateur ou un appareil compromis. Le code secret est également conservé localement pour permettre la sauvegarde automatique.

## Fondation SaaS préparée — non activée en production

Les éléments suivants existent dans la branche de préparation et doivent encore être validés sur un environnement Supabase/Netlify de staging :

### Identité et sessions
- Passerelle serveur de connexion, renouvellement et déconnexion avec Supabase Auth.
- Refresh token conservé dans un cookie `HttpOnly`, `SameSite=Strict` et `Secure` lorsque la requête est HTTPS ; access token court conservé en mémoire côté navigateur.
- En cas de réponse temporaire (quota ou indisponibilité Supabase), le navigateur conserve la session active et programme une nouvelle tentative ; une session n’est effacée qu’en cas de réponse d’authentification indiquant qu’elle n’est plus valide.
- Parcours de récupération du mot de passe implémenté côté application, mais à valider avec un vrai projet Supabase et ses URL de redirection.
- MFA et provisionnement autonome des membres ne sont pas encore opérationnels. Les invitations manuelles sont implémentées dans la branche de préparation : lien à usage unique transmis hors application, compte Supabase existant avec e-mail confirmé requis, expiration de 7 jours, révocation et journalisation. Aucun e-mail automatique n'est envoyé et le parcours reste à valider en staging.

### Organisations, rôles et cloisonnement
- Schéma PostgreSQL préparé pour les organisations, adhésions, dossiers et événements d'audit.
- RLS activée dans la migration sur ces tables, avec quatre rôles : administrateur, responsable RSE, contributeur et lecteur.
- Création transactionnelle d'une organisation avec attribution du premier rôle administrateur.
- Changements de rôle et retraits de membres réservés aux administrateurs via des fonctions SQL dédiées ; protection du dernier administrateur.
- Les requêtes de la passerelle transmettent le JWT utilisateur à PostgREST afin que les politiques RLS de PostgreSQL restent l'autorité d'accès.
- Journalisation des métadonnées de création/modification/suppression des dossiers et des changements d'adhésion. Le journal ne doit pas être présenté comme inviolable face à un administrateur de base de données.

### Limitation des tentatives
Les fonctions de connexion et de récupération utilisent un compteur par IP/jour stocké via Netlify Blobs en production. Le compteur repose sur une lecture suivie d'une écriture et n'est pas atomique : des requêtes concurrentes peuvent dépasser le seuil. Il s'agit d'une protection complémentaire, pas d'une garantie anti-abus. Les protections natives de Supabase Auth, la surveillance et des contrôles adaptés au trafic réel restent nécessaires. En production, l'absence de secret IP ou de stockage persistant provoque un échec fermé.

### Gestion documentaire
Le registre documentaire stocke des références et métadonnées. Les fichiers restent dans la GED de l'organisation ; Sillon ne les héberge pas et ne vérifie pas leur authenticité. Les liens de preuves ne doivent pas être rendus publics par défaut.

## Conditions obligatoires avant un pilote avec des données réelles

1. Créer des projets Supabase distincts pour staging et production, choisir et documenter la région d'hébergement, sécuriser les comptes privilégiés et activer MFA.
2. Configurer les secrets Netlify par environnement ; ne jamais exposer de clé `service_role` dans le navigateur.
3. Appliquer la migration sur une base de staging dédiée après sauvegarde et revue.
4. Tester avec plusieurs organisations et des comptes distincts : accès croisés, quatre rôles, modification/suppression des membres, dernier administrateur, journal d'audit et opérations concurrentes.
5. Valider les parcours réels : connexion, rotation du refresh token, déconnexion, récupération de mot de passe, erreurs réseau, quotas et expiration des sessions.
6. Réaliser une revue de sécurité indépendante : contrôle des API, RLS, cookies, CSP, gestion des secrets, limitation des abus, journaux, dépendances et tests d'intrusion.
7. Formaliser sauvegardes et restauration testée, rétention, suppression des comptes et organisations, gestion des incidents, sous-traitants et localisation des données.
8. Réaliser la revue RGPD : rôles responsable/sous-traitant, contrats, finalités, minimisation, durées, droits des personnes et analyse d'impact si nécessaire.
9. Exécuter une recette métier avec des données fictives, puis un pilote limité avec des données non sensibles, avant toute ouverture plus large.

Sur le commit `23436415e9ef2895a1b27e6d5e9764fe603a66c7` (17 novembre 2026), les workflows GitHub Actions de push et de pull request sont terminés avec succès : tests Node, migration PostgreSQL, isolation multi-tenant, permissions des rôles et tests E2E Playwright. Cette validation automatisée ne remplace pas les essais sur un projet Supabase/Netlify réel ni une revue indépendante.

## Recommandation d'usage actuelle

Utiliser des données de test ou non sensibles. Pour les dossiers réels en mode local, protéger l'appareil, conserver une sauvegarde locale hors du navigateur et le code secret hors de l'appareil. Ne pas partager un code de sauvegarde comme s'il s'agissait d'une invitation avec des droits différenciés.
