# Mettre Sillon en ligne (Netlify)

Sillon tourne sur **Netlify** : le site, la passerelle vers Claude (`/api/claude`) et les formulaires qui t'envoient un e-mail à chaque contact. Les visiteurs n'ont rien à configurer : ils remplissent leurs coordonnées une fois et tout fonctionne.

Coût : zéro au démarrage. Netlify est gratuit à ce niveau d'usage et l'IA utilise l'offre gratuite « Experiment » de Mistral AI. Groq (gratuit aussi) peut servir de secours si le quota de Mistral est atteint.

## 1. Clé API Mistral (5 min)

1. Va sur https://console.mistral.ai et connecte-toi.
2. Active l'offre **Experiment** (gratuite : un numéro de téléphone vérifié, pas de carte).
3. **Admin → Privacy** : désactive « Anonymous improvement data » pour que les données de tes visiteurs ne servent pas à entraîner les modèles. La politique de confidentialité du site l'annonce.
4. **API Keys → Create new key**, nomme-la `sillon`, copie-la. Ne la colle nulle part ailleurs que dans Netlify.

Facultatif, secours gratuit : crée une clé sur https://console.groq.com (API Keys).

## 2. Brancher le dépôt GitHub sur Netlify (5 min)

1. Va sur https://app.netlify.com et inscris-toi avec ton compte GitHub.
2. **Add new site → Import an existing project → GitHub**, autorise Netlify, choisis `zakaria1937/sillon-rse`.
3. Laisse les réglages proposés (ils viennent de `netlify.toml`) et clique **Deploy**.
4. **Site configuration → Change site name** : choisis par exemple `sillon-rse`. L'adresse devient `https://sillon-rse.netlify.app`.

## 3. Variables d'environnement

**Site configuration → Environment variables → Add a variable** :

| Nom | Valeur | Obligatoire |
|---|---|---|
| `MISTRAL_API_KEY` | ta clé Mistral (cocher « secret ») | oui |
| `GROQ_API_KEY` | ta clé Groq, secours si Mistral sature (cocher « secret ») | non |
| `RATE_LIMIT_PER_IP` | `30` (analyses par visiteur et par jour) | non |
| `GLOBAL_DAILY_LIMIT` | `800` (analyses par jour pour tout le site) | non |
| `MISTRAL_MODEL_ANALYSE` | modèle des analyses, par défaut `mistral-medium-latest` | non |
| `MISTRAL_MODEL_CHAT` | modèle de l'assistant et de l'import, par défaut `mistral-small-latest` | non |

Puis **Deploys → Trigger deploy → Deploy site** pour prendre en compte la clé.

## 4. Recevoir les contacts par e-mail

1. **Site configuration → Forms → Enable form detection**, puis redéploie (**Trigger deploy**).
2. **Forms → Form notifications → Add notification → Email notification** : formulaire `sillon`, adresse `zakariaghannam7@gmail.com`.

Tu reçois un e-mail à chaque événement : nouveau contact, demande d'accompagnement, rapport PDF ou Excel téléchargé. Tous les envois sont aussi visibles dans l'onglet **Forms** de Netlify (export CSV possible).

## 5. Vérifier

1. Ouvre le site, lance « Analyser mes résultats » sur un copilote, remplis la fiche contact : l'analyse doit s'afficher et tu dois recevoir un e-mail « Nouveau contact ».
2. Pose une question à l'assistant.
3. Clique sur « Être accompagné » et envoie un message test.

## Ensuite

- Chaque modification envoyée sur GitHub redéploie le site automatiquement.
- Désactive GitHub Pages (**Settings → Pages → None** sur GitHub) pour n'avoir qu'une seule adresse publique.
- Nom de domaine (facultatif) : **Domain management → Add a domain** dans Netlify.
- Suivi de l'usage : console Mistral, onglet **Usage**. Si le quota gratuit devient trop juste, passe à l'offre payante « Scale » sans rien changer au code.
