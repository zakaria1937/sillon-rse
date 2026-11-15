// Sillon — fonctions communes aux passerelles serveur.

export const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const memory = new Map();
export async function store(name = "sillon-limits") {
  try { const { getStore } = await import("@netlify/blobs"); return getStore({ name, consistency: "strong" }); }
  catch { return null; }
}
// Stockage clé-valeur : Netlify Blobs en production, mémoire en local et dans les tests.
export const kv = {
  async get(s, key) { if (s) { try { return await s.get(key); } catch { /* mémoire */ } } return memory.get(key) ?? null; },
  async set(s, key, val) { if (s) { try { await s.set(key, val); return; } catch { /* mémoire */ } } memory.set(key, val); },
  async del(s, key) { if (s) { try { await s.delete(key); return; } catch { /* mémoire */ } } memory.delete(key); },
};
export async function bump(s, key, limit) {
  const cur = Number((await kv.get(s, key)) || 0);
  if (cur >= limit) return false;
  await kv.set(s, key, String(cur + 1));
  return true;
}

export const today = () => new Date().toISOString().slice(0, 10);

export async function sha(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// L'adresse IP n'est jamais stockée en clair : empreinte salée, propre au jour.
export async function ipKey(req, context) {
  const raw = context?.ip || req.headers.get("x-nf-client-connection-ip") || "inconnu";
  return (await sha(`${today()}|${process.env.IP_SALT || "sillon"}|${raw}`)).slice(0, 24);
}

// Seul le site lui-même (ou une origine explicitement autorisée) peut appeler les passerelles.
export function sameOrigin(req) {
  const origin = req.headers.get("origin");
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
  try { return !!origin && (new URL(origin).host === new URL(req.url).host || allowed.includes(origin)); } catch { return false; }
}

// Envoi vers le formulaire Netlify « sillon », qui notifie le propriétaire par e-mail.
export async function toForm(req, fields) {
  const body = new URLSearchParams({ "form-name": "sillon", "bot-field": "", ...fields }).toString();
  const res = await fetch(new URL("/", req.url), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  return res.ok;
}

// Alerte technique au propriétaire, une fois par jour et par type de problème.
export async function alertOwner(req, s, code, detail) {
  try {
    if (!(await bump(s, `alerte/${today()}/${code}`, 1))) return;
    await toForm(req, { evenement: "Alerte technique", message: `${code} : ${detail}`.slice(0, 500) });
  } catch { /* une alerte ratée ne doit jamais casser la réponse */ }
}
