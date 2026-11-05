// Sillon — passerelle vers l'IA (Mistral, avec Groq en secours facultatif).
// Les clés restent sur le serveur : les visiteurs n'ont rien à configurer.
// Limites : par adresse IP et par jour, plus un plafond global quotidien.

const PROVIDERS = {
  mistral: {
    url: "https://api.mistral.ai/v1/chat/completions",
    key: () => process.env.MISTRAL_API_KEY,
    models: { chat: process.env.MISTRAL_MODEL_CHAT || "mistral-small-2603", analyse: process.env.MISTRAL_MODEL_ANALYSE || "mistral-medium-latest", import: process.env.MISTRAL_MODEL_IMPORT || "mistral-small-2603" },
    images: true,
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: () => process.env.GROQ_API_KEY,
    models: { chat: process.env.GROQ_MODEL || "openai/gpt-oss-120b", analyse: process.env.GROQ_MODEL || "openai/gpt-oss-120b", import: process.env.GROQ_MODEL || "openai/gpt-oss-120b" },
    images: false,
  },
};
const PER_IP = Number(process.env.RATE_LIMIT_PER_IP || 30);
const GLOBAL = Number(process.env.GLOBAL_DAILY_LIMIT || 800);
const MAX_TOKENS = { chat: 900, analyse: 1600, import: 900 };

const SYSTEM = `Tu es le moteur d'analyse de Sillon, un outil RSE pour PME et ETI françaises (bilan carbone, VSME, EcoVadis, réglementation, achats responsables, greenwashing, marchés publics, ROI).
Règles :
- Tu réponds uniquement sur la RSE, le climat, la conformité extra-financière et l'utilisation de Sillon. Pour toute autre demande, réponds en une phrase que tu ne traites que les sujets RSE.
- Tu t'appuies sur les données fournies. Tu n'inventes ni chiffre, ni source, ni texte de loi.
- Tu ne donnes pas d'avis juridique définitif ; tu recommandes de faire valider les points sensibles.
- Tu restes concis et concret. Tu réponds dans la langue de la demande.
Repères (ne pas contredire) :
- VSME : norme volontaire de reporting de durabilité pour les PME (« Voluntary SME standard »), publiée par l'EFRAG en décembre 2024 et recommandée par la Commission européenne en juillet 2025 ; module de base B1 à B11, module complet C1 à C9. Depuis l'Omnibus, c'est le plafond de ce que les grandes entreprises peuvent demander à leurs fournisseurs de moins de 1 000 salariés.
- CSRD après l'Omnibus I (en vigueur le 18/03/2026) : plus de 1 000 salariés et plus de 450 M€ de chiffre d'affaires.
- BEGES réglementaire : plus de 500 salariés en métropole, tous les 4 ans.
- Directive EmpCo (2024/825) : applicable depuis le 27/09/2026, interdit les allégations environnementales génériques et la neutralité carbone fondée sur la compensation.
- Marchés publics : critère d'attribution et condition d'exécution environnementaux obligatoires depuis le 21/08/2026.
- EcoVadis : thèmes Environnement, Social et droits humains, Éthique, Achats responsables ; médailles au percentile (Platine top 1 %, Or 5 %, Argent 15 %, Bronze 35 %), aucune médaille si un thème est sous 30.
- Scopes : 1 émissions directes, 2 énergie achetée, 3 autres émissions indirectes (achats, déplacements, usage des produits…).`;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

/* ---------- limites d'usage ---------- */
const memory = new Map();
async function counters() {
  try { const { getStore } = await import("@netlify/blobs"); return getStore({ name: "sillon-limits", consistency: "strong" }); }
  catch { return null; }
}
async function bump(store, key, limit) {
  if (store) {
    try {
      const cur = Number((await store.get(key)) || 0);
      if (cur >= limit) return false;
      await store.set(key, String(cur + 1));
      return true;
    } catch { /* bascule en mémoire */ }
  }
  const cur = memory.get(key) || 0;
  if (cur >= limit) return false;
  memory.set(key, cur + 1);
  return true;
}

/* ---------- validation ---------- */
function validate(body) {
  if (!["chat", "analyse", "import"].includes(body?.kind)) return "kind";
  const msgs = Array.isArray(body.messages) ? body.messages : null;
  if (!msgs || !msgs.length || msgs.length > 30) return "messages";
  let total = 0;
  for (const m of msgs) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content.trim()) return "message";
    total += m.content.length;
  }
  if (total > 80000) return "too_long";
  if (msgs[0].role !== "user" || msgs[msgs.length - 1].role !== "user") return "order";
  const imgs = Array.isArray(body.images) ? body.images : [];
  if (imgs.length > 2) return "images";
  for (const im of imgs) if (!im || !/^image\/(jpeg|png|webp)$/.test(im.media_type) || typeof im.data !== "string" || im.data.length > 2_000_000) return "image";
  return null;
}

function buildMessages(msgs, imgs) {
  const out = [{ role: "system", content: SYSTEM }];
  for (const m of msgs) {
    const prev = out[out.length - 1];
    if (prev.role === m.role) prev.content += "\n\n" + m.content;
    else out.push({ role: m.role, content: m.content });
  }
  if (imgs.length) {
    const last = out[out.length - 1];
    last.content = [{ type: "text", text: last.content }, ...imgs.map((im) => ({ type: "image_url", image_url: `data:${im.media_type};base64,${im.data}` }))];
  }
  return out;
}

/* ---------- appel du fournisseur, avec secours ---------- */
async function callAI(kind, msgs, imgs) {
  const order = ["mistral", "groq"].filter((p) => PROVIDERS[p].key() && (!imgs.length || PROVIDERS[p].images));
  if (!order.length) return { status: 503, code: "not_configured" };
  let last = { status: 502 };
  for (const name of order) {
    const P = PROVIDERS[name];
    let res;
    try {
      res = await fetch(P.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${P.key()}`, accept: "text/event-stream" },
        body: JSON.stringify({ model: P.models[kind], messages: buildMessages(msgs, imgs), max_tokens: MAX_TOKENS[kind], temperature: 0.3, stream: true }),
      });
    } catch (e) { last = { status: 502, txt: String(e) }; continue; }
    if (res.ok && res.body) return { res, provider: name };
    last = { status: res.status, txt: await res.text().catch(() => "") };
    console.error(name, res.status, last.txt.slice(0, 300));
    // On passe au fournisseur suivant si quota atteint, surcharge, modèle introuvable ou panne.
    if (![401, 403, 404, 422, 429, 500, 502, 503, 529].includes(res.status)) break;
  }
  return last;
}

export default async (req, context) => {
  if (req.method !== "POST") return json(405, { code: "method" });

  const origin = req.headers.get("origin");
  const host = new URL(req.url).host;
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  let originHost = null; try { originHost = origin && new URL(origin).host; } catch {}
  if (!originHost || (originHost !== host && !allowed.includes(origin))) return json(403, { code: "origin" });

  let body;
  try { body = await req.json(); } catch { return json(400, { code: "invalid_request" }); }
  const bad = validate(body);
  if (bad) return json(400, { code: "invalid_request", detail: bad });

  const day = new Date().toISOString().slice(0, 10);
  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "inconnu";
  const store = await counters();
  if (!(await bump(store, `global/${day}`, GLOBAL))) return json(429, { code: "global_limit" });
  if (!(await bump(store, `ip/${day}/${ip}`, PER_IP))) return json(429, { code: "rate_limited" });

  const r = await callAI(body.kind, body.messages, body.images || []);
  if (!r.res) {
    if (r.code) return json(r.status, { code: r.code });
    return json(r.status === 429 || r.status === 529 ? 429 : 502, { code: r.status === 401 ? "not_configured" : r.status === 429 || r.status === 529 ? "busy" : "upstream_error" });
  }

  // Flux SSE au format OpenAI (data: {...choices[0].delta.content}) converti en texte brut continu.
  const enc = new TextEncoder(), dec = new TextDecoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const reader = r.res.body.getReader();
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const d = JSON.parse(data);
              const t = d.choices?.[0]?.delta?.content;
              if (typeof t === "string" && t) ctrl.enqueue(enc.encode(t));
              else if (Array.isArray(t)) t.forEach((p) => p?.text && ctrl.enqueue(enc.encode(p.text)));
            } catch { /* ligne incomplète ignorée */ }
          }
        }
      } catch (e) { console.error("stream", e); }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-ai-provider": r.provider } });
};

export const config = { path: "/api/claude" };
