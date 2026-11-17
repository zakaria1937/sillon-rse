# Configuration Supabase + Netlify — Sillon

## État actuel

Les fonctions /api/auth et /api/tenant, l'interface de connexion et la migration PostgreSQL sont présentes dans le dépôt. **Projet Supabase de staging créé le 17 novembre 2026 :** `sillon-staging` (`obubfuwpanaecwzqunsd`), région Paris (`eu-west-3`), statut `ACTIVE_HEALTHY`. URL API : `https://obubfuwpanaecwzqunsd.supabase.co`. Le schéma multi-entreprise et les migrations de durcissement sont appliqués et vérifiés sur ce projet. L'application Netlify n'est pas encore reliée : les variables Netlify et les URL Auth restent à configurer. La production n'a pas été modifiée.

Ne pas appliquer la migration sur une base contenant déjà des données métier sans sauvegarde et revue préalable.

## 1. Projet Supabase de staging

Le projet dédié est déjà créé : `sillon-staging`, ID `obubfuwpanaecwzqunsd`, région `eu-west-3`, URL `https://obubfuwpanaecwzqunsd.supabase.co`. Conserver les clés dans un gestionnaire de secrets. Il reste à activer/vérifier le fournisseur e-mail/mot de passe, désactiver l'inscription publique pour la phase pilote, créer manuellement le premier compte administrateur et configurer les URL Auth.

## 2. Schéma appliqué

Le schéma multi-tenant est déjà installé sur le projet de staging via les migrations versionnées Supabase. Ne pas réexécuter manuellement `0001_multi_tenant_foundation.sql` sur ce projet. Vérifier l'historique avec `supabase migration list` et les tables/RLS avant tout nouveau changement.

La CI exécute déjà cette migration sur PostgreSQL 16 avec une surface Auth simulée et teste les quatre rôles, l'isolation entre deux organisations, les tentatives d'auto-attribution des rôles, le versionnement et le journal d'audit. Le projet Supabase réel devra néanmoins faire l'objet d'une validation distincte.

## 3. Configurer Netlify

Dans les variables d'environnement Netlify, ajouter pour le contexte de déploiement de staging :

| Variable | Valeur |
|---|---|
| SUPABASE_URL | `https://obubfuwpanaecwzqunsd.supabase.co` |
| SUPABASE_ANON_KEY | Clé publique publishable (`sb_publishable_…`) du projet `sillon-staging` |
| IP_SALT | Secret aléatoire d'au moins 32 caractères, propre à l'environnement |
| AUTH_LOGIN_LIMIT_PER_IP | Facultatif ; valeur par défaut : 20 tentatives par IP et par jour |
| AUTH_RECOVERY_LIMIT_PER_IP | Facultatif ; valeur par défaut : 5 demandes de récupération par IP et par jour |

Les deux premières variables sont nécessaires pour activer les fonctions. IP_SALT doit être différent entre staging et production et comporter au moins 32 caractères ; toutes les passerelles qui calculent une empreinte IP échouent fermées si ce secret manque en production. Le compteur applicatif via Netlify Blobs est une protection complémentaire contre les abus, pas une garantie de limitation atomique sous forte concurrence : conserver également les protections natives de Supabase Auth et surveiller les tentatives anormales.

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
9. Vérifier les événements dossier.created, dossier.updated, dossier.deleted, membership.created, membership.role_changed et membership.removed dans audit_events.
10. Avec un administrateur, retirer un membre de test ; vérifier l'événement membership.removed et la protection du dernier administrateur. Tester le parcours d'invitation manuel : création par un administrateur depuis l'espace entreprise, génération d'un lien à transmettre hors application, connexion avec un compte existant dont l'e-mail est confirmé, acceptation, apparition du membre et révocation. Vérifier également l'expiration à 7 jours, l'usage unique, le refus d'un autre compte et l'isolation entre organisations. L'envoi automatique d'e-mails et la création automatique de comptes ne sont pas configurés.
11. Tester l'import ponctuel d'un dossier local, vérifier que les conversations IA et coordonnées de contact sont exclues, et confirmer qu'aucune synchronisation continue n'est annoncée.
12. Tester le renouvellement de session, la déconnexion, les erreurs réseau et l'expiration du refresh token.
13. Tester la récupération de mot de passe depuis l’e-mail, le retour sur `/?auth=recovery`, la mise à jour du mot de passe et l’expiration du lien.

La modification du rôle des membres existants est disponible pour les administrateurs. Les invitations sont exposées par l'API Netlify et l'interface : création, génération d'un lien à usage unique, consultation et révocation. L'acceptation intervient après connexion avec un compte Supabase existant dont l'adresse e-mail est confirmée. Le jeton n'est stocké qu'en empreinte SHA-256, expire après 7 jours et son acceptation est transactionnelle. Le lien est transmis manuellement : aucun fournisseur d'e-mail ni envoi automatique n'est configuré. La création automatique de comptes, la synchronisation continue et la migration des données restent à réaliser. La récupération de mot de passe et les invitations doivent encore être validées sur un projet Supabase/Netlify de staging réel.

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
