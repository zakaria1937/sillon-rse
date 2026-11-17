# Sécurité des données, sauvegardes et modèle d'accès

Dernière mise à jour : 17 novembre 2026.

## Ce qui est disponible

### Stockage local
- Le dossier actif est conservé dans le stockage local du navigateur (`localStorage`).
- L'utilisateur peut exporter une sauvegarde JSON depuis « Mes données ».
- Une sauvegarde JSON Sillon peut être restaurée depuis le même écran. La restauration remplace le dossier ouvert après confirmation.
- L'import vérifie le format Sillon, la présence de l'objet de données et la structure minimale des champs avant de remplacer l'état.

Le stockage local n'est pas un coffre-fort : il n'est pas chiffré par Sillon et reste accessible à une personne ayant accès au profil du navigateur ou à l'appareil.

### Sauvegarde en ligne
- La sauvegarde est chiffrée dans le navigateur avec AES-GCM avant son envoi.
- Une clé est dérivée par SHA-256 du code secret généré dans le navigateur ; chaque sauvegarde utilise un vecteur d'initialisation aléatoire de 96 bits.
- Le serveur conserve le bloc chiffré, la date de mise à jour et l'empreinte SHA-256 du code pour retrouver le dossier. Il ne reçoit pas le dossier en clair.
- Le code est envoyé dans le corps d'une requête POST lors de la restauration, pas dans l'URL.
- La conservation serveur est limitée à 365 jours sans mise à jour ; la limite de taille est de 400 Ko.
- Les anciens dossiers sauvegardés avant le chiffrement restent lisibles pour assurer la transition. Leur prochaine sauvegarde les réécrit au format chiffré.
- La perte du code secret peut rendre la sauvegarde en ligne irrécupérable. Il faut le conserver dans un endroit sûr et distinct de l'appareil.

Le chiffrement protège le contenu stocké côté fournisseur, mais ne protège pas un navigateur ou un appareil compromis. Le code secret est également conservé localement pour permettre la sauvegarde automatique.

## Ce qui n'est pas encore disponible

### Comptes et rôles
Sillon ne dispose pas encore d'une authentification nominative avec comptes individuels, MFA, invitations, révocation de sessions ou rôles (administrateur, responsable RSE, contributeur, lecteur). Les droits ne doivent pas être simulés par des contrôles d'interface : une autorisation réelle doit être vérifiée côté serveur à chaque accès.

### Multi-entreprises et collaboration
Le produit ne fournit pas encore d'espace multi-entreprises isolé côté serveur, de membres par organisation, de partage de dossiers ni de journal d'audit inviolable. Les codes de sauvegarde permettent de reprendre un dossier, mais ne constituent pas une gestion d'organisations ni un système de collaboration.

### Gestion documentaire
Le registre documentaire stocke des références et métadonnées. Les fichiers restent dans la GED de l'organisation ; Sillon ne les héberge pas et ne vérifie pas leur authenticité.

## Architecture à mettre en place avant un usage collaboratif en entreprise

1. Déployer un fournisseur d'identité robuste (OIDC) avec MFA et gestion du cycle de vie des comptes.
2. Introduire une base de données relationnelle avec identifiants d'organisation (`tenant_id`) et politiques d'accès vérifiées côté serveur.
3. Définir des rôles et permissions granulaires, contrôlés sur chaque API, y compris les exports et les fichiers.
4. Ajouter des journaux d'audit append-only (acteur, organisation, action, horodatage, objet, résultat) avec politique de conservation.
5. Chiffrer les données sensibles au repos et gérer les clés via un KMS ; séparer les clés par environnement et, si nécessaire, par organisation.
6. Formaliser sauvegardes, restauration testée, rétention, suppression, gestion des incidents, sous-traitants et localisation des données.
7. Réaliser une analyse de risques, une revue RGPD et un test d'intrusion avant d'ouvrir le service à plusieurs entreprises.

## Recommandation d'usage actuelle

Utiliser des données de test ou non sensibles. Pour les dossiers réels, protéger l'appareil, conserver une sauvegarde locale hors du navigateur et le code secret hors de l'appareil. Ne pas partager un code de sauvegarde comme s'il s'agissait d'une invitation avec des droits différenciés.
