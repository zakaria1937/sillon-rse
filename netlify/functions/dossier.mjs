// Sillon — sauvegarde en ligne chiffrée côté navigateur (AES-GCM).
// Le serveur ne reçoit que l'empreinte du code et un bloc chiffré : il ne peut pas lire le dossier.
import { json, store, kv, bump, today, sha, ipKey, sameOrigin } from "../lib/shared.mjs";

const MAX_BYTES = 400_000;
const KEEP_DAYS = 365;
const validCode = (c) => typeof c === "string" && /^[a-z0-9]{24,64}$/.test(c);

export default async (req, context) => {
  if (!sameOrigin(req) && req.method !== "GET") return json(403, { code: "origin" });
  const s = await store("sillon-dossiers");
  const limits = await store();
  if (!(await bump(limits, `dossier/${today()}/${await ipKey(req, context)}`, Number(process.env.DOSSIER_LIMIT_PER_IP || 300)))) return json(429, { code: "rate_limited" });

  let b; try { b = await req.json(); } catch { return json(400, { code: "invalid_request" }); }
  if (!validCode(b?.code)) return json(400, { code: "invalid_code" });
  const key = await sha(b.code);
  if (req.method === "POST") {
    const raw = await kv.get(s, key);
    if (!raw) return json(404, { code: "not_found" });
    const rec = JSON.parse(raw);
    if (Date.now() - Date.parse(rec.maj) > KEEP_DAYS * 864e5) { await kv.del(s, key); return json(404, { code: "not_found" }); }
    return json(200, rec);
  }
  if (req.method === "DELETE") { await kv.del(s, key); return json(200, { ok: true }); }
  if (req.method !== "PUT") return json(405, { code: "method" });
  const encrypted = b.data && b.data.v === 2 && typeof b.data.iv === "string" && /^[A-Za-z0-9+/]{16}$/.test(b.data.iv) && typeof b.data.ciphertext === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(b.data.ciphertext);
  const legacy = b.data && typeof b.data === "object" && b.data.inputs;
  if (!encrypted && !legacy) return json(400, { code: "invalid_request" });
  const rec = JSON.stringify({ maj: new Date().toISOString(), data: b.data });
  if (rec.length > MAX_BYTES) return json(413, { code: "too_large" });
  await kv.set(s, key, rec);
  return json(200, { ok: true, maj: JSON.parse(rec).maj });
};

export const config = { path: "/api/dossier" };
