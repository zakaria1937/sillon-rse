# Composants tiers et licences

Tous les composants ci-dessous sont hébergés dans ce dépôt et servis par le site lui-même : aucune requête n'est faite vers un service tiers pendant la navigation.

| Composant | Version | Fichier(s) | Licence | Auteur |
|---|---|---|---|---|
| three.js | r128 (0.128.0) | `vendor/three.min.js` | MIT | three.js authors |
| jsPDF | 2.5.1 | `vendor/jspdf.umd.min.js` | MIT | James Hall, yWorks GmbH et contributeurs |
| SheetJS Community Edition | 0.18.5 | `vendor/xlsx.full.min.js` | Apache 2.0 | SheetJS LLC |
| PDF.js | 3.11.174 | `vendor/pdf.min.js`, `vendor/pdf.worker.min.js` | Apache 2.0 | Mozilla Foundation |
| Bricolage Grotesque | Fontsource 5.x | `fonts/bricolage-grotesque-*.woff2` | SIL OFL 1.1 (`fonts/OFL-Bricolage-Grotesque.txt`) | The Bricolage Grotesque Project Authors |
| IBM Plex Sans, IBM Plex Mono | Fontsource 5.x | `fonts/ibm-plex-*.woff2` | SIL OFL 1.1 (`fonts/OFL-IBM-Plex.txt`) | IBM Corp. |

Images : aucune image tierce. Le logo, les icônes et la scène 3D sont créés pour Sillon.

Données : facteurs d'émission de l'ADEME (Base Empreinte, impactCO2), norme VSME de l'EFRAG, règles publiques d'EcoVadis, textes de loi publiés (Légifrance, Journal officiel de l'UE). Les sources sont citées dans chaque copilote.

Note : SheetJS 0.18.5 n'est utilisé que pour **écrire** des fichiers Excel ; aucun fichier fourni par un visiteur n'est lu avec cette bibliothèque.
