/* Sillon — import de documents, assistant, réglages IA, mode présentation. */
(function () {
  const X = window.SX, V = () => window.SXV;
  const { copilots, byId, nf, esc, t, cpT } = X;
  const S = () => X.state();

  /* ---------- import de document ---------- */
  async function pdfText(file) {
    await X.loadLib("pdfjs");
    const lib = window.pdfjsLib;
    try { lib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js"; } catch (e) {}
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    let out = "";
    for (let i = 1; i <= Math.min(doc.numPages, 12); i++) {
      const pg = await doc.getPage(i), tc = await pg.getTextContent();
      out += tc.items.map((x) => x.str).join(" ") + "\n";
      if (out.length > 40000) break;
    }
    return out.slice(0, 40000);
  }
  function schema(cp) {
    const L = [];
    cp.fields.forEach((f) => {
      if (f.type === "number" || f.type === "range") L.push(`"${f.id}": nombre en ${f.unit || "unité"} — ${f.label}`);
      else if (f.type === "select" || f.type === "seg") L.push(`"${f.id}": une valeur parmi ${f.options.map((o) => JSON.stringify(o[0]) + " (" + o[1] + ")").join(", ")} — ${f.label}`);
      else if (f.type === "checklist") f.items.forEach((i) => L.push(`"${f.id}.${i.id}": une valeur parmi ${f.states.map((s) => JSON.stringify(s[0]) + " (" + s[1] + ")").join(", ")} — ${i.label}`));
    });
    return L.join("\n");
  }
  async function importDoc(cp, file) {
    if (!file) return;
    if (!(await ensureContact())) return;
    const status = document.getElementById("importStatus");
    const say = (m) => status && (status.textContent = m);
    say(S().lang === "en" ? "Reading the document…" : "Lecture du document…");
    try {
      let text = "", images = [];
      if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) text = await pdfText(file);
      else if (/^image\//.test(file.type)) images = [file];
      else text = (await file.text()).slice(0, 40000);
      if (!text.trim() && !images.length) { say(""); X.toast(t("toast_import_none")); return; }
      say(S().lang === "en" ? "AI is extracting the figures…" : "L'IA extrait les chiffres…");
      const prompt = `Tu extrais des données d'un document d'entreprise pour remplir un outil RSE (copilote « ${cp.title} »).\nChamps disponibles :\n${schema(cp)}\n\nRéponds uniquement par un objet JSON dont les clés sont des noms de champs ci-dessus et les valeurs ce que le document indique explicitement (nombres sans unité ni espace, en convertissant dans l'unité demandée). N'inclus pas un champ si le document ne permet pas de le renseigner. Exemple : {"elec": 420000, "gaz": 350000}\n\n${text ? "Document :\n" + text : "Le document est l'image jointe."}`;
      const data = await X.ask(prompt, { json: true, images, kind: "import" });
      const v = X.inputs(cp), tch = (S().touched[cp.id] ||= {});
      let n = 0;
      for (const [k, val] of Object.entries(data || {})) {
        if (k.includes(".")) {
          const [fid, iid] = k.split("."), f = cp.fields.find((x) => x.id === fid && x.type === "checklist");
          if (f && f.items.some((i) => i.id === iid) && f.states.some((s) => String(s[0]) === String(val))) { (v[fid] ||= {})[iid] = String(val); tch[k] = true; n++; }
          continue;
        }
        const f = cp.fields.find((x) => x.id === k); if (!f) continue;
        if (f.type === "number" || f.type === "range") { const x = parseFloat(String(val).replace(/[\s ]/g, "").replace(",", ".")); if (isFinite(x)) { v[k] = x; tch[k] = true; n++; } }
        else if ((f.type === "select" || f.type === "seg") && f.options.some((o) => String(o[0]) === String(val))) { v[k] = String(val); tch[k] = true; n++; }
      }
      if (n) { S().used[cp.id] = true; X.record(cp); X.save(); V().header(); V().view(cp); }
      X.toast(n ? t("toast_import", { n }) : t("toast_import_none"));
      say("");
    } catch (e) {
      say(""); X.toast(e && e.message === "load" ? t("toast_lib") : X.aiError(e));
    }
  }

  /* ---------- accessibilité : le focus clavier reste dans la fenêtre ouverte ---------- */
  function trapTab(e, root) {
    if (e.key !== "Tab") return;
    const f = [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- fiche contact (débloque l'IA et les exports) ---------- */
  function modal(html, labelId) {
    const d = document.createElement("div");
    d.className = "modal"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", labelId);
    d.innerHTML = html; document.body.appendChild(d);
    const prev = document.activeElement;
    const close = () => { d.remove(); prev && prev.focus && prev.focus(); };
    d.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); else trapTab(e, d); });
    d.addEventListener("click", (e) => e.target === d && close());
    return { d, close };
  }
  let pending = null;
  function contactDialog(reason) {
    if (pending) return pending;
    pending = new Promise((resolve) => {
      const c = S().contact || {}, p = X.profile();
      const f = (id, lab, type = "text", req = false, val = "", ac = "") => `<div class="field${id === "email" ? " wide" : ""}"><label for="c-${id}">${esc(lab)}${req ? " *" : ""}</label><div class="inp"><input id="c-${id}" name="${id}" type="${type}" ${req ? "required" : ""} ${ac ? `autocomplete="${ac}"` : ""} value="${esc(val)}"></div></div>`;
      const { d, close } = modal(`<form class="panel modal-box wide-box" novalidate><h2 id="cH">${esc(t("ct_title"))}</h2><p class="sub">${esc(t("ct_sub"))}${reason ? " " + esc(reason) : ""}</p>
        <div class="fgrid">
          ${f("prenom", t("ct_first"), "text", true, c.prenom, "given-name")}${f("nom", t("ct_last"), "text", true, c.nom, "family-name")}
          ${f("email", t("ct_email"), "email", true, c.email, "email")}
          ${f("entreprise", t("ct_company"), "text", true, c.entreprise || p.nom, "organization")}${f("fonction", t("ct_role"), "text", false, c.fonction, "organization-title")}
          ${f("telephone", t("ct_phone"), "tel", false, c.telephone, "tel")}
        </div>
        <label class="consent"><input type="checkbox" id="c-adult" ${c.adult ? "checked" : ""}> <span>${esc(t("ct_adult"))} *</span></label>
        <label class="consent"><input type="checkbox" id="c-consent" ${c.consent ? "checked" : ""}> <span>${esc(t("ct_service"))} <a href="#confidentialite" target="_blank">${esc(S().lang === "en" ? "privacy policy" : "politique de confidentialité")}</a>. *</span></label>
        <label class="consent opt"><input type="checkbox" id="c-recontact" ${c.recontact ? "checked" : ""}> <span><b>${esc(t("ct_optional"))}</b> ${esc(t("ct_recontact"))}</span></label>
        <p class="fine">${esc(t("ct_note"))}</p>
        <p class="err" id="cErr" role="alert" hidden></p>
        <div class="toolbar"><button class="chip-btn primary" type="submit">${esc(t("ct_go"))}</button><button class="chip-btn" type="button" data-close>${esc(t("chat_close"))}</button></div></form>`, "cH");
      const done = (v) => { pending = null; close(); resolve(v); };
      d.querySelector("[data-close]").onclick = () => done(false);
      d.addEventListener("keydown", (e) => { if (e.key === "Escape") { pending = null; resolve(false); } });
      d.addEventListener("click", (e) => { if (e.target === d) { pending = null; resolve(false); } });
      d.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        const g = (id) => d.querySelector("#c-" + id).value.trim();
        const err = d.querySelector("#cErr");
        const v = { prenom: g("prenom"), nom: g("nom"), email: g("email"), entreprise: g("entreprise"), fonction: g("fonction"), telephone: g("telephone"), adult: d.querySelector("#c-adult").checked, consent: d.querySelector("#c-consent").checked, recontact: d.querySelector("#c-recontact").checked };
        const miss = !v.prenom || !v.nom || !v.entreprise || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) ? t("ct_err_fields") : !v.adult ? t("ct_err_adult") : !v.consent ? t("ct_err_consent") : "";
        if (miss) { err.textContent = miss; err.hidden = false; return; }
        const first = !S().contact;
        S().contact = { ...v, d: X.today() };
        if (!S().profile) S().profile = { ...X.profile(), nom: v.entreprise };
        X.save();
        X.notify(first ? "Nouveau contact" : "Coordonnées mises à jour", { copilote: location.hash.slice(1) || "accueil" });
        X.toast(t("ct_thanks", { p: v.prenom }));
        done(true);
      };
      d.querySelector("#c-prenom").focus();
    });
    return pending;
  }
  const ensureContact = async (reason) => (S().contact && S().contact.email && S().contact.adult ? true : contactDialog(reason));

  function accompanyDialog() {
    const { d, close } = modal(`<form class="panel modal-box"><h2 id="aH">${esc(t("acc_title"))}</h2><p class="sub">${esc(t("acc_sub"))}</p>
      <div class="field"><label for="a-msg">${esc(t("acc_msg"))}</label><textarea class="ta" id="a-msg" rows="5" required placeholder="${esc(t("acc_ph"))}"></textarea></div>
      <div class="toolbar"><button class="chip-btn primary" type="submit">${esc(t("acc_send"))}</button><button class="chip-btn" type="button" data-close>${esc(t("chat_close"))}</button></div></form>`, "aH");
    d.querySelector("[data-close]").onclick = close;
    d.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const msg = d.querySelector("#a-msg").value.trim(); if (!msg) return;
      close();
      if (!(await ensureContact())) return;
      const used = copilots.filter((c) => S().used[c.id]).map((c) => { const r = X.result(c); return `${c.title} : ${r.verdict}`; }).join("\n");
      const ok = await X.notify("Demande d'accompagnement", { message: msg, resume: used || "Aucun copilote utilisé", consentement: "demande une réponse à ce message" });
      X.toast(ok || X.inClaude ? t("acc_ok") : t("acc_fail"));
    };
    d.querySelector("#a-msg").focus();
  }

  /* ---------- assistant ---------- */
  let chatCtl = null;
  function context() {
    const st = S(), used = copilots.filter((c) => st.used[c.id]);
    const parts = used.map((c) => { const r = X.result(c); return `### ${c.title}\n${r.verdict}. ${r.summary}\n${r.kpis.map((k) => `${k.l} : ${k.v} ${k.u}`).join(" ; ")}\nConstats : ${r.findings.slice(0, 4).map((f) => f.t).join(" | ")}`; }).join("\n\n");
    const plan = X.planItems().slice(0, 8).map((a) => `- ${a.text} (impact ${a.impact}, statut ${a.status})`).join("\n");
    const dl = X.TIMELINE.filter((e) => e.d >= X.today() && e.ap(X.profile())).slice(0, 5).map((e) => `- ${e.d} : ${e.t}`).join("\n");
    return `Tu es l'assistant RSE de l'outil Sillon. Tu réponds en 150 mots maximum, concrètement, en t'appuyant uniquement sur les données ci-dessous et sur des faits généraux sûrs. Si une information manque, dis-le et indique quel copilote remplir. Pas de conseil juridique définitif.\n\n${V().profileText()}\n\nCopilotes remplis :\n${parts || "aucun pour l'instant"}\n\nPlan d'action :\n${plan || "vide"}\n\nÉchéances à venir :\n${dl || "aucune"}`;
  }
  function chatRender() {
    const box = document.getElementById("chatLog"); if (!box) return;
    const st = S();
    box.innerHTML = `<div class="msg bot">${esc(t("chat_hello"))}</div>` + st.chat.map((m) => `<div class="msg ${m.role === "user" ? "me" : "bot"}">${m.role === "user" ? esc(m.content) : V().md(m.content)}</div>`).join("");
    box.scrollTop = box.scrollHeight;
  }
  function chatToggle(open) {
    const p = document.getElementById("chat"), b = document.getElementById("chatFab");
    const isOpen = open ?? p.hidden;
    p.hidden = !isOpen; b.setAttribute("aria-expanded", isOpen);
    if (isOpen) { chatRender(); document.getElementById("chatIn").focus(); } else b.focus();
  }
  function chatInit() {
    const wrap = document.getElementById("chatWrap");
    wrap.innerHTML = `<button class="fab" id="chatFab" type="button" aria-expanded="false" aria-controls="chat">${V().icon("chat")}<span>${esc(t("nav_assistant"))}</span></button>
      <section class="chat panel" id="chat" hidden aria-labelledby="chatH">
        <div class="chat-head"><h2 id="chatH">${esc(t("chat_title"))}</h2><button class="chip-btn" type="button" id="chatX">${esc(t("chat_close"))}</button></div>
        <div class="chat-log" id="chatLog" aria-live="polite"></div>
        <p class="ai-note" id="chatOff"${X.aiAvailable() ? " hidden" : ""}>${esc(t("ai_off"))}</p>
        ${S().contact || X.inClaude ? "" : `<p class="ai-note gate">${esc(t("gate_short"))}</p>`}
        <form class="chat-in" id="chatF"><label class="sr" for="chatIn">${esc(t("chat_ph"))}</label><input id="chatIn" placeholder="${esc(t("chat_ph"))}" autocomplete="off"><button class="chip-btn primary" type="submit">${esc(t("chat_send"))}</button></form>
      </section>`;
    document.getElementById("chatFab").onclick = () => chatToggle();
    document.getElementById("chatX").onclick = () => chatToggle(false);
    document.getElementById("chat").addEventListener("keydown", (e) => { if (e.key === "Escape") chatToggle(false); else trapTab(e, document.getElementById("chat")); });
    document.getElementById("chatF").onsubmit = async (e) => {
      e.preventDefault();
      const inp = document.getElementById("chatIn"), q = inp.value.trim(); if (!q || !X.aiAvailable()) return;
      if (!(await ensureContact())) return;
      const st = S(); st.chat.push({ role: "user", content: q }); inp.value = ""; chatRender();
      const log = document.getElementById("chatLog"), bub = document.createElement("div"); bub.className = "msg bot"; bub.innerHTML = `<span class="thinking"><i></i><i></i><i></i></span>`; log.appendChild(bub); log.scrollTop = log.scrollHeight;
      chatCtl = new AbortController();
      try {
        const turns = st.chat.slice(-12);
        const text = await X.ask([{ role: "user", content: context() }, ...turns], { kind: "chat", signal: chatCtl.signal, onText: ({ text }) => { bub.innerHTML = V().md(text); log.scrollTop = log.scrollHeight; } });
        st.chat.push({ role: "assistant", content: text }); if (st.chat.length > 30) st.chat.splice(0, st.chat.length - 30); X.save(); chatRender();
      } catch (err) { bub.innerHTML = `<span class="ai-note">${esc(X.aiError(err))}</span>`; st.chat.pop(); X.save(); }
    };
  }

  /* ---------- présentation ---------- */
  function presentation() {
    const st = S(), p = X.profile(), loc = st.lang === "en" ? "en-GB" : "fr-FR";
    const used = copilots.filter((c) => st.used[c.id]), list = used.length ? used : copilots.slice(0, 6);
    const res = list.map((c) => ({ c, r: X.result(c) }));
    const prio = res.flatMap(({ c, r }) => r.findings.filter((f) => f.lvl === "crit").map((f) => ({ c, f }))).slice(0, 6);
    const plan = X.planItems().filter((a) => a.status !== "done").slice(0, 6);
    const dl = X.TIMELINE.filter((e) => e.d >= X.today() && e.ap(p)).slice(0, 5);
    const slides = [
      `<div class="sl cover"><div class="eyebrow">Sillon · ${new Date().toLocaleDateString(loc, { month: "long", year: "numeric" })}</div><h1>${esc(p.nom || (st.lang === "en" ? "Our CSR roadmap" : "Notre démarche RSE"))}</h1><p>${esc(`${p.secteur} · ${nf(X.num(p.eff))} ${st.lang === "en" ? "employees" : "salariés"} · ${nf(X.num(p.ca))} M€`)}</p>${used.length ? "" : `<p class="ex-flag">${esc(t("example"))}</p>`}</div>`,
      `<div class="sl"><h2>${esc(t("pres_scores"))}</h2><div class="sl-grid">${res.map(({ c, r }) => `<div class="sl-card">${r.gauge ? V().gaugeSvg(r.gauge) : ""}<b>${esc(cpT(c).title)}</b><span>${esc(r.verdict)}</span></div>`).join("")}</div></div>`,
      `<div class="sl"><h2>${esc(t("pres_prio"))}</h2><ol class="sl-list">${prio.map(({ c, f }) => `<li><span class="pill crit">${esc(cpT(c).title)}</span>${esc(f.t)}</li>`).join("") || "<li>—</li>"}</ol></div>`,
      `<div class="sl"><h2>${esc(t("pres_plan"))}</h2><ol class="sl-list">${plan.map((a) => `<li><span class="pill ${a.impact === "high" ? "crit" : a.impact === "mid" ? "warn" : "info"}">${esc(t(a.impact))}</span>${esc(a.text)}${a.owner ? ` · <i>${esc(a.owner)}</i>` : ""}${a.due ? ` · ${esc(a.due)}` : ""}</li>`).join("") || `<li>${esc(t("plan_empty"))}</li>`}</ol></div>`,
      `<div class="sl"><h2>${esc(t("pres_dead"))}</h2><ol class="sl-list">${dl.map((e) => `<li><span class="pill info">${new Date(e.d).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" })}</span>${esc(e.t)}</li>`).join("") || "<li>—</li>"}</ol></div>`,
      `<div class="sl"><h2>${esc(t("pres_thanks"))}</h2><p>${esc(t("foot2"))}</p><p class="mono">ADEME · EFRAG VSME · EcoVadis · Directive Omnibus I · Directive EmpCo · Code de la commande publique · Légifrance</p></div>`,
    ];
    let i = 0;
    const ov = document.createElement("div");
    ov.className = "pres"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", t("nav_present"));
    ov.innerHTML = `<div class="pres-stage" id="stage" aria-live="polite"></div><div class="pres-bar"><button class="chip-btn" type="button" data-p="-1">← ${esc(t("pres_prev"))}</button><span class="mono" id="pn"></span><button class="chip-btn" type="button" data-p="1">${esc(t("pres_next"))} →</button><button class="chip-btn" type="button" data-full>${esc(t("pres_full"))}</button><button class="chip-btn primary" type="button" data-exit>${esc(t("pres_exit"))}</button></div>`;
    document.body.appendChild(ov);
    const show = () => { ov.querySelector("#stage").innerHTML = slides[i]; ov.querySelector("#pn").textContent = `${i + 1} / ${slides.length}`; };
    const go = (d) => { i = Math.max(0, Math.min(slides.length - 1, i + d)); show(); };
    const exit = () => { try { document.fullscreenElement && document.exitFullscreen(); } catch (e) {} ov.remove(); document.removeEventListener("keydown", key); history.replaceState(null, "", "#rapport"); window.SXR.route(); };
    const key = (e) => { if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(1); } else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1); else if (e.key === "Escape") exit(); else trapTab(e, ov); };
    document.addEventListener("keydown", key);
    ov.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => go(+b.dataset.p)));
    ov.querySelector("[data-exit]").onclick = exit;
    ov.querySelector("[data-full]").onclick = () => { try { ov.requestFullscreen && ov.requestFullscreen().catch(() => {}); } catch (e) {} };
    let x0 = null; ov.addEventListener("pointerdown", (e) => (x0 = e.clientX)); ov.addEventListener("pointerup", (e) => { if (x0 != null && Math.abs(e.clientX - x0) > 60) go(e.clientX < x0 ? 1 : -1); x0 = null; });
    show(); ov.querySelector("[data-p='1']").focus();
  }

  window.SXC = { importDoc, contactDialog, ensureContact, accompanyDialog, chatInit, chatRender, presentation, modal, trapTab };
})();
