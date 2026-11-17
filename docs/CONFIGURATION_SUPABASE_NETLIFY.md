# Configuration Supabase + Netlify — Sillon

## État actuel

Les fonctions /api/auth et /api/tenant, l'interface de connexion et la migration PostgreSQL sont présentes dans le dépôt. **Aucun projet Supabase n'est encore relié à l'application.** Le mode entreprise n'est donc pas opérationnel en production tant que les étapes ci-dessous ne sont pas réalisées.

Ne pas appliquer la migration sur une base contenant déjà des données métier sans sauvegarde et revue préalable.

## 1. Créer un projet Supabase de test

1. Créer un projet Supabase dédié au staging.
2. Choisir une région européenne adaptée à la politique de données qui sera retenue.
3. Conserver les identifiants du projet dans un gestionnaire de secrets.
4. Activer le fournisseur d'authentification e-mail/mot de passe.
5. Pour la première phase, désactiver l'inscription publique et créer manuellement un premier compte administrateur depuis le tableau de bord Supabase.
6. Configurer les URL du site et de redirection avec le domaine Netlify de test.

## 2. Appliquer le schéma

Dans le SQL Editor du projet de staging, exécuter le contenu de :

supabase/migrations/0001_multi_tenant_foundation.sql

La CI exécute déjà cette migration sur PostgreSQL 16 avec une surface Auth simulée et teste les quatre rôles, l'isolation entre deux organisations, les tentatives d'auto-attribution des rôles, le versionnement et le journal d'audit. Le projet Supabase réel devra néanmoins faire l'objet d'une validation distincte.

## 3. Configurer Netlify

Dans les variables d'environnement Netlify, ajouter pour le contexte de déploiement de staging :

| Variable | Valeur |
|---|---|
| SUPABASE_URL | URL HTTPS du projet Supabase |
| SUPABASE_ANON_KEY | Clé publique anon/publishable du projet |
| IP_SALT | Secret aléatoire d'au moins 32 caractères, propre à l'environnement |
| AUTH_LOGIN_LIMIT_PER_IP | Facultatif ; valeur par défaut : 20 tentatives par IP et par jour |

Les deux premières variables sont nécessaires pour activer les fonctions. IP_SALT doit être différent entre staging et production et comporter au moins 32 caractères. Le compteur applicatif via Netlify Blobs est une protection complémentaire contre les abus, pas une garantie de limitation atomique sous forte concurrence : conserver également les protections natives de Supabase Auth et surveiller les tentatives anormales.

**Ne jamais configurer service_role dans le navigateur.** La passerelle utilise uniquement la clé publique anon/publishable et le JWT individuel de l'utilisateur ; PostgreSQL RLS reste l'autorité d'accès.

Après ajout des variables, effectuer un nouveau déploiement Netlify. Ne pas publier ce déploiement en production avant les vérifications.

## 4. Vérifications fonctionnelles de staging

1. Se connecter avec le compte créé dans Supabase.
2. Créer une organisation depuis l'espace entreprise.
3. Créer un dossier vierge.
4. Vérifier que l'organisation et le dossier apparaissent dans Postgres.
5. Créer un second compte et une seconde organisation.
6. Vérifier qu'un compte d'une organisation ne peut pas lire les dossiers de l'autre.
7. Tester les rôles reader, contributor, rse_lead et admin avec des comptes distincts.
8. Avec un administrateur, modifier le rôle d'un membre existant ; vérifier qu'un non-administrateur ne peut pas le faire et que le dernier administrateur ne peut pas être rétrogradé.
9. Vérifier les événements dossier.created, dossier.updated, dossier.deleted, membership.created et membership.role_changed dans audit_events.
10. Tester le renouvellement de session, la déconnexion, les erreurs réseau et l'expiration du refresh token.

La modification du rôle des membres déjà présents est disponible pour les administrateurs. Les invitations, l'ajout autonome de membres, la récupération de mot de passe et la migration/synchronisation du dossier local ne sont pas encore livrés.

## 5. Conditions avant données réelles

Avant tout usage avec des données d'entreprise réelles :

- revue de sécurité indépendante et test d'isolation multi-tenant ;
- revue RGPD, contrats de sous-traitance et durées de conservation ;
- sauvegardes et restauration testées ;
- procédure de suppression de compte et d'organisation ;
- gestion des invitations, révocation des adhésions et procédure de transfert du rôle administrateur ;
- validation de la configuration Supabase et Netlify en production ;
- test pilote avec des données fictives puis non sensibles.

La présente documentation est une procédure de préparation ; elle ne vaut ni audit de sécurité, ni validation juridique, ni autorisation de mise en production.
