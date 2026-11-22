# Lancement de l'espace entreprise — procédure

Ce document liste, dans l'ordre, ce qu'il faut faire pour ouvrir l'espace entreprise en production,
puis comment répondre à une demande de suppression. Les étapes marquées **Éditeur** se font
dans les consoles Netlify, Supabase et Brevo ; aucune clé ni aucun mot de passe ne doit être
collé dans un ticket, un chat ou le dépôt.

## 1. Avant la mise en production

| # | Étape | Où | Vérification |
|---|---|---|---|
| 1 | Remplacer `IP_SALT` du contexte **Production** par une nouvelle valeur aléatoire (32 octets ou plus) | Netlify → Site configuration → Environment variables | La valeur n'a jamais été partagée |
| 2 | Recette sur le staging avec au moins 3 comptes réels (admin, contributeur, lecteur) | https://staging--sillon-rse.netlify.app | Voir § 4 |
| 3 | Brancher un SMTP (§ 2) sur le projet de **production** | Supabase → Authentication → Emails → SMTP | Un e-mail d'invitation arrive en moins d'une minute |
| 4 | Créer le projet `sillon-prod`, région **Paris (eu-west-3)** | Supabase → New project | Région affichée : West EU (Paris) |
| 5 | Appliquer les migrations dans l'ordre : `0001`, `0002`, `0003`, `0004` | Supabase → SQL Editor | § 3 |
| 6 | Régler l'authentification (§ 3) | Supabase → Authentication | |
| 7 | Renseigner `SUPABASE_URL` et `SUPABASE_ANON_KEY` du projet de prod dans le contexte **Production** | Netlify | Jamais la clé `service_role` |
| 8 | Fusionner la PR #3 puis la PR #1 vers `main` | GitHub | CI verte sur les deux |
| 9 | Contrôle final de la production (§ 4) | sillon-rse.netlify.app | |

## 2. SMTP avec Brevo (gratuit jusqu'à 300 e-mails par jour)

Sans SMTP personnalisé, Supabase n'envoie que quelques e-mails par heure : les invitations et les
réinitialisations de mot de passe se bloquent dès qu'il y a plusieurs utilisateurs.

1. Créer un compte sur brevo.com (société française, données dans l'UE).
2. **Expéditeurs, domaines et IP dédiées → Domaines** : ajouter le domaine d'envoi et publier les
   enregistrements DNS proposés (DKIM, DMARC). Sans domaine à soi, utiliser une adresse vérifiée
   dans **Expéditeurs** ; la délivrabilité sera moins bonne.
3. **SMTP et API → SMTP** : noter le serveur (`smtp-relay.brevo.com`), le port (`587`), l'identifiant
   et générer une **clé SMTP**.
4. Dans Supabase → Authentication → Emails → **SMTP Settings** : activer *Custom SMTP*, saisir
   l'expéditeur (ex. `Sillon <noreply@votre-domaine>`), l'hôte, le port, l'identifiant et la clé SMTP.
5. Authentication → **Rate Limits** : passer la limite d'e-mails à 30 par heure ou plus.
6. Tester : « Mot de passe oublié » depuis l'espace entreprise.

## 3. Réglages Supabase du projet de production

Migrations : ouvrir chaque fichier de `supabase/migrations/` dans l'ordre, le coller dans le SQL
Editor et l'exécuter. Elles sont idempotentes pour `0002` à `0004`. Ensuite, vérifier :

```sql
select count(*) from pg_policies where schemaname = 'public';           -- au moins 10 politiques
select privilege_type, grantee from information_schema.table_privileges
 where table_schema = 'public' and grantee in ('anon','authenticated')
   and privilege_type in ('TRUNCATE','REFERENCES','TRIGGER');            -- aucune ligne
```

Authentication :

- **Sign In / Providers → Email** : *Allow new users to sign up* désactivé ; *Confirm email* activé.
- **Mot de passe** : longueur minimale 12 ; *Leaked password protection* activé si l'offre le permet.
- **URL Configuration** : *Site URL* `https://sillon-rse.netlify.app` ; *Redirect URLs* :
  `https://sillon-rse.netlify.app/**`.
- **Emails → Templates** : traduire en français les modèles *Invite user*, *Reset password* et
  *Magic link*.

## 4. Recette (staging puis production)

1. L'admin crée son organisation et un dossier.
2. Il invite un contributeur et un lecteur ; chacun accepte depuis son e-mail.
3. Le contributeur modifie le dossier mais ne peut pas le supprimer ; le lecteur ne peut rien modifier.
4. Une seconde organisation ne voit rien de la première.
5. Mot de passe oublié → e-mail reçu → nouveau mot de passe accepté.
6. Retrait d'un membre par l'admin ; le dernier admin ne peut pas se retirer.
7. Les chemins `/claude.mjs`, `/package.json`, `/tests/`, `/supabase/` renvoient 404.

## 5. Demandes de suppression (délai : un mois)

**Supprimer un compte** : Supabase → Authentication → Users → la personne → *Delete user*.
Depuis la migration `0004`, ses adhésions sont supprimées, les dossiers restent à l'organisation
sans mention de l'auteur, et ses invitations sont anonymisées. Si la personne était la seule
administratrice d'une organisation, prévenir les autres membres ou supprimer l'organisation.

**Supprimer une organisation** (à la demande d'un de ses administrateurs) : vérifier que la demande
vient bien d'un administrateur, proposer l'export des dossiers, puis dans le SQL Editor :

```sql
delete from public.organizations where id = '<identifiant de l'organisation>';
```

Les dossiers, invitations, adhésions et le journal d'audit sont supprimés avec elle.

**Comptes inactifs** : une fois par an, lister les comptes sans connexion depuis 24 mois,
leur écrire, puis les supprimer un mois plus tard :

```sql
select id, email, last_sign_in_at from auth.users
 where coalesce(last_sign_in_at, created_at) < now() - interval '24 months';
```

Répondre à la personne une fois la suppression faite.
