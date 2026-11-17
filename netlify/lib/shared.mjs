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

// Variante fail-closed pour les contrôles de sécurité en production.
// Contrairement au compteur générique, elle ne retombe jamais sur une mémoire locale
// si Netlify Blobs est indisponible.
export async function bumpStrict(s, key, limit) {
  if (!s || typeof s.get !== "function" || typeof s.set !== "function") {
    throw new Error("persistent_store_unavailable");
  }
  const raw = await s.get(key);
  const cur = raw == null ? 0 : Number(raw);
  if (!Number.isSafeInteger(cur) || cur < 0) throw new Error("invalid_rate_limit_counter");
  if (cur >= limit) return false;
  await s.set(key, String(cur + 1));
  return true;
}

// Les quotas qui protègent des coûts ou des abus ne doivent jamais basculer
// sur une mémoire éphémère en production si Netlify Blobs est indisponible.
export async function bumpProtected(s, key, limit) {
  return process.env.NETLIFY === "true"
    ? bumpStrict(s, key, limit)
    : bump(s, key, limit);
}

export const today = () => new Date().toISOString().slice(0, 10);

export async function sha(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// L'adresse IP n'est jamais stockée en clair : empreinte salée, propre au jour.
export async function ipKey(req, context) {
  const salt = process.env.IP_SALT;
  if (process.env.NETLIFY === "true" && (!salt || salt.length < 32)) {
    throw new Error("ip_salt_not_configured");
  }
  const raw = context?.ip || req.headers.get("x-nf-client-connection-ip") || "inconnu";
  return (await sha(`${today()}|${salt || "sillon-local-only"}|${raw}`)).slice(0, 24);
}

// Seul le site lui-même (ou une origine explicitement autorisée) peut appeler les passerelles.
export function sameOrigin(req) {
  const origin = req.headers.get("origin");
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
  try { return !!origin && (new URL(origin).origin === new URL(req.url).origin || allowed.includes(new URL(origin).origin)); } catch { return false; }
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


// Lecture JSON en flux : interrompt la consommation dès que la limite d'octets est dépassée.
// Cela évite de matérialiser un corps arbitrairement volumineux avant le contrôle.
export async function readJsonLimited(req, maxBytes) {
  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isSafeInteger(declaredLength) && declaredLength > maxBytes) return { error: 413 };
  if (!req.body) return { value: {} };

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let raw = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel("request_body_too_large").catch(() => {});
        return { error: 413 };
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    try { return { value: raw ? JSON.parse(raw) : {} }; }
    catch { return { error: 400 }; }
  } catch {
    return { error: 400 };
  } finally {
    try { reader.releaseLock(); } catch { /* flux déjà libéré */ }
  }
}
