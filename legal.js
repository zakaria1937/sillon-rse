/* Sillon — pages légales : confidentialité, CGU, cookies, mentions légales, crédits, accessibilité.
   Pour mettre à jour les coordonnées de l'éditeur, modifiez uniquement l'objet BUSINESS ci-dessous. */
(function () {
  const BUSINESS = {
    owner: "Zakaria Ghannam",
    status: "Particulier — projet personnel, gratuit et non commercial",
    siret: "", // à renseigner si une entreprise (micro-entreprise, société) est créée
    address: "", // adresse postale de l'éditeur, à renseigner si une entreprise est créée
    email: "zakariaghannam7@gmail.com",
    host: "Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis — netlify.com",
    updated: "7 novembre 2026",
  };
  const B = BUSINESS;
  const mail = `<a href="mailto:${B.email}">${B.email}</a>`;
  const UPD = "Mise à jour : " + B.updated;
  const L = (h, t) => `<a href="#${h}">${t}</a>`;

  const fr = {
    confidentialite: {
      title: "Politique de confidentialité", updated: UPD,
      html: `
<h2>Responsable du traitement</h2>
<p>${B.owner}, éditeur de Sillon (${B.status}). Contact : ${mail}.</p>

<h2>Ce qui reste dans votre navigateur</h2>
<p>Vos réponses aux copilotes, votre profil d'entreprise, votre plan d'action, votre historique et vos coordonnées sont enregistrés dans le stockage local de votre navigateur. Ils ne sont envoyés à aucun serveur, sauf dans les cas décrits ci-dessous. Vous pouvez les exporter ou les effacer à tout moment depuis la page ${L("mes-donnees", "Mes données")}.</p>

<h2>Ce qui est transmis à l'éditeur</h2>
<table class="ltable"><thead><tr><th scope="col">Données</th><th scope="col">Quand</th><th scope="col">Pourquoi</th></tr></thead><tbody>
<tr><td>Prénom, nom, e-mail professionnel, entreprise ; fonction et téléphone si vous les donnez</td><td>Avant la première analyse par l'IA, le premier import de document ou le premier export</td><td>Vous recontacter au sujet de votre démarche RSE</td></tr>
<tr><td>Secteur, effectif et chiffre d'affaires de votre profil</td><td>Avec la fiche contact</td><td>Comprendre votre contexte avant de vous répondre</td></tr>
<tr><td>Résumé des résultats (verdict de chaque copilote utilisé)</td><td>Téléchargement d'un rapport, demande d'accompagnement</td><td>Préparer un échange utile</td></tr>
<tr><td>Votre message</td><td>Demande d'accompagnement, demande de suppression</td><td>Répondre à votre demande</td></tr>
</tbody></table>
<p>Ces informations sont transmises par le service de formulaires de Netlify, stockées dans le tableau de bord Netlify de l'éditeur et envoyées par e-mail à l'éditeur. Les réponses détaillées aux copilotes ne sont jamais transmises.</p>

<h2>Analyses par l'IA</h2>
<p>Quand vous lancez une analyse, posez une question à l'assistant ou importez un document, le contenu nécessaire (vos réponses, les résultats calculés, le texte ou l'image du document) est transmis à Mistral AI (Paris, France) ou, en secours, à Groq, Inc. (États-Unis), pour produire la réponse. L'éditeur a désactivé l'utilisation de ces données pour l'entraînement des modèles chez Mistral AI. Ces prestataires conservent les données le temps nécessaire au traitement et selon leurs propres conditions. N'importez pas de documents contenant des données personnelles de tiers (bulletins de paie, listes de salariés…).</p>

<h2>Adresse IP</h2>
<p>Pour limiter les abus, le nombre d'analyses par jour est compté à partir d'une empreinte chiffrée et salée de votre adresse IP, jamais de l'adresse en clair. Ces compteurs sont effacés après 24 heures. Comme tout hébergeur, Netlify traite les adresses IP dans ses journaux techniques pour assurer la sécurité du service.</p>

<h2>Bases légales</h2>
<ul>
<li>Fiche contact et recontact : votre consentement, que vous pouvez retirer à tout moment.</li>
<li>Analyses par l'IA : l'exécution du service que vous demandez.</li>
<li>Limitation des abus et sécurité : l'intérêt légitime de l'éditeur.</li>
</ul>

<h2>Durées de conservation</h2>
<ul>
<li>Fiches contact : 3 ans après le dernier échange, puis suppression.</li>
<li>Après une désinscription ou une demande de suppression : suppression sous un mois. L'éditeur peut garder l'adresse e-mail dans une liste d'opposition, uniquement pour ne plus vous contacter.</li>
<li>Compteurs d'usage : 24 heures.</li>
<li>Données dans votre navigateur : jusqu'à ce que vous les effaciez.</li>
</ul>

<h2>Destinataires</h2>
<p>L'éditeur uniquement, et ses prestataires techniques : Netlify, Inc. (hébergement et formulaires, États-Unis), Mistral AI (IA, France) et Groq, Inc. (IA de secours, États-Unis). Les transferts hors de l'Union européenne reposent sur les garanties prévues par ces prestataires (clauses contractuelles types de la Commission européenne ou cadre de protection des données UE–États-Unis). Aucune donnée n'est vendue, louée ou utilisée à des fins publicitaires.</p>

<h2>Mineurs</h2>
<p>Sillon est réservé aux personnes majeures agissant pour le compte d'une entreprise ou d'une organisation. Une case à cocher le confirme avant tout envoi de coordonnées. Si vous apprenez qu'un mineur nous a transmis des données, écrivez à ${mail} : elles seront supprimées.</p>

<h2>Vos droits</h2>
<p>Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition, de portabilité et du droit de retirer votre consentement. Le plus simple : la page ${L("mes-donnees", "Mes données")} (désinscription, demande de suppression, export). Vous pouvez aussi écrire à ${mail}. Réponse sous un mois. En cas de désaccord, vous pouvez saisir la CNIL (<a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener">cnil.fr</a>).</p>

<h2>Cookies et traceurs</h2>
<p>Sillon ne dépose aucun cookie et n'utilise aucun traceur. Voir la ${L("cookies", "politique cookies")}.</p>`,
    },

    cgu: {
      title: "Conditions générales d'utilisation", updated: UPD,
      html: `
<h2>1. Objet</h2>
<p>Ces conditions encadrent l'utilisation de Sillon, un ensemble d'outils en ligne d'aide à la démarche RSE (responsabilité sociétale des entreprises), édité par ${B.owner}. Utiliser Sillon vaut acceptation de ces conditions.</p>

<h2>2. Gratuité, sans frais cachés</h2>
<p>Sillon est entièrement gratuit. Il n'y a ni abonnement, ni option payante, ni frais cachés, ni moyen de paiement demandé. Si une offre payante était créée un jour, elle serait annoncée clairement, avec son prix, avant toute souscription, et ne s'appliquerait qu'avec votre accord exprès.</p>

<h2>3. Public</h2>
<p>Sillon s'adresse aux professionnels : dirigeants, salariés, consultants agissant pour une entreprise ou une organisation. Il est réservé aux personnes âgées de 18 ans ou plus.</p>

<h2>4. Accès et coordonnées</h2>
<p>Les calculs sont accessibles sans inscription. L'analyse par l'IA, l'assistant, l'import de documents et les exports demandent une fiche contact (prénom, nom, e-mail professionnel, entreprise), avec votre consentement. Il n'y a pas de compte ni de mot de passe.</p>

<h2>5. Nature des résultats</h2>
<p>Les résultats sont des estimations calculées à partir de vos réponses et de sources publiques citées dans chaque copilote. Ils ne remplacent ni un bilan d'émissions de gaz à effet de serre réglementaire, ni un audit de certification, ni une notation officielle (EcoVadis ou autre), ni un conseil juridique, comptable ou financier. Les analyses rédigées par l'IA peuvent contenir des erreurs : vérifiez-les avant toute décision ou communication.</p>

<h2>6. Utilisation acceptable</h2>
<ul>
<li>Ne pas tenter de contourner les limites d'usage, d'automatiser des requêtes ou de détourner l'assistant vers d'autres usages que la RSE.</li>
<li>Ne pas importer de contenus illicites, ni de documents contenant des données personnelles de tiers sans droit de le faire.</li>
<li>Ne pas présenter les résultats de Sillon comme une certification, un label ou un avis d'expert indépendant.</li>
</ul>

<h2>7. Avis et témoignages</h2>
<p>Sillon n'affiche aucun avis client ni témoignage. Les valeurs pré-remplies sont des exemples signalés comme tels, et non des données d'entreprises réelles.</p>

<h2>8. Disponibilité</h2>
<p>Le service est fourni en l'état, sans garantie de disponibilité. Le nombre d'analyses par l'IA est limité par jour. L'éditeur peut faire évoluer, suspendre ou arrêter le service.</p>

<h2>9. Responsabilité</h2>
<p>Dans les limites permises par la loi, l'éditeur n'est pas responsable des décisions prises sur la base des résultats, ni des dommages indirects liés à l'utilisation du service. Vous restez responsable des informations que vous saisissez, importez et publiez.</p>

<h2>10. Propriété intellectuelle</h2>
<p>Le code de Sillon est publié sous licence MIT. Les polices et bibliothèques utilisées relèvent de leurs propres licences (voir ${L("credits", "Crédits")}). Vos données vous appartiennent. Les marques citées appartiennent à leurs titulaires ; leur mention n'implique aucun partenariat.</p>

<h2>11. Données personnelles</h2>
<p>Voir la ${L("confidentialite", "politique de confidentialité")} et la page ${L("mes-donnees", "Mes données")}.</p>

<h2>12. Modification et droit applicable</h2>
<p>Ces conditions peuvent évoluer ; la date de mise à jour figure en haut de la page. Elles sont soumises au droit français. Contact : ${mail}.</p>`,
    },

    cookies: {
      title: "Politique cookies", updated: UPD,
      html: `
<h2>En résumé</h2>
<p><b>Sillon ne dépose aucun cookie et n'utilise aucun traceur</b> : pas de mesure d'audience, pas de publicité, pas de réseau social, pas de contenu tiers. Les polices et les bibliothèques sont hébergées sur le site lui-même ; votre navigateur ne contacte aucun autre service pendant votre visite.</p>

<h2>Stockage local du navigateur</h2>
<p>Sillon utilise le stockage local (<code>localStorage</code>) de votre navigateur, uniquement pour faire fonctionner le service que vous utilisez. Ce stockage ne quitte pas votre appareil.</p>
<table class="ltable"><thead><tr><th scope="col">Clé</th><th scope="col">Contenu</th><th scope="col">Durée</th></tr></thead><tbody>
<tr><td><code>sillon.v2</code></td><td>Vos réponses, profil, plan d'action, historique, coordonnées, langue</td><td>Jusqu'à effacement par vous</td></tr>
<tr><td><code>sillon.notice</code></td><td>Le fait que vous avez fermé le bandeau d'information</td><td>Jusqu'à effacement par vous</td></tr>
</tbody></table>
<p>Ce stockage est strictement nécessaire au service que vous demandez : la réglementation (article 82 de la loi Informatique et Libertés, lignes directrices de la CNIL) ne le soumet pas à consentement. C'est pourquoi Sillon affiche un simple bandeau d'information, sans demande d'acceptation.</p>

<h2>Effacer ces données</h2>
<p>Depuis la page ${L("mes-donnees", "Mes données")} (bouton « Effacer les données de ce navigateur »), ou dans les réglages de votre navigateur (données de site).</p>

<h2>Si cela change</h2>
<p>Si un outil de mesure d'audience ou tout autre traceur non indispensable était ajouté, il ne serait activé qu'après votre accord, recueilli par un bandeau proposant d'accepter ou de refuser avec la même simplicité. Cette politique serait mise à jour au préalable.</p>`,
    },

    mentions: {
      title: "Mentions légales", updated: UPD,
      html: `
<h2>Éditeur</h2>
<p>${B.owner}<br>Statut : ${B.status}${B.siret ? `<br>SIRET : ${B.siret}` : ""}${B.address ? `<br>Adresse : ${B.address}` : ""}<br>Contact : ${mail}<br>Directeur de la publication : ${B.owner}</p>
<h2>Hébergement</h2>
<p>${B.host}</p>
<h2>Prestataires d'intelligence artificielle</h2>
<p>Mistral AI, Paris, France — mistral.ai. Groq, Inc., Mountain View, Californie, États-Unis — groq.com (secours).</p>
<h2>Nature des résultats</h2>
<p>Les résultats sont des estimations fondées sur des sources publiques citées dans chaque copilote. Voir l'article 5 des ${L("cgu", "conditions générales d'utilisation")}.</p>
<h2>Liens utiles</h2>
<p>${L("confidentialite", "Confidentialité")} · ${L("cgu", "CGU")} · ${L("cookies", "Cookies")} · ${L("credits", "Crédits et licences")} · ${L("accessibilite", "Accessibilité")} · ${L("mes-donnees", "Mes données")}</p>`,
    },

    credits: {
      title: "Crédits et licences", updated: UPD,
      html: `
<h2>Polices</h2>
<ul>
<li><b>Bricolage Grotesque</b> — The Bricolage Grotesque Project Authors (Atelier Triay). Licence SIL Open Font License 1.1.</li>
<li><b>IBM Plex Sans</b> et <b>IBM Plex Mono</b> — IBM Corp. Licence SIL Open Font License 1.1.</li>
</ul>
<p>Les polices sont hébergées sur le site, avec leurs licences dans le dossier <code>fonts/</code> du code source.</p>
<h2>Bibliothèques</h2>
<ul>
<li><b>three.js</b> r128 (scène 3D) — licence MIT.</li>
<li><b>jsPDF</b> 2.5.1 (export PDF) — licence MIT.</li>
<li><b>SheetJS Community Edition</b> 0.18.5 (export Excel) — licence Apache 2.0.</li>
<li><b>PDF.js</b> 3.11.174 (lecture des PDF importés) — Mozilla, licence Apache 2.0.</li>
</ul>
<h2>Images et icônes</h2>
<p>Sillon n'utilise aucune photo ni illustration de banque d'images. Les icônes et le logo ont été dessinés pour Sillon ; la scène du champ labouré est générée par le code.</p>
<h2>Données et méthodes</h2>
<p>Facteurs d'émission de l'ADEME (Base Empreinte, impactCO2), norme VSME de l'EFRAG, règles publiques d'EcoVadis, textes de loi (Légifrance, Journal officiel de l'Union européenne), publications de Google et d'OpenAI sur l'énergie des requêtes d'IA. Chaque source est citée dans le copilote qui l'utilise et sur la page ${L("methode", "Méthode")}.</p>
<h2>Code de Sillon</h2>
<p>Licence MIT — <a href="https://github.com/zakaria1937/sillon-rse" target="_blank" rel="noopener">github.com/zakaria1937/sillon-rse</a>.</p>`,
    },

    accessibilite: {
      title: "Accessibilité", updated: UPD,
      html: `
<h2>Engagement</h2>
<p>Sillon vise le niveau AA des règles WCAG 2.1, la référence de l'accessibilité numérique.</p>
<h2>Ce qui est en place</h2>
<ul>
<li>Navigation complète au clavier : lien d'évitement « Aller au contenu », focus visible, fenêtres qui gardent le focus et se ferment avec Échap, présentation pilotable avec les flèches.</li>
<li>Contrastes de couleurs vérifiés (ratio d'au moins 4,5:1 pour le texte), en thème clair comme en thème sombre.</li>
<li>Champs de formulaire tous étiquetés ; messages d'erreur annoncés aux lecteurs d'écran.</li>
<li>Graphiques accompagnés d'une description textuelle et des valeurs chiffrées affichées à côté.</li>
<li>Animations désactivées si votre système demande de réduire les animations.</li>
<li>Langue de la page déclarée (français ou anglais).</li>
</ul>
<h2>Limites connues</h2>
<ul>
<li>La scène 3D de l'accueil est décorative et ignorée par les lecteurs d'écran.</li>
<li>Les PDF exportés ne sont pas encore balisés pour les lecteurs d'écran ; l'export Excel offre les mêmes informations dans un format accessible.</li>
</ul>
<h2>Signaler un problème</h2>
<p>Écrivez à ${mail} en décrivant la page et la difficulté rencontrée. Réponse dans les meilleurs délais.</p>`,
    },
  };

  const en = {
    confidentialite: { title: "Privacy policy", updated: "Updated " + B.updated, html: `<p>The French version is the reference. In short: your answers stay in your browser. Your contact details (and, when you download a report or request support, a summary of your results) are sent to the publisher through Netlify Forms. AI analyses send the necessary content to Mistral AI (France, training switched off) or Groq (USA, backup). Your IP address is only used as a salted hash to count daily analyses and is erased after 24 hours. No cookies, no trackers. The service is for adults acting for a business. Contacts are kept for 3 years after the last exchange. Unsubscribe, export or request deletion from the ${L("mes-donnees", "My data")} page, or write to ${mail}.</p>` },
    cgu: { title: "Terms of use", updated: "Updated " + B.updated, html: `<p>The French version is the reference. Sillon is free, with no subscription, paid option or hidden fees. It is meant for professionals aged 18 or over. Results are estimates based on public sources; AI analyses may contain errors and are not legal, accounting or certification advice. Do not abuse usage limits or upload third-party personal data. Sillon shows no customer reviews or testimonials; pre-filled values are labelled samples. Code under the MIT licence. French law applies. Contact: ${mail}.</p>` },
    cookies: { title: "Cookie policy", updated: "Updated " + B.updated, html: `<p>Sillon sets no cookies and uses no trackers: no analytics, no ads, no third-party content. Fonts and libraries are hosted on the site itself. Your browser's local storage (keys <code>sillon.v2</code> and <code>sillon.notice</code>) keeps your answers on your device only; it is strictly necessary for the service and therefore not subject to consent. Erase it from the ${L("mes-donnees", "My data")} page.</p>` },
    mentions: { title: "Legal notice", updated: "Updated " + B.updated, html: `<p>Publisher: ${B.owner} (${B.status}) — ${mail}. Hosting: ${B.host}. AI providers: Mistral AI (Paris, France), Groq, Inc. (USA, backup).</p>` },
    credits: { title: "Credits and licences", updated: "Updated " + B.updated, html: `<p>Fonts: Bricolage Grotesque and IBM Plex Sans / Mono (SIL Open Font License 1.1), self-hosted. Libraries: three.js r128 and jsPDF 2.5.1 (MIT), SheetJS CE 0.18.5 and PDF.js 3.11.174 (Apache 2.0). No stock images; icons and logo drawn for Sillon. Data: ADEME, EFRAG, EcoVadis, EU and French law. Sillon code: MIT licence.</p>` },
    accessibilite: { title: "Accessibility", updated: "Updated " + B.updated, html: `<p>Sillon aims for WCAG 2.1 level AA: full keyboard navigation, skip link, visible focus, focus kept inside dialogs (Esc closes), checked colour contrast in both themes, labelled fields, text alternatives for charts, reduced motion respected. Known limits: exported PDFs are not tagged yet (use the Excel export). Report issues to ${mail}.</p>` },
  };

  window.SILLON_LEGAL = { fr, en, BUSINESS };
})();
