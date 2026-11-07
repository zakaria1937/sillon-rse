/* Sillon — cœur : état, langue, profil, liens entre copilotes, IA, téléchargements, chargement des modules. */
(function () {
  const { copilots, nf, num } = window.SILLON;
  const I = window.SILLON_I18N;
  const byId = Object.fromEntries(copilots.map((c) => [c.id, c]));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = "sillon.v2";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- état ---------- */
  const blank = () => ({ inputs: {}, ai: {}, used: {}, touched: {}, hist: {}, base: {}, plan: {}, custom: [], profile: null, lang: "fr", chat: [], contact: null });
  let state = blank();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem("sillon.v1") || "null");
    if (s && s.inputs) state = { ...blank(), ...s };
  } catch (e) {}
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 300); };

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
    state.custom.forEach((x) => out.push({ ...x, cp: "", custom: true }));
    const w = { high: 3, mid: 2, low: 1 };
    return out.sort((a, b) => (a.status === "done") - (b.status === "done") || w[b.impact] - w[a.impact] || w[a.effort] - w[b.effort]);
  }

  /* ---------- veille ---------- */
  const TIMELINE = [
    { d: "2026-02-26", t: "Omnibus I publié au Journal officiel de l'UE", s: "CSRD et CSDDD recentrées sur les grandes entreprises.", ap: () => true },
    { d: "2026-03-18", t: "Entrée en vigueur de l'Omnibus I", s: "CSRD : plus de 1 000 salariés et plus de 450 M€ de CA. Demandes aux PME plafonnées au niveau VSME.", ap: () => true },
    { d: "2026-06-07", t: "Transposition de la directive transparence salariale", s: "Directive (UE) 2023/970 : écarts de rémunération et transparence à l'embauche.", ap: (p) => num(p.eff) >= 100, check: true },
    { d: "2026-08-21", t: "Critère environnemental obligatoire dans les marchés publics", s: "Au moins un critère d'attribution et une condition d'exécution environnementaux.", ap: (p) => p.mp === "oui" },
    { d: "2026-09-27", t: "Application de la directive EmpCo", s: "Fin des allégations génériques et de la neutralité carbone par compensation.", ap: (p) => p.b2c === "oui" },
    { d: "2026-09-30", t: "Déclaration annuelle OPERAT (décret tertiaire)", s: "Consommations de l'année précédente pour les bâtiments de 1 000 m² et plus.", ap: (p) => num(p.surf) >= 1000 },
    { d: "2026-10-11", t: "Audit énergétique selon la nouvelle directive efficacité énergétique", s: "Seuil fondé sur la consommation (environ 2,75 GWh/an).", ap: (p) => num(p.gwh) > 2.75, check: true },
    { d: "2027-03-01", t: "Publication de l'index égalité professionnelle", s: "Chaque année, dès 50 salariés.", ap: (p) => num(p.eff) >= 50 },
    { d: "2027-03-19", t: "Transposition de la CSRD révisée", s: "Les États membres intègrent les nouveaux seuils dans leur droit.", ap: (p) => num(p.effM) > 1000 && num(p.ca) > 450 },
    { d: "2027-06-07", t: "Premiers rapports d'écart de rémunération", s: "Entreprises de 150 salariés et plus, selon la transposition française.", ap: (p) => num(p.eff) >= 150, check: true },
    { d: "2027-09-30", t: "Déclaration annuelle OPERAT", s: "Consommations 2026.", ap: (p) => num(p.surf) >= 1000 },
    { d: "2027-10-11", t: "Système de management de l'énergie (ISO 50001)", s: "Au-delà d'environ 23,6 GWh/an.", ap: (p) => num(p.gwh) > 23.6, check: true },
    { d: "2028-07-26", t: "Transposition de la CSDDD", s: "Devoir de vigilance européen : plus de 5 000 salariés et 1,5 Md€ de CA.", ap: (p) => num(p.effM) > 5000 },
    { d: "2029-07-26", t: "Application de la CSDDD", s: "Plans de vigilance et due diligence obligatoires.", ap: (p) => num(p.effM) > 5000 },
    { d: "2030-12-31", t: "Décret tertiaire : -40 % de consommation", s: "Objectif par rapport à l'année de référence choisie (2010 au plus tôt).", ap: (p) => num(p.surf) >= 1000 },
  ];

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
    const fields = { "form-name": "sillon", "bot-field": "", evenement, prenom: c.prenom || "", nom: c.nom || "", email: c.email || "", entreprise: c.entreprise || p.nom || "", fonction: c.fonction || "", telephone: c.telephone || "", secteur: p.secteur || "", effectif: String(p.eff ?? ""), ca: String(p.ca ?? ""), consentement: c.consent ? "oui" : "non", majeur_pro: c.adult ? "oui" : "non", ...extra };
    try {
      const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields).toString() });
      return r.ok;
    } catch (e) { return false; }
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
    inClaude, ask, aiAvailable, aiError, notify, onCaps, isSample: () => !!sample, saveFile, loadLib, toast, blank };
})();
