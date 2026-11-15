/* Sillon — cœur : état, langue, profil, liens entre copilotes, IA, téléchargements, chargement des modules. */
(function () {
  const { copilots, nf, num } = window.SILLON;
  const I = window.SILLON_I18N;
  const byId = Object.fromEntries(copilots.map((c) => [c.id, c]));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = "sillon.v2";
  const T0 = Date.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- état ---------- */
  const blank = () => ({ inputs: {}, ai: {}, used: {}, touched: {}, hist: {}, base: {}, plan: {}, custom: [], profile: null, lang: "fr", chat: [], contact: null, cloud: null });
  let state = blank();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem("sillon.v1") || "null");
    if (s && s.inputs) state = { ...blank(), ...s };
    state.custom = (state.custom || []).filter((a) => a && a.text && a.text.trim());
    if (state.contact && state.contact.consent && state.contact.recontact === undefined) state.contact.recontact = true; // fiches créées avant la séparation des deux accords
    state.lang = "fr"; // la version anglaise est désactivée tant qu'elle n'est pas complète
  } catch (e) {}
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 300); cloudLater(); };

  /* ---------- sauvegarde en ligne (facultative, protégée par un code secret créé ici) ---------- */
  const newCode = () => { const a = new Uint8Array(20); crypto.getRandomValues(a); return [...a].map((b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("") + Date.now().toString(36).slice(-6); };
  const cloudPayload = () => { const { cloud, chat, ...rest } = state; return rest; };
  let cloudT = null, cloudState = "idle";
  async function cloudSave() {
    if (!state.cloud || !state.cloud.code) return false;
    try {
      const r = await fetch("/api/dossier", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: state.cloud.code, data: cloudPayload() }) });
      if (!r.ok) { cloudState = "error"; return false; }
      state.cloud.maj = (await r.json()).maj; cloudState = "ok";
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      return true;
    } catch (e) { cloudState = "error"; return false; }
  }
  function cloudLater() { if (!state.cloud || !state.cloud.code) return; clearTimeout(cloudT); cloudT = setTimeout(cloudSave, 15000); }
  async function cloudEnable() { state.cloud = { code: newCode(), maj: null }; const ok = await cloudSave(); if (!ok) state.cloud = null; save(); return ok; }
  async function cloudLoad(code) {
    code = String(code || "").trim().toLowerCase();
    if (!/^[a-z0-9]{24,64}$/.test(code)) throw { code: "invalid_code" };
    const r = await fetch("/api/dossier?code=" + code).catch(() => { throw { code: "offline" }; });
    if (!r.ok) throw { code: r.status === 404 ? "not_found" : "upstream_error" };
    const rec = await r.json();
    state = { ...blank(), ...rec.data, lang: state.lang, cloud: { code, maj: rec.maj }, chat: [] };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    return true;
  }
  async function cloudDelete() {
    if (!state.cloud) return true;
    try { const r = await fetch("/api/dossier", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: state.cloud.code }) }); if (!r.ok) return false; } catch (e) { return false; }
    state.cloud = null; save(); return true;
  }


  /* ---------- langue ---------- */
  const t = (k, vars) => { let s = (I[state.lang] || I.fr)[k] ?? I.fr[k] ?? k; if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace("{" + a + "}", b); return s; };
  const cpT = (c) => (state.lang === "en" && I.cp[c.id] ? { title: I.cp[c.id][0], short: I.cp[c.id][1], intro: I.cp[c.id][2] } : { title: c.title, short: c.short, intro: c.intro });
  const famT = (f) => (state.lang === "en" ? { title: I.fams[f.id][0], sub: I.fams[f.id][1] } : f);

  /* ---------- profil ---------- */
  const PROFILE_FIELDS = [
    { id: "nom", type: "text", k: "prof_name", def: "" },
    { id: "secteur", type: "select", k: "prof_sector", def: "Industrie", options: ["Industrie", "Services", "BTP", "Commerce", "Numérique", "Transport", "Agroalimentaire"] },
    { id: "eff", type: "number", k: "prof_eff", def: 140 }, { id: "effM", type: "number", k: "prof_effM", def: 140 },
    { id: "ca", type: "number", k: "prof_ca", def: 28 }, { id: "surf", type: "number", k: "prof_surf", def: 1200 },
    { id: "gwh", type: "number", k: "prof_gwh", def: 3.1 },
    { id: "mp", type: "seg", k: "prof_mp", def: "oui" }, { id: "b2c", type: "seg", k: "prof_b2c", def: "oui" },
  ];
  const profile = () => state.profile || Object.fromEntries(PROFILE_FIELDS.map((f) => [f.id, f.def]));

  /* ---------- valeurs des copilotes ---------- */
  function defaults(cp) {
    const v = {}, p = state.profile;
    cp.fields.forEach((f) => {
      if (f.type === "group") return;
      if (f.type === "checklist") v[f.id] = Object.fromEntries(f.items.map((i) => [i.id, i.def ?? f.states[f.states.length - 1][0]]));
      else if (f.type === "table") v[f.id] = JSON.parse(JSON.stringify(f.def));
      else v[f.id] = f.def;
      if (p && f.prof && p[f.prof] !== undefined && p[f.prof] !== "") v[f.id] = f.profMul ? num(p[f.prof]) * f.profMul : p[f.prof];
    });
    return v;
  }
  const inputs = (cp) => { if (!state.inputs[cp.id]) state.inputs[cp.id] = defaults(cp); return state.inputs[cp.id]; };
  function applyProfile() {
    const p = state.profile; if (!p) return;
    copilots.forEach((cp) => {
      const v = inputs(cp), tch = state.touched[cp.id] || {};
      cp.fields.forEach((f) => { if (f.prof && !tch[f.id] && p[f.prof] !== undefined && p[f.prof] !== "") v[f.id] = f.profMul ? num(p[f.prof]) * f.profMul : p[f.prof]; });
    });
    save();
  }

  /* ---------- liens entre copilotes ---------- */
  const LINKS = [
    { to: "reporting-vsme", field: "b", item: "B3", from: "bilan-carbone", val: () => "ok" },
    { to: "benchmark-rse", field: "env", item: "e1", from: "bilan-carbone", val: () => "1" },
    { to: "marches-publics", field: "ev", item: "bilan", from: "bilan-carbone", val: () => "1" },
    { to: "ecovadis", field: "env", item: "kpi", from: "bilan-carbone", val: () => "2" },
    { to: "benchmark-rse", field: "ach", item: "a3", from: "fournisseurs", val: () => "1" },
    { to: "visibilite-rse", field: "ck", item: "claims", from: "greenwashing", val: (r) => (r.gauge.val >= 75 ? "1" : r.gauge.val >= 45 ? "0.5" : "0") },
    { to: "marches-publics", field: "ev", item: "lab", from: "audit-iso", val: (r) => (r.gauge.val >= 85 ? "0.5" : null) },
  ];
  const linkKey = (l) => l.field + "." + l.item;
  function resolved(cp) {
    const v = inputs(cp), tch = state.touched[cp.id] || {}, applied = {};
    LINKS.filter((l) => l.to === cp.id && state.used[l.from] && !tch[linkKey(l)]).forEach((l) => {
      const src = byId[l.from], r = src.compute(inputs(src)), x = l.val(r);
      if (x == null) return;
      (v[l.field] ||= {})[l.item] = x; applied[linkKey(l)] = l.from;
    });
    return { v, applied };
  }
  const result = (cp) => cp.compute(resolved(cp).v);

  /* ---------- historique et référence ---------- */
  function record(cp) {
    const r = result(cp); if (!r.gauge) return;
    const h = (state.hist[cp.id] ||= []), d = today(), val = r.gauge.val;
    const last = h[h.length - 1];
    if (last && last.d === d) last.v = val; else h.push({ d, v: val });
    if (h.length > 60) h.shift();
  }

  /* ---------- plan d'action ---------- */
  const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return "a" + (h >>> 0).toString(36); };
  function planItems() {
    const out = [];
    copilots.filter((c) => state.used[c.id]).forEach((c) => {
      const r = result(c), sev = r.findings.some((f) => f.lvl === "crit") ? 3 : r.findings.some((f) => f.lvl === "warn") ? 2 : 1;
      r.actions.forEach((a, i) => {
        const id = hash(c.id + a), meta = state.plan[id] || {};
        const effort = meta.effort || (/(audit|certification|plan de|fournisseurs|alternative|bâtir|lancer)/i.test(a) ? "high" : /(publier|désigner|fixer|choisir|ajouter|demander)/i.test(a) ? "low" : "mid");
        const impact = meta.impact || (i === 0 && sev === 3 ? "high" : sev >= 2 && i < 2 ? "high" : sev >= 2 ? "mid" : "low");
        out.push({ id, cp: c.id, text: a, impact, effort, owner: meta.owner || "", due: meta.due || "", status: meta.status || "todo" });
      });
    });
    state.custom.filter((x) => x.text && x.text.trim()).forEach((x) => out.push({ ...x, cp: "", custom: true }));
    const w = { high: 3, mid: 2, low: 1 };
    return out.sort((a, b) => (a.status === "done") - (b.status === "done") || w[b.impact] - w[a.impact] || w[a.effort] - w[b.effort]);
  }

  /* ---------- veille ---------- */
  const TIMELINE = window.SILLON_REF.echeances;

  /* ---------- IA : claude.ai (sample) ou passerelle /api/claude ---------- */
  const inClaude = !!(window.claude && typeof window.claude.use === "function");
  let sample = null, downloads = null;
  const capsReady = [];
  const onCaps = (fn) => capsReady.push(fn);
  const fire = () => capsReady.forEach((f) => { try { f(); } catch (e) {} });
  if (inClaude) {
    claude.use("sample").then((s) => { sample = s; fire(); }).catch(() => {});
    claude.use("downloads").then((d) => { downloads = d; fire(); }).catch(() => {});
  }
  const aiAvailable = () => (inClaude ? !!sample : true);
  const langLine = () => (state.lang === "en" ? "\n\nAnswer in English." : "");

  // Réduit une image avant envoi (1 600 px max, JPEG) pour rester sous les limites du serveur.
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return { media_type: "image/jpeg", data: c.toDataURL("image/jpeg", 0.85).split(",")[1] };
    } finally { URL.revokeObjectURL(url); }
  }

  async function ask(input, opt = {}) {
    if (typeof input === "string") input += langLine();
    else if (state.lang === "en") input = [{ role: "user", content: "Always answer in English." }, ...input];
    if (sample) {
      const o = { signal: opt.signal, onText: opt.onText, cache: false };
      if (opt.images && opt.images.length) o.images = opt.images;
      if (opt.json) return sample.json(input, o);
      return (await sample(input, o)).text;
    }
    if (inClaude) throw { code: "not_granted" };
    const messages = typeof input === "string" ? [{ role: "user", content: input }] : input;
    const images = [];
    for (const im of opt.images || []) images.push(await shrink(im));
    let res;
    try {
      res = await fetch("/api/claude", { method: "POST", signal: opt.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: opt.kind || "analyse", messages, images }) });
    } catch (e) { throw { code: e && e.name === "AbortError" ? "cancelled" : "offline" }; }
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw { code: j.code || (res.status === 404 ? "no_server" : res.status === 429 ? "rate_limited" : "upstream_error") }; }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let text = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const delta = dec.decode(value, { stream: true });
        if (!delta) continue;
        text += delta;
        opt.onText && opt.onText({ text, delta });
      }
    } catch (e) { throw { code: e && e.name === "AbortError" ? "cancelled" : "upstream_error", text }; }
    if (!text.trim()) throw { code: "upstream_error" };
    if (opt.json) { const m = text.match(/[\[{][\s\S]*[\]}]/); if (!m) throw { code: "invalid_json", text }; try { return JSON.parse(m[0]); } catch (e) { throw { code: "invalid_json", text }; } }
    return text;
  }
  const ERR = {
    fr: { cancelled: "", not_granted: "L'analyse n'a pas été autorisée.", sampling_disabled: "Claude n'est pas disponible pour ce compte.", rate_limited: "Vous avez atteint la limite d'analyses du jour. Revenez demain ou demandez un accompagnement.", global_limit: "Le service d'analyse est très sollicité aujourd'hui. Réessayez demain.", busy: "Le service d'analyse est momentanément surchargé. Réessayez dans une minute.", not_configured: "Le service d'analyse n'est pas encore activé.", no_server: "Le service d'analyse n'est pas disponible à cette adresse.", offline: "Connexion impossible. Vérifiez votre réseau.", refused: "Cette demande n'a pas pu être traitée.", invalid_json: "Le document n'a pas pu être lu correctement. Essayez un autre fichier." },
    en: { cancelled: "", not_granted: "The analysis was not allowed.", sampling_disabled: "Claude is not available for this account.", rate_limited: "You have reached today's analysis limit. Come back tomorrow or request support.", global_limit: "The analysis service is very busy today. Try again tomorrow.", busy: "The analysis service is busy. Try again in a minute.", not_configured: "The analysis service is not enabled yet.", no_server: "The analysis service is not available at this address.", offline: "Cannot connect. Check your network.", refused: "This request could not be processed.", invalid_json: "The document could not be read. Try another file." },
  };
  const aiError = (e) => ERR[state.lang === "en" ? "en" : "fr"][e && e.code] ?? (state.lang === "en" ? "The analysis was interrupted. Try again." : "L'analyse a été interrompue. Relancez-la.");

  /* ---------- notifications (formulaires Netlify → e-mail du propriétaire) ---------- */
  async function notify(evenement, extra = {}) {
    if (inClaude) return false;
    const c = state.contact || {}, p = profile();
    const fields = { "form-name": "sillon", "bot-field": "", evenement, prenom: c.prenom || "", nom: c.nom || "", email: c.email || "", entreprise: c.entreprise || p.nom || "", fonction: c.fonction || "", telephone: c.telephone || "", secteur: p.secteur || "", effectif: String(p.eff ?? ""), ca: String(p.ca ?? ""), consentement: c.recontact ? "oui, accepte d'être recontacté" : "NON : ne pas recontacter", majeur_pro: c.adult ? "oui" : "non", ...extra };
    const direct = async () => { try { return (await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields).toString() })).ok; } catch (e) { return false; } };
    // Passage par /api/contact (filtre anti-robots et limite d'envois) ; envoi direct si la passerelle est en panne.
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...fields, piege: "", delai: Date.now() - T0 }) });
      if (r.ok) return true;
      if (r.status >= 500 || r.status === 404) return direct();
      return false;
    } catch (e) { return direct(); }
  }

  /* ---------- téléchargements ---------- */
  async function saveFile(name, blob) {
    if (downloads) { await downloads.save({ filename: name, data: blob }); return true; }
    if (inClaude) throw { code: "unavailable" };
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return true;
  }

  /* ---------- modules chargés à la demande ---------- */
  const LIBS = {
    three: ["vendor/three.min.js"],
    jspdf: ["vendor/jspdf.umd.min.js"],
    xlsx: ["vendor/xlsx.full.min.js"],
    pdfjs: ["vendor/pdf.min.js"],
  };
  const loaded = {};
  function loadLib(name) {
    if (loaded[name]) return loaded[name];
    loaded[name] = LIBS[name].reduce((p, src) => p.then(() => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => { delete loaded[name]; ko(new Error("load")); }; document.head.appendChild(s); })), Promise.resolve());
    return loaded[name];
  }

  function toast(msg) {
    if (!msg) return;
    const el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); el.textContent = msg; document.body.appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }

  window.SX = { copilots, byId, nf, num, esc, state: () => state, setState: (s) => { state = s; }, save, t, cpT, famT, reduce, today,
    PROFILE_FIELDS, profile, defaults, inputs, applyProfile, LINKS, linkKey, resolved, result, record, planItems, TIMELINE,
    inClaude, ask, aiAvailable, aiError, notify, onCaps, cloudEnable, cloudSave, cloudLoad, cloudDelete, cloudStatus: () => cloudState, isSample: () => !!sample, saveFile, loadLib, toast, blank };
})();
