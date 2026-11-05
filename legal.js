/* Sillon — politique de confidentialité et mentions légales. */
(function () {
  const OWNER = "Zakaria Ghannam";
  const MAIL = "zakariaghannam7@gmail.com";
  const UPD = "Mise à jour : 6 novembre 2026";
  const mail = `<a href="mailto:${MAIL}">${MAIL}</a>`;
  window.SILLON_LEGAL = {
    fr: {
      confidentialite: {
        title: "Politique de confidentialité", updated: UPD,
        html: `
<h2>Qui est responsable de vos données</h2>
<p>${OWNER}, éditeur de Sillon. Contact : ${mail}.</p>
<h2>Ce qui reste dans votre navigateur</h2>
<p>Vos réponses aux copilotes, votre profil d'entreprise, votre plan d'action et votre historique sont enregistrés uniquement dans votre navigateur (stockage local). Ils ne sont pas envoyés sur nos serveurs, sauf dans les cas décrits ci-dessous. Vous pouvez les effacer en vidant les données du site dans votre navigateur.</p>
<h2>Ce qui nous est transmis</h2>
<ul>
<li><b>Votre fiche contact</b> (prénom, nom, e-mail professionnel, entreprise, fonction et téléphone facultatifs), avec le secteur, l'effectif et le chiffre d'affaires de votre profil. Elle est demandée avant la première analyse par l'IA, le premier import de document ou le premier export.</li>
<li><b>Certains événements</b> : téléchargement d'un rapport (avec le résumé des résultats), demande d'accompagnement (avec votre message).</li>
</ul>
<p>Ces informations sont transmises par le service de formulaires de notre hébergeur Netlify et reçues par e-mail par l'éditeur.</p>
<h2>Analyses par l'IA</h2>
<p>Quand vous lancez une analyse, posez une question à l'assistant ou importez un document, le contenu nécessaire (vos réponses, les résultats calculés, le texte ou l'image du document) est transmis à Mistral AI (Paris, France), qui fournit le modèle d'IA, pour produire la réponse. L'éditeur a désactivé l'utilisation de ces données pour l'entraînement des modèles de Mistral AI. En cas d'indisponibilité de Mistral AI, la demande peut être traitée par Groq, Inc. (États-Unis). Évitez d'importer des documents contenant des données personnelles de tiers.</p>
<h2>Adresse IP</h2>
<p>Votre adresse IP sert à compter le nombre d'analyses par jour, afin de limiter les abus. Ce compteur n'est pas relié à votre identité.</p>
<h2>Pourquoi et sur quelle base</h2>
<ul>
<li>Vous recontacter au sujet de votre démarche RSE : votre consentement, que vous pouvez retirer à tout moment.</li>
<li>Faire fonctionner et sécuriser le service : l'intérêt légitime de l'éditeur.</li>
</ul>
<h2>Combien de temps</h2>
<p>Les fiches contact sont conservées 3 ans après le dernier échange, puis supprimées.</p>
<h2>Qui y a accès</h2>
<p>L'éditeur uniquement, ainsi que ses prestataires techniques : Netlify, Inc. (hébergement et formulaires, États-Unis), Mistral AI (analyse par l'IA, France) et, en secours, Groq, Inc. (États-Unis). Les transferts hors de l'Union européenne sont encadrés par les garanties prévues dans leurs conditions (clauses contractuelles types ou cadre de protection des données UE–États-Unis). Aucune donnée n'est vendue.</p>
<h2>Vos droits</h2>
<p>Vous pouvez demander l'accès, la rectification, l'effacement de vos données, vous opposer à leur traitement ou retirer votre consentement en écrivant à ${mail}. Vous pouvez aussi saisir la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</p>
<h2>Cookies</h2>
<p>Sillon n'utilise ni cookie publicitaire ni outil de mesure d'audience.</p>`,
      },
      mentions: {
        title: "Mentions légales", updated: UPD,
        html: `
<h2>Éditeur</h2>
<p>${OWNER}<br>Contact : ${mail}<br>Directeur de la publication : ${OWNER}</p>
<h2>Hébergement</h2>
<p>Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis — <a href="https://www.netlify.com" target="_blank" rel="noopener">netlify.com</a></p>
<h2>Nature des résultats</h2>
<p>Les résultats de Sillon sont des estimations fondées sur des sources publiques citées dans chaque copilote (ADEME, EFRAG, EcoVadis, Légifrance…). Ils ne remplacent ni un bilan d'émissions de gaz à effet de serre réglementaire, ni un audit de certification, ni un conseil juridique. Les analyses rédigées par l'IA peuvent contenir des erreurs et doivent être vérifiées.</p>
<h2>Propriété intellectuelle</h2>
<p>Le code de Sillon est publié sous licence MIT. Les marques citées (EcoVadis, ISO, ADEME…) appartiennent à leurs titulaires ; leur mention n'implique aucun partenariat.</p>`,
      },
    },
  };
  window.SILLON_LEGAL.en = {
    confidentialite: { title: "Privacy policy", updated: "Updated 6 November 2026", html: `<p>The French version of this policy is the reference. In short: your answers stay in your browser; your contact details, report downloads and support requests are sent to the publisher by e-mail through Netlify Forms; AI analyses send the necessary content to Mistral AI (France), with training on this data switched off, or to Groq (USA) as a backup; your IP address is only used to count daily analyses. Contacts are kept for 3 years after the last exchange. To exercise your rights, write to ${mail}.</p>` },
    mentions: { title: "Legal notice", updated: "Updated 6 November 2026", html: `<p>Publisher: ${OWNER} — ${mail}. Hosting: Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, USA. Results are estimates based on public sources and do not replace a regulatory GHG assessment, a certification audit or legal advice. Code released under the MIT licence.</p>` },
  };
})();
