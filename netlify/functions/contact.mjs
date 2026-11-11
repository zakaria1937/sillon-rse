// Sillon — réception des fiches contact et des demandes (accompagnement, désinscription, suppression).
// Filtre les robots et le spam avant de transmettre au formulaire Netlify, qui notifie le propriétaire.
import { json, store, bump, today, ipKey, sameOrigin, toForm } from "../lib/shared.mjs";

const FIELDS = ["evenement", "prenom", "nom", "email", "entreprise", "fonction", "telephone", "secteur", "effectif", "ca", "consentement", "majeur_pro", "copilote", "message", "resume"];
const MAX = { message: 3000, resume: 3000 };
const PER_IP = Number(process.env.CONTACT_LIMIT_PER_IP || 15);

export default async (req, context) => {
  if (req.method !== "POST") return json(405, { code: "method" });
  if (!sameOrigin(req)) return json(403, { code: "origin" });
  let b; try { b = await req.json(); } catch { return json(400, { code: "invalid_request" }); }
  // Pièges à robots : champ caché rempli, ou envoi moins de 2,5 s après l'ouverture de la page.
  if (b.piege || !(Number(b.delai) >= 2500)) return json(200, { ok: true });
  if (typeof b.evenement !== "string" || !b.evenement.trim()) return json(400, { code: "invalid_request" });
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(b.email))) return json(400, { code: "email" });
  const s = await store();
  if (!(await bump(s, `contact/${today()}/${await ipKey(req, context)}`, PER_IP))) return json(429, { code: "rate_limited" });
  const fields = {};
  for (const k of FIELDS) if (b[k] != null && b[k] !== "") fields[k] = String(b[k]).slice(0, MAX[k] || 200);
  const ok = await toForm(req, fields).catch(() => false);
  return ok ? json(200, { ok: true }) : json(502, { code: "forward_failed" });
};

export const config = { path: "/api/contact" };
