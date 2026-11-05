// Sillon — passerelle vers l'API Claude.
// La clé ANTHROPIC_API_KEY reste sur le serveur : les visiteurs n'ont rien à configurer.
// Limites : par adresse IP et par jour, plus un plafond global quotidien.

const MODELS = {
  chat: [process.env.MODEL_CHAT, "claude-haiku-5-5", "claude-haiku-4-5"],
  analyse: [process.env.MODEL_ANALYSE, "claude-sonnet-5-5", "claude-sonnet-4-5"],
  import: [process.env.MODEL_IMPORT, "claude-sonnet-5-5", "claude-sonnet-4-5"],
};
const PER_IP = Number(process.env.RATE_LIMIT_PER_IP || 30);
const GLOBAL = Number(process.env.GLOBAL_DAILY_LIMIT || 800);
const MAX_TOKENS = { chat: 900, analyse: 1600, import: 900 };

const SYSTEM = `Tu es le moteur d'analyse de Sillon, un outil RSE pour PME et ETI françaises (bilan carbone, VSME, EcoVadis, réglementation, achats responsables, greenwashing, marchés publics, ROI).
Règles :
- Tu réponds uniquement sur la RSE, le climat, la conformité extra-financière et l'utilisation de Sillon. Pour toute autre demande, réponds en une phrase que tu ne traites que les sujets RSE.
- Tu t'appuies sur les données fournies. Tu n'inventes ni chiffre, ni source, ni texte de loi.
- Tu ne donnes pas d'avis juridique définitif ; tu recommandes de faire valider les points sensibles.
- Tu restes concis et concret.`;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

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

function validate(body) {
  const kind = ["chat", "analyse", "import"].includes(body?.kind) ? body.kind : null;
  if (!kind) return "kind";
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
  for (const im of imgs) {
    if (!im || !/^image\/(jpeg|png|webp)$/.test(im.media_type) || typeof im.data !== "string" || im.data.length > 2_000_000) return "image";
  }
  return null;
}

function toAnthropic(msgs, imgs) {
  const out = [];
  for (const m of msgs) {
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) prev.content += "\n\n" + m.content;
    else out.push({ role: m.role, content: m.content });
  }
  if (imgs.length) {
    const last = out[out.length - 1];
    last.content = [...imgs.map((im) => ({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } })), { type: "text", text: last.content }];
  }
  return out;
}

async function callClaude(kind, messages) {
  const models = [...new Set(MODELS[kind].filter(Boolean))];
  let last;
  for (const model of models) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: MAX_TOKENS[kind], system: SYSTEM, messages, stream: true }),
    });
    if (res.ok) return res;
    const txt = await res.text().catch(() => "");
    last = { status: res.status, txt };
    if (!(res.status === 404 || (res.status === 400 && /model/i.test(txt)))) break;
  }
  return last;
}

export default async (req, context) => {
  if (req.method !== "POST") return json(405, { code: "method" });
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { code: "not_configured" });

  const origin = req.headers.get("origin");
  const host = new URL(req.url).host;
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!origin || (new URL(origin).host !== host && !allowed.includes(origin))) return json(403, { code: "origin" });

  let body;
  try { body = await req.json(); } catch { return json(400, { code: "invalid_request" }); }
  const bad = validate(body);
  if (bad) return json(400, { code: "invalid_request", detail: bad });

  const day = new Date().toISOString().slice(0, 10);
  const ip = context.ip || req.headers.get("x-nf-client-connection-ip") || "inconnu";
  const store = await counters();
  if (!(await bump(store, `global/${day}`, GLOBAL))) return json(429, { code: "global_limit" });
  if (!(await bump(store, `ip/${day}/${ip}`, PER_IP))) return json(429, { code: "rate_limited" });

  const upstream = await callClaude(body.kind, toAnthropic(body.messages, body.images || []));
  if (!upstream || !upstream.body) {
    const st = upstream?.status || 502;
    console.error("Anthropic", st, upstream?.txt?.slice(0, 300));
    return json(st === 429 || st === 529 ? 429 : 502, { code: st === 401 ? "not_configured" : st === 429 || st === 529 ? "busy" : "upstream_error" });
  }

  // Le flux SSE d'Anthropic est converti en texte brut, envoyé au fur et à mesure.
  const enc = new TextEncoder(), dec = new TextDecoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const reader = upstream.body.getReader();
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const evt = buf.slice(0, i); buf = buf.slice(i + 2);
            const line = evt.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            try {
              const d = JSON.parse(line.slice(5));
              if (d.type === "content_block_delta" && d.delta?.type === "text_delta") ctrl.enqueue(enc.encode(d.delta.text));
            } catch { /* ignore */ }
          }
        }
      } catch (e) { console.error("stream", e); }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
};

export const config = { path: "/api/claude" };
