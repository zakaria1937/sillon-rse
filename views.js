/* Sillon — vues : en-tête, accueil, copilotes, profil, plan, veille, méthode, rapport. */
(function () {
  const X = window.SX;
  const { copilots, byId, nf, num, esc, t, cpT, famT } = X;
  const S = () => X.state();
  const app = document.getElementById("app");
  const families = window.SILLON.families;

  /* ---------- icônes ---------- */
  const IC = {
    leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l8-8"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    scale: '<path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 006 0zM17 7l-3 7a3 3 0 006 0z"/>',
    medal: '<circle cx="12" cy="14" r="5"/><path d="M8 3l4 6 4-6"/>',
    clip: '<path d="M8 4h8v3H8zM6 5H4v16h16V5h-2M8 13l3 3 5-6"/>',
    bank: '<path d="M3 9l9-5 9 5M5 9v9M10 9v9M14 9v9M19 9v9M3 20h18"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    up: '<path d="M4 16v4h16v-4M12 4v11M7 9l5-5 5 5"/>',
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || ""}</svg>`;

  /* ---------- en-tête ---------- */
  function header() {
    const st = S(), n = copilots.filter((c) => st.used[c.id]).length;
    const h = location.hash.slice(1) || "accueil";
    const L = [["accueil", "nav_dash"], ["profil", "nav_profile"], ["plan", "nav_plan"], ["veille", "nav_watch"], ["methode", "nav_method"], ["rapport", "nav_report"]];
    document.getElementById("hdr").innerHTML = `
      <a class="skip" href="#main" data-skip>${esc(t("skip"))}</a>
      <div class="wrap top">
        <a class="logo" href="#accueil" aria-label="Sillon"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)"/><path d="M6 21c4-3 6-3 10 0s6 3 10 0M6 15c4-3 6-3 10 0s6 3 10 0M6 9c4-3 6-3 10 0s6 3 10 0" stroke="var(--accent-ink)" stroke-width="2" stroke-linecap="round"/></svg>Sillon</a>
        <span class="eyebrow used-lbl">${esc(t("used", { n, t: copilots.length }))}</span>
        <span class="progress-dots" aria-hidden="true">${copilots.map((c) => `<i class="${st.used[c.id] ? "on" : ""}"></i>`).join("")}</span>
        <div class="top-actions">
          <button class="chip-btn" type="button" id="langBtn" aria-label="Langue / Language">${st.lang === "fr" ? "EN" : "FR"}</button>
          <a class="chip-btn primary" href="#presentation">${esc(t("nav_present"))}</a>
        </div>
      </div>
      <nav class="wrap subnav" aria-label="Navigation">${L.map(([k, lab]) => `<a href="#${k}"${h === k ? ' aria-current="page"' : ""}>${esc(t(lab))}</a>`).join("")}</nav>`;
    document.getElementById("langBtn").onclick = () => { S().lang = S().lang === "fr" ? "en" : "fr"; X.save(); window.SXR.route(); };
    document.documentElement.lang = st.lang;
    document.getElementById("foot").innerHTML = `<div class="wrap"><div><b>Sillon</b> · ${esc(t("foot1"))}</div><div>${esc(t("foot2"))}</div><div class="foot-links"><a href="#methode">${esc(t("nav_method"))}</a><a href="#confidentialite">${esc(t("nav_privacy"))}</a><a href="#mentions">${esc(t("nav_legal"))}</a><button type="button" class="linkish" data-accomp>${esc(t("acc_cta"))}</button></div></div>`;
  }

  /* ---------- petits graphiques ---------- */
  function spark(h, w = 120, hgt = 30) {
    if (!h || h.length < 2) return "";
    const vs = h.map((x) => x.v), mn = Math.min(...vs), mx = Math.max(...vs), rg = mx - mn || 1;
    const P = vs.map((v, i) => [4 + (i * (w - 8)) / (vs.length - 1), hgt - 4 - ((v - mn) / rg) * (hgt - 8)]);
    const line = P.map((p) => p.join(",")).join(" "), last = P[P.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${hgt}" width="${w}" height="${hgt}" role="img" aria-label="${esc(t("hist"))} ${vs[0]} → ${vs[vs.length - 1]}"><polygon points="${P[0][0]},${hgt} ${line} ${last[0]},${hgt}" fill="var(--accent)" fill-opacity=".12"/><polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="1.6"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="var(--accent)"/></svg>`;
  }
  function gaugeSvg(g, delta) {
    const r = 54, C = 2 * Math.PI * r, p = Math.max(0, Math.min(1, g.val / g.max));
    const col = g.raw ? "var(--accent)" : p >= 0.7 ? "var(--ok)" : p >= 0.45 ? "var(--warn)" : "var(--crit)";
    const shown = g.show || (g.raw ? g.val : Math.round(g.val));
    return `<div class="gauge"><svg viewBox="0 0 128 128" role="img" aria-label="${esc(g.label)} ${esc(shown)}"><circle cx="64" cy="64" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="10"/><circle cx="64" cy="64" r="${r}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 64 64)" style="transition:stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)"/></svg><div class="n"><div style="font-size:${String(shown).length > 5 ? 19 : 34}px">${esc(shown)}<small>${esc(g.label)}</small>${delta ? `<span class="delta ${delta > 0 ? "up" : "down"}">${delta > 0 ? "+" : ""}${nf(delta)}</span>` : ""}</div></div></div>`;
  }
  function chartSvg(ch) {
    if (!ch) return "";
    if (ch.type === "highlight") return `<div class="marked">${ch.html}</div>`;
    if (ch.type === "bars") {
      const W = 520, L = 150, rh = 30, H = ch.items.length * rh + 8;
      const mx = Math.max(1e-9, ...ch.items.map((i) => Math.max(i.v, i.max || 0)));
      const rows = ch.items.map((it, k) => {
        const y = k * rh + 6, w = ((W - L - 70) * it.v) / mx, tw = it.max ? ((W - L - 70) * it.max) / mx : 0;
        const val = it.v >= 100 ? nf(it.v) : nf(it.v, it.v < 10 && it.v % 1 ? 1 : 0);
        return `<text x="${L - 8}" y="${y + 15}" text-anchor="end" font-size="12" fill="var(--muted)">${esc(it.l)}</text>${tw ? `<rect x="${L}" y="${y + 3}" width="${tw}" height="16" rx="3" fill="var(--surface-2)"/>` : ""}<rect x="${L}" y="${y + 3}" width="${Math.max(1.5, w)}" height="16" rx="3" fill="${it.hot ? "var(--soil)" : "var(--accent)"}"/><text x="${L + Math.max(1.5, w, tw) + 6}" y="${y + 15}" font-size="11.5" font-family="IBM Plex Mono, monospace" fill="var(--fg)">${val}</text>`;
      }).join("");
      return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ch.unit)}">${rows}</svg><div class="eyebrow" style="text-align:right">${esc(ch.unit)}</div></div>`;
    }
    if (ch.type === "radar") {
      const W = 440, H = 320, cx = W / 2, cy = 160, R = 108, n = ch.axes.length;
      const pt = (i, val) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + (Math.cos(a) * R * val) / 100, cy + (Math.sin(a) * R * val) / 100]; };
      const ring = (val) => ch.axes.map((_, i) => pt(i, val).join(",")).join(" ");
      const rings = ch.rings.map(([val, l]) => `<polygon points="${ring(val)}" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/><text x="${cx + 4}" y="${cy - (R * val) / 100 - 3}" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${esc(l)}</text>`).join("");
      const axes = ch.axes.map((a, i) => { const [x, y] = pt(i, 100), [lx, ly] = pt(i, 120); const anc = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end"; return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/><text x="${lx}" y="${ly + 4}" font-size="11.5" text-anchor="${anc}" fill="var(--fg)">${esc(a)} · ${ch.values[i]}</text>`; }).join("");
      const poly = ch.values.map((val, i) => pt(i, val).join(",")).join(" ");
      return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Radar">${rings}${axes}<polygon points="${ring(100)}" fill="none" stroke="var(--line)"/><polygon points="${poly}" fill="var(--accent)" fill-opacity=".22" stroke="var(--accent)" stroke-width="2"/>${ch.values.map((val, i) => { const [x, y] = pt(i, val); return `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--accent)"/>`; }).join("")}</svg></div>`;
    }
    if (ch.type === "matrix") {
      const W = 520, H = 280, L = 44, B = 36, T = 12, Rr = 16;
      const ym = Math.max(30, ...ch.points.map((p) => p.y)) * 1.1;
      const Xf = (x) => L + ((W - L - Rr) * x) / 100, Y = (y) => H - B - ((H - B - T) * y) / ym;
      const grid = [0, 25, 50, 75, 100].map((x) => `<line x1="${Xf(x)}" y1="${T}" x2="${Xf(x)}" y2="${H - B}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="${Xf(x)}" y="${H - B + 14}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${x}</text>`).join("");
      const yt = [0, ym / 2, ym].map((y) => `<text x="${L - 6}" y="${Y(y) + 3}" text-anchor="end" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${nf(y)}%</text>`).join("");
      const zone = `<rect x="${Xf(50)}" y="${T}" width="${Xf(100) - Xf(50)}" height="${Y(ym / 2) - T}" fill="var(--crit)" fill-opacity=".07"/><text x="${Xf(100) - 4}" y="${T + 12}" text-anchor="end" font-size="10" fill="var(--crit)">Priorité</text>`;
      const pts = ch.points.map((p) => `<circle cx="${Xf(p.x)}" cy="${Y(p.y)}" r="7" fill="${p.x >= 50 ? "var(--crit)" : p.x >= 25 ? "var(--warn)" : "var(--ok)"}" fill-opacity=".85"/><text x="${Xf(p.x) + (p.x > 70 ? -10 : 10)}" y="${Y(p.y) + 4}" text-anchor="${p.x > 70 ? "end" : "start"}" font-size="10.5" fill="var(--fg)">${esc(p.l.slice(0, 22))}</text>`).join("");
      return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Matrice">${zone}${grid}${yt}<line x1="${L}" y1="${H - B}" x2="${W - Rr}" y2="${H - B}" stroke="var(--muted)"/>${pts}<text x="${(W + L) / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(ch.xl)} (0–100) →</text><text transform="translate(11 ${(H - B) / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(ch.yl)}</text></svg></div>`;
    }
    return "";
  }

  /* ---------- accueil ---------- */
  function home() {
    const st = S(), used = copilots.filter((c) => st.used[c.id]), p = st.profile;
    const open = X.planItems().filter((a) => a.status !== "done").length;
    const nextDl = X.TIMELINE.filter((e) => e.d >= X.today() && e.ap(X.profile()))[0];
    const dash = `
      <section class="dash" aria-labelledby="dashT">
        <div class="fam-head"><h2 id="dashT">${esc(t("dash_title"))}</h2></div>
        <div class="dash-row">
          <a class="dcell" href="#profil"><span class="l">${esc(t("dash_prof"))}</span><b>${esc(p && p.nom ? p.nom : t("dash_prof_none"))}</b><span class="s">${p ? `${nf(num(p.eff))} sal. · ${nf(num(p.ca))} M€` : ""}</span></a>
          <a class="dcell" href="#rapport"><span class="l">${esc(t("nav_report"))}</span><b>${used.length}/${copilots.length}</b><span class="s">${esc(t("used", { n: used.length, t: copilots.length }))}</span></a>
          <a class="dcell" href="#plan"><span class="l">${esc(t("nav_plan"))}</span><b>${open}</b><span class="s">${esc(t("dash_actions"))}</span></a>
          <a class="dcell" href="#veille"><span class="l">${esc(t("dash_deadline"))}</span><b>${nextDl ? new Date(nextDl.d).toLocaleDateString(st.lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "–"}</b><span class="s">${nextDl ? esc(nextDl.t) : ""}</span></a>
        </div>
        ${used.length ? `<div class="spark-list">${used.map((c) => { const r = X.result(c); return `<a href="#${c.id}" class="spark-item"><span>${esc(cpT(c).title)}</span><b class="mono">${r.gauge ? esc(r.gauge.show || r.gauge.val) : "–"}</b>${spark(st.hist[c.id]) || '<span class="s">—</span>'}</a>`; }).join("")}</div>` : `<p class="muted">${esc(t("dash_empty"))}</p>`}
      </section>`;
    const fams = families.map((f) => { const ft = famT(f); return `
      <section class="fam" aria-labelledby="fam-${f.id}">
        <div class="fam-head"><h2 id="fam-${f.id}">${esc(ft.title)}</h2><p>${esc(ft.sub)}</p></div>
        <div class="grid4">${copilots.filter((c) => c.fam === f.id).map(card).join("")}</div>
      </section>`; }).join("");
    app.innerHTML = `
      <section class="hero" aria-label="Sillon">
        <canvas id="field" aria-hidden="true"></canvas>
        <div class="wrap">
          <div>
            <div class="eyebrow">${esc(t("hero_eyebrow"))}</div>
            <h1 id="pageH" tabindex="-1" style="margin-top:14px">${esc(t("hero_h1a"))} <em>${esc(t("hero_h1b"))}</em></h1>
            <p class="lead">${esc(t("hero_lead"))}</p>
            <div class="hero-cta"><a class="chip-btn primary" href="#profil">${esc(t("hero_cta1"))}</a><a class="chip-btn" href="#reglementation">${esc(t("hero_cta2"))}</a></div>
          </div>
          <div class="ledger">
            <div><span>${esc(t("led_cp"))}</span><b>${copilots.length}</b></div>
            <div><span>${esc(t("led_txt"))}</span><b>${X.TIMELINE.length + 3}</b></div>
            <div><span>${esc(t("led_src"))}</span><b>${Object.keys(window.SILLON.sources).length}</b></div>
            <div><span>${esc(t("led_calc"))}</span><b>${esc(t("led_calc_v"))}</b></div>
            <div><span>${esc(t("led_out"))}</span><b>${esc(t("led_out_v"))}</b></div>
          </div>
        </div>
      </section>
      <div class="wrap section">
        ${t("en_note") ? `<p class="note">${esc(t("en_note"))}</p>` : ""}
        ${dash}
        ${fams}
        <div class="method">
          <div><h3>${esc(t("m1h"))}</h3><p>${esc(t("m1p"))}</p></div>
          <div><h3>${esc(t("m2h"))}</h3><p>${esc(t("m2p"))}</p></div>
          <div><h3>${esc(t("m3h"))}</h3><p>${esc(t("m3p"))}</p></div>
        </div>
      </div>`;
    window.SXS.start();
    if (!X.reduce && matchMedia("(hover:hover)").matches) app.querySelectorAll(".card").forEach(tilt);
  }
  function card(c) {
    const done = S().used[c.id], ct = cpT(c);
    return `<a class="card" href="#${c.id}"><div class="ico">${icon(c.icon)}</div><h3>${esc(ct.title)}</h3><p>${esc(ct.short)}</p><div class="calc">${esc(c.calc)}</div><div class="foot"><span class="state ${done ? "done" : ""}">${esc(done ? t("st_used") : t("st_new"))}</span><span>${esc(t("open"))}</span></div></a>`;
  }
  function tilt(el) {
    el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; el.style.transform = `perspective(700px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-2px)`; });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  }

  /* ---------- formulaire d'un copilote ---------- */
  function fieldHtml(cp, f, v, applied) {
    const show = f.showIf ? Object.entries(f.showIf).every(([k, x]) => v[k] === x) : true;
    const attrs = f.showIf ? ` data-showif='${esc(JSON.stringify(f.showIf))}'${show ? "" : " hidden"}` : "";
    const id = `${cp.id}-${f.id}`;
    const pb = f.prof && S().profile && !(S().touched[cp.id] || {})[f.id] ? `<span class="tag-link">${esc(t("linked", { cp: t("nav_profile") }))}</span>` : "";
    if (f.type === "group") return `<div class="fgroup eyebrow">${esc(f.label)}</div>`;
    if (f.type === "number") return `<div class="field"${attrs}><label for="${id}">${esc(f.label)} ${pb}</label><div class="inp"><input id="${id}" data-f="${f.id}" type="number" inputmode="decimal" value="${esc(v[f.id])}" ${f.min != null ? `min="${f.min}"` : ""} ${f.max != null ? `max="${f.max}"` : ""} step="${f.step || "any"}"><span class="u">${esc(f.unit || "")}</span></div>${f.help ? `<div class="help">${esc(f.help)}</div>` : ""}</div>`;
    if (f.type === "select") return `<div class="field wide"${attrs}><label for="${id}">${esc(f.label)} ${pb}</label><div class="inp"><select id="${id}" data-f="${f.id}">${f.options.map(([k, l]) => `<option value="${esc(k)}"${String(v[f.id]) === String(k) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div></div>`;
    if (f.type === "range") return `<div class="field"${attrs}><label for="${id}">${esc(f.label)} <span class="mono" data-out="${f.id}">${esc(v[f.id])} ${esc(f.unit || "")}</span></label><input id="${id}" data-f="${f.id}" type="range" min="${f.min}" max="${f.max}" step="${f.step || 1}" value="${esc(v[f.id])}">${f.help ? `<div class="help">${esc(f.help)}</div>` : ""}</div>`;
    if (f.type === "seg") return `<div class="field wide"${attrs}><span class="lbl" id="${id}">${esc(f.label)} ${pb}</span><div class="seg" role="group" aria-labelledby="${id}">${f.options.map(([k, l]) => `<button type="button" data-seg="${f.id}" data-v="${esc(k)}" aria-pressed="${v[f.id] === k}">${esc(l)}</button>`).join("")}</div></div>`;
    if (f.type === "textarea") return `<div class="field wide"${attrs}><label for="${id}">${esc(f.label)}</label><textarea class="ta" id="${id}" data-f="${f.id}" rows="${f.rows || 4}">${esc(v[f.id])}</textarea>${f.help ? `<div class="help">${esc(f.help)}</div>` : ""}</div>`;
    if (f.type === "checklist") return `<fieldset class="field wide cl"${attrs}><legend class="eyebrow">${esc(f.label)}</legend>${f.items.map((it) => { const src = applied[f.id + "." + it.id]; return `
      <div class="check"><div class="t">${it.code ? `<span class="code">${esc(it.code)}</span>` : ""}${esc(it.label)}${src ? ` <span class="tag-link">${esc(t("linked", { cp: cpT(byId[src]).title }))}</span>` : ""}${it.hint ? `<small>${esc(it.hint)}</small>` : ""}</div>
      <div class="seg" role="group" aria-label="${esc(it.label)}">${f.states.map(([k, l]) => `<button type="button" data-ck="${f.id}" data-item="${esc(it.id)}" data-v="${esc(k)}" aria-pressed="${String((v[f.id] || {})[it.id]) === String(k)}">${esc(l)}</button>`).join("")}</div></div>`; }).join("")}</fieldset>`;
    if (f.type === "table") return `<div class="field wide"${attrs}><div class="eyebrow" style="margin-bottom:6px">${esc(f.label)}</div><div class="tbl-wrap"><table class="ed"><thead><tr>${f.columns.map((c) => `<th scope="col">${esc(c.label)}</th>`).join("")}<th><span class="sr">Supprimer</span></th></tr></thead><tbody>${(v[f.id] || []).map((r, i) => `<tr>${f.columns.map((c) => `<td>${c.type === "select" ? `<select aria-label="${esc(c.label)}" data-tbl="${f.id}" data-row="${i}" data-col="${c.id}">${c.options.map(([k, l]) => `<option value="${esc(k)}"${r[c.id] === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>` : `<input aria-label="${esc(c.label)}" data-tbl="${f.id}" data-row="${i}" data-col="${c.id}" type="${c.type === "number" ? "number" : "text"}" value="${esc(r[c.id])}">`}</td>`).join("")}<td><button class="rm" type="button" data-rm="${f.id}" data-row="${i}" aria-label="Supprimer la ligne ${i + 1}">×</button></td></tr>`).join("")}</tbody></table></div><button class="chip-btn add" type="button" data-add="${f.id}">+ Ajouter un fournisseur</button></div>`;
    return "";
  }

  let current = null, aiCtl = null;
  function view(cp) {
    current = cp;
    const { v, applied } = X.resolved(cp), ct = cpT(cp), st = S();
    const fam = famT(families.find((f) => f.id === cp.fam));
    app.innerHTML = `
      <div class="wrap">
        <div class="cp-head">
          <a class="back" href="#accueil">${esc(t("back"))}</a>
          <div class="eyebrow">${esc(fam.title)} · ${esc(cp.calc)}</div>
          <h1 id="pageH" tabindex="-1">${esc(ct.title)}</h1>
          <p>${esc(ct.intro)}</p>
        </div>
        <div class="cp-body">
          <form class="panel" id="form" autocomplete="off" aria-labelledby="ansH">
            <h2 id="ansH">${esc(t("answers"))} <span class="ex-flag" id="exFlag"${st.used[cp.id] ? " hidden" : ""}>${esc(t("example_flag"))}</span></h2>
            <p class="sub">${esc(t("answers_sub"))}</p>
            <div class="import" data-needs-ai${X.aiAvailable() ? "" : " hidden"}>
              <label class="chip-btn" for="docIn">${icon("up")} ${esc(t("import"))}</label>
              <input type="file" id="docIn" accept=".pdf,.txt,.csv,.md,image/png,image/jpeg,image/webp" class="sr">
              <span class="help">${esc(t("import_hint"))}</span>
              <span id="importStatus" class="help" aria-live="polite"></span>
            </div>
            <div class="fgrid">${cp.fields.map((f) => fieldHtml(cp, f, v, applied)).join("")}</div>
            <div class="toolbar"><button class="chip-btn" type="button" id="reset">${esc(t("reset"))}</button>${cp.fields.some((f) => f.prof) && st.profile ? `<button class="chip-btn" type="button" id="syncProf">${esc(t("sync"))}</button>` : ""}</div>
          </form>
          <div class="panel sticky res" id="res" aria-live="polite" aria-atomic="false"></div>
        </div>
      </div>`;
    renderRes();
    document.getElementById("docIn").onchange = (e) => window.SXC.importDoc(cp, e.target.files[0]);
  }

  const parseNum = (s) => { const n = parseFloat(String(s).replace(/[\s  ]/g, "").replace(",", ".")); return isFinite(n) ? n : null; };
  const pillTag = () => ({ ok: "OK", warn: S().lang === "en" ? "Watch" : "Attention", crit: S().lang === "en" ? "Priority" : "Priorité", info: "Info" });
  function renderRes() {
    const cp = current, st = S(), r = X.result(cp), ai = st.ai[cp.id], base = st.base[cp.id];
    const dG = base && r.gauge && base.g != null ? r.gauge.val - base.g : 0;
    const box = document.getElementById("res"); if (!box) return;
    box.innerHTML = `
      <h2>${esc(t("results"))} ${st.used[cp.id] ? "" : `<span class="ex-flag">${esc(t("example"))}</span>`}</h2>
      <p class="sub">${esc(t("recalc"))}${base ? ` · ${esc(t("vs_ref"))} (${esc(base.d)})` : ""}</p>
      <div class="score-row">${r.gauge ? gaugeSvg(r.gauge, dG) : ""}<div class="verdict"><h3>${esc(r.verdict)}</h3><p>${esc(r.summary)}</p>${base && base.verdict !== r.verdict ? `<p class="was">${esc(base.verdict)} → <b>${esc(r.verdict)}</b></p>` : ""}${spark(st.hist[cp.id], 160, 34) ? `<div class="hist"><span class="eyebrow">${esc(t("hist"))}</span>${spark(st.hist[cp.id], 160, 34)}</div>` : ""}</div></div>
      ${r.kpis.length ? `<div class="kpis">${r.kpis.map((k, i) => { const b = base && base.k[i] != null && parseNum(k.v) != null ? parseNum(k.v) - base.k[i] : null; return `<div class="kpi"><div class="l">${esc(k.l)}</div><div class="v">${esc(k.v)}<span class="u">${esc(k.u)}</span></div><div class="s">${esc(k.s)}</div>${b ? `<div class="kd ${b > 0 ? "up" : "down"}">${b > 0 ? "+" : ""}${nf(b, Math.abs(b) < 10 && b % 1 ? 1 : 0)} ${esc(t("vs_ref"))}</div>` : ""}</div>`; }).join("")}</div>` : ""}
      ${chartSvg(r.chart)}
      <h4>${esc(t("findings"))}</h4>
      <ul class="findings">${r.findings.map((f) => `<li><span class="pill ${f.lvl}">${esc(f.tag || pillTag()[f.lvl])}</span><span>${esc(f.t)}</span></li>`).join("")}</ul>
      <h4>${esc(t("actions"))}</h4>
      <ol class="actions">${r.actions.map((a) => `<li>${esc(a)}</li>`).join("")}</ol>
      <div class="ai" id="aiBox">
        <div class="ai-head"><h4>${esc(t("ai_title"))}</h4>
          <button class="chip-btn primary" type="button" id="aiGo" data-needs-ai${X.aiAvailable() ? "" : " hidden"}>${esc(ai ? t("ai_regen") : cp.id === "objections" ? t("ai_obj") : t("ai_go"))}</button>
          <button class="chip-btn" type="button" id="aiStop" hidden>${esc(t("ai_stop"))}</button>
        </div>
        <div class="ai-out" id="aiOut">${ai ? md(ai) : `<p class="ai-note" style="margin:0">${esc(t("ai_intro"))}</p>`}</div>
        <p class="ai-note" data-needs-ai-off${X.aiAvailable() ? " hidden" : ""}>${esc(t("ai_off"))}</p>
      </div>
      <div class="toolbar">
        <button class="chip-btn primary" type="button" id="pdfOne">${esc(t("pdf"))}</button>
        <button class="chip-btn" type="button" id="xlsOne">${esc(t("xlsx"))}</button>
        <button class="chip-btn" type="button" id="baseBtn">${esc(base ? t("baseline_clear") : t("baseline"))}</button>
        <a class="chip-btn" href="#rapport">${esc(t("to_report"))}</a>
        <button class="chip-btn" type="button" data-accomp>${esc(t("acc_cta"))}</button>
      </div>
      ${r.hyp ? `<p class="ai-note"><b>${esc(t("method"))}</b> ${esc(r.hyp)}</p>` : ""}
      <div class="sources"><b>${esc(t("sources"))}</b>${r.sources.map((s) => `<span>${esc(s.t)} · <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(t("link"))}</a></span>`).join("")}</div>`;
    document.getElementById("aiGo").onclick = runAI;
    document.getElementById("aiStop").onclick = () => aiCtl && aiCtl.abort();
    document.getElementById("pdfOne").onclick = () => window.SXE.pdf([cp.id]);
    document.getElementById("xlsOne").onclick = () => window.SXE.xlsx([cp.id]);
    document.getElementById("baseBtn").onclick = () => {
      if (st.base[cp.id]) delete st.base[cp.id];
      else st.base[cp.id] = { d: X.today(), g: r.gauge ? r.gauge.val : null, verdict: r.verdict, k: r.kpis.map((k) => parseNum(k.v)) };
      X.save(); renderRes();
    };
  }

  function markUsed(key) {
    const st = S();
    if (key) (st.touched[current.id] ||= {})[key] = true;
    if (!st.used[current.id]) { st.used[current.id] = true; header(); const f = document.getElementById("exFlag"); if (f) f.hidden = true; }
    X.record(current); X.save();
  }
  let rT;
  const recompute = () => { clearTimeout(rT); rT = setTimeout(renderRes, 90); };

  app.addEventListener("input", (e) => {
    if (!current) return;
    const tg = e.target, v = X.inputs(current);
    if (tg.dataset.f) {
      v[tg.dataset.f] = tg.value;
      const o = app.querySelector(`[data-out="${tg.dataset.f}"]`); if (o) { const f = current.fields.find((x) => x.id === tg.dataset.f); o.textContent = `${tg.value} ${f.unit || ""}`; }
      markUsed(tg.dataset.f);
    } else if (tg.dataset.tbl) { v[tg.dataset.tbl][+tg.dataset.row][tg.dataset.col] = tg.value; markUsed(tg.dataset.tbl); }
    else return;
    recompute();
  });
  app.addEventListener("change", (e) => {
    if (!current || e.target.tagName !== "SELECT") return;
    const tg = e.target, v = X.inputs(current);
    if (tg.dataset.f) { v[tg.dataset.f] = tg.value; markUsed(tg.dataset.f); }
    else if (tg.dataset.tbl) { v[tg.dataset.tbl][+tg.dataset.row][tg.dataset.col] = tg.value; markUsed(tg.dataset.tbl); }
    recompute();
  });
  app.addEventListener("submit", (e) => e.preventDefault());
  app.addEventListener("click", (e) => {
    if (!current) return;
    const b = e.target.closest("button"); if (!b || !app.contains(b)) return;
    const v = X.inputs(current), st = S();
    if (b.dataset.seg) {
      v[b.dataset.seg] = b.dataset.v;
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      app.querySelectorAll("[data-showif]").forEach((el) => { const c = JSON.parse(el.dataset.showif); el.hidden = !Object.entries(c).every(([k, x]) => v[k] === x); });
      markUsed(b.dataset.seg);
    } else if (b.dataset.ck) {
      (v[b.dataset.ck] ||= {})[b.dataset.item] = b.dataset.v;
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      markUsed(b.dataset.ck + "." + b.dataset.item);
    } else if (b.dataset.add) { v[b.dataset.add].push({ nom: "", zone: "fr", cat: "mob", dep: 10000, cert: "none" }); markUsed(b.dataset.add); rerenderForm(); return; }
    else if (b.dataset.rm) { v[b.dataset.rm].splice(+b.dataset.row, 1); markUsed(b.dataset.rm); rerenderForm(); return; }
    else if (b.id === "reset") { delete st.inputs[current.id]; delete st.used[current.id]; delete st.ai[current.id]; delete st.touched[current.id]; delete st.base[current.id]; X.save(); header(); view(current); return; }
    else if (b.id === "syncProf") { const tch = st.touched[current.id] || {}; current.fields.forEach((f) => f.prof && delete tch[f.id]); X.applyProfile(); view(current); return; }
    else return;
    recompute();
  });
  function rerenderForm() { const y = scrollY; view(current); scrollTo(0, y); }

  /* ---------- analyse Claude ---------- */
  function md(text) {
    const lines = esc(text).split("\n"); let out = "", inList = false;
    const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    lines.forEach((l) => {
      const li = l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
      if (li) { if (!inList) { out += "<ul>"; inList = true; } out += `<li>${inline(li[1])}</li>`; return; }
      if (inList) { out += "</ul>"; inList = false; }
      const h = l.match(/^#{1,4}\s+(.*)/);
      if (h) out += `<h5>${inline(h[1])}</h5>`; else if (l.trim()) out += `<p>${inline(l)}</p>`;
    });
    return out + (inList ? "</ul>" : "");
  }
  function flatInputs(cp) {
    const v = X.resolved(cp).v;
    return cp.fields.filter((f) => f.type !== "group").map((f) => {
      const x = v[f.id];
      if (f.type === "checklist") return `${f.label} :\n` + f.items.map((i) => `  - ${i.code ? i.code + " " : ""}${i.label} : ${(f.states.find((s) => String(s[0]) === String((x || {})[i.id])) || [, "?"])[1]}`).join("\n");
      if (f.type === "table") return `${f.label} :\n` + (x || []).map((row) => "  - " + f.columns.map((c) => `${c.label}: ${c.options ? (c.options.find((o) => o[0] === row[c.id]) || [, row[c.id]])[1] : row[c.id]}`).join(" ; ")).join("\n");
      if (f.type === "select" || f.type === "seg") return `${f.label} : ${(f.options.find((o) => String(o[0]) === String(x)) || [, x])[1]}`;
      return `${f.label} : ${x} ${f.unit || ""}`;
    }).join("\n");
  }
  function resultText(r) { return `Verdict : ${r.verdict}\nRésumé : ${r.summary}\n${r.kpis.map((k) => `${k.l} : ${k.v} ${k.u}`).join("\n")}\nConstats :\n${r.findings.map((f) => "- " + f.t).join("\n")}\nMéthode : ${r.hyp}\nSources : ${r.sources.map((s) => s.t).join(" | ")}`; }
  function profileText() { const p = X.profile(); return `Entreprise : ${p.nom || "non nommée"} · secteur ${p.secteur} · ${p.eff} salariés en France (${p.effM} groupe) · CA ${p.ca} M€ · ${p.surf} m² tertiaires · ${p.gwh} GWh/an · marchés publics : ${p.mp} · allégations écologiques : ${p.b2c}`; }
  function promptFor(cp) {
    const r = X.result(cp);
    if (cp.id === "objections") return `Tu es un consultant RSE senior qui conseille une PME française (novembre 2026).\nRédige une réponse orale de 150 à 200 mots à l'objection ci-dessous, adaptée au public et au contexte. Structure : une phrase qui reconnaît l'objection, deux ou trois arguments concrets, un chiffre parmi ceux fournis, une première étape, puis la question à poser. Utilise uniquement les faits fournis.\n\n${profileText()}\n\nDonnées :\n${flatInputs(cp)}\n\nArguments disponibles :\n${resultText(r)}`;
    return `Tu es un consultant RSE senior qui conseille une PME ou ETI française (novembre 2026).\nCopilote : ${cp.title}. ${cp.intro}\n\n${profileText()}\n\nRéponses :\n${flatInputs(cp)}\n\nRésultats calculés par l'outil :\n${resultText(r)}\n\nRédige une analyse de 300 mots maximum, exactement dans ce format Markdown :\n## Diagnostic\n(3 phrases avec les chiffres clés)\n## Priorités\n- (3 puces, chacune reliée à un chiffre ou un constat)\n## Plan d'action\n- 30 jours : …\n- 90 jours : …\n- 12 mois : …\n## Vigilance\n- (2 puces : limites des hypothèses, points à faire valider)\n\nN'invente aucun chiffre, aucune source et aucun texte de loi absent des données. Pas de conseil juridique définitif.`;
  }
  async function runAI() {
    if (!X.aiAvailable()) return;
    if (!(await window.SXC.ensureContact())) return;
    const cp = current, out = document.getElementById("aiOut"), go = document.getElementById("aiGo"), stop = document.getElementById("aiStop");
    aiCtl = new AbortController(); go.disabled = true; stop.hidden = false;
    out.innerHTML = `<span class="thinking"><i></i><i></i><i></i> ${esc(t("ai_thinking"))}</span>`;
    try {
      const text = await X.ask(promptFor(cp), { kind: "analyse", signal: aiCtl.signal, onText: ({ text }) => { if (current === cp) out.innerHTML = md(text); } });
      S().ai[cp.id] = text; S().used[cp.id] = true; X.record(cp); header(); X.save();
    } catch (e) {
      if (e && e.text && e.code !== "refused") { out.innerHTML = md(e.text); S().ai[cp.id] = e.text; X.save(); }
      else out.innerHTML = e && e.code === "cancelled" ? "" : `<p class="ai-note">${esc(X.aiError(e))}</p>`;
    } finally { if (current === cp && go.isConnected) { go.disabled = false; go.textContent = t("ai_regen"); stop.hidden = true; } }
  }

  /* ---------- profil ---------- */
  function profileView() {
    current = null;
    const p = X.profile();
    app.innerHTML = `<div class="wrap narrow">
      <div class="cp-head"><a class="back" href="#accueil">${esc(t("back"))}</a><h1 id="pageH" tabindex="-1">${esc(t("prof_title"))}</h1><p>${esc(t("prof_sub"))}</p></div>
      <form class="panel" id="pform">
        <div class="fgrid">${X.PROFILE_FIELDS.map((f) => {
          const id = "p-" + f.id;
          if (f.type === "select") return `<div class="field"><label for="${id}">${esc(t(f.k))}</label><div class="inp"><select id="${id}" name="${f.id}">${f.options.map((o) => `<option${p[f.id] === o ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></div></div>`;
          if (f.type === "seg") return `<div class="field"><label for="${id}">${esc(t(f.k))}</label><div class="inp"><select id="${id}" name="${f.id}"><option value="oui"${p[f.id] === "oui" ? " selected" : ""}>${esc(t("yes"))}</option><option value="non"${p[f.id] === "non" ? " selected" : ""}>${esc(t("no"))}</option></select></div></div>`;
          return `<div class="field${f.id === "nom" ? " wide" : ""}"><label for="${id}">${esc(t(f.k))}</label><div class="inp"><input id="${id}" name="${f.id}" type="${f.type}" ${f.type === "number" ? 'step="any" min="0" inputmode="decimal"' : ""} value="${esc(p[f.id])}"></div></div>`;
        }).join("")}</div>
        <div class="toolbar"><button class="chip-btn primary" type="submit">${esc(t("prof_apply"))}</button></div>
      </form>
      <section class="panel" style="margin:16px 0 56px"><h2>${esc(t("ct_title"))}</h2>${S().contact ? `<p class="sub">${esc(`${S().contact.prenom} ${S().contact.nom} · ${S().contact.email} · ${S().contact.entreprise}`)}</p>` : `<p class="sub">${esc(t("ct_none"))}</p>`}<div class="toolbar"><button class="chip-btn" type="button" id="editContact">${esc(S().contact ? t("ct_edit") : t("ct_go"))}</button>${S().contact ? `<button class="chip-btn" type="button" id="forget">${esc(t("ct_forget"))}</button>` : ""}</div></section></div>`;
    document.getElementById("editContact").onclick = async () => { await window.SXC.contactDialog(); profileView(); };
    const fg = document.getElementById("forget"); if (fg) fg.onclick = () => { S().contact = null; S().chat = []; X.save(); X.toast(t("ct_forgotten")); profileView(); };
    document.getElementById("pform").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target), np = {};
      X.PROFILE_FIELDS.forEach((f) => (np[f.id] = f.type === "number" ? num(fd.get(f.id)) : String(fd.get(f.id) || "")));
      S().profile = np; X.applyProfile(); X.save(); X.toast(t("prof_saved")); header();
    };
  }

  /* ---------- plan d'action ---------- */
  function planView() {
    current = null;
    const items = X.planItems(), lv = (k) => t(k === "high" ? "high" : k === "mid" ? "mid" : "low");
    const sel = (id, key, val, opts) => `<select aria-label="${esc(t("plan_" + key))}" data-plan="${id}" data-k="${key}">${opts.map(([k, l]) => `<option value="${k}"${val === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    const LV = [["high", t("high")], ["mid", t("mid")], ["low", t("low")]], ST = [["todo", t("st_todo")], ["doing", t("st_doing")], ["done", t("st_done")]];
    app.innerHTML = `<div class="wrap">
      <div class="cp-head"><a class="back" href="#accueil">${esc(t("back"))}</a><h1 id="pageH" tabindex="-1">${esc(t("plan_title"))}</h1><p>${esc(t("plan_sub"))}</p></div>
      <div class="toolbar" style="margin:0 0 14px"><button class="chip-btn" type="button" id="addAct">${esc(t("plan_add"))}</button><button class="chip-btn" type="button" id="planX">${esc(t("xlsx"))}</button></div>
      ${items.length ? `<div class="tbl-wrap plan"><table class="ed"><thead><tr><th scope="col">Action</th><th scope="col">${esc(t("plan_src"))}</th><th scope="col">${esc(t("plan_impact"))}</th><th scope="col">${esc(t("plan_effort"))}</th><th scope="col">${esc(t("plan_owner"))}</th><th scope="col">${esc(t("plan_due"))}</th><th scope="col">${esc(t("plan_status"))}</th></tr></thead><tbody>
      ${items.map((a) => `<tr class="${a.status === "done" ? "done" : ""}"><td class="act">${a.custom ? `<input aria-label="Action" data-plan="${a.id}" data-k="text" value="${esc(a.text)}">` : esc(a.text)}</td><td>${a.cp ? `<a href="#${a.cp}">${esc(cpT(byId[a.cp]).title)}</a>` : esc(t("plan_custom"))}</td><td><span class="dot ${a.impact}"></span>${sel(a.id, "impact", a.impact, LV)}</td><td>${sel(a.id, "effort", a.effort, LV)}</td><td><input aria-label="${esc(t("plan_owner"))}" data-plan="${a.id}" data-k="owner" placeholder="—" value="${esc(a.owner)}"></td><td><input type="date" aria-label="${esc(t("plan_due"))}" data-plan="${a.id}" data-k="due" value="${esc(a.due)}"></td><td>${sel(a.id, "status", a.status, ST)}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="panel">${esc(t("plan_empty"))}</p>`}
    </div>`;
    const upd = (e) => {
      const el = e.target; if (!el.dataset.plan) return;
      const id = el.dataset.plan, k = el.dataset.k, st = S();
      const c = st.custom.find((x) => x.id === id);
      if (c) c[k] = el.value; else (st.plan[id] ||= {})[k] = el.value;
      X.save(); if (k === "status" || k === "impact" || k === "effort") planView();
    };
    app.querySelector(".wrap").addEventListener("change", upd);
    app.querySelectorAll("input[data-plan]").forEach((i) => i.addEventListener("input", (e) => { const el = e.target, st = S(); const c = st.custom.find((x) => x.id === el.dataset.plan); if (c) c[el.dataset.k] = el.value; else (st.plan[el.dataset.plan] ||= {})[el.dataset.k] = el.value; X.save(); }));
    document.getElementById("addAct").onclick = () => { S().custom.push({ id: "c" + Date.now().toString(36), text: "", impact: "mid", effort: "mid", owner: "", due: "", status: "todo" }); X.save(); planView(); const ins = app.querySelectorAll("td.act input"); if (ins.length) ins[ins.length - 1].focus(); };
    document.getElementById("planX").onclick = () => window.SXE.xlsx([], true);
  }

  /* ---------- veille ---------- */
  function watchView() {
    current = null;
    const p = X.profile(), td = X.today(), loc = S().lang === "en" ? "en-GB" : "fr-FR";
    app.innerHTML = `<div class="wrap narrow">
      <div class="cp-head"><a class="back" href="#accueil">${esc(t("back"))}</a><h1 id="pageH" tabindex="-1">${esc(t("watch_title"))}</h1><p>${esc(t("watch_sub"))}</p></div>
      <ol class="timeline">${X.TIMELINE.map((e) => { const you = e.ap(p), past = e.d < td; return `<li class="${you ? "you" : ""} ${past ? "past" : ""}"><div class="when mono">${new Date(e.d).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" })}</div><div class="what"><b>${esc(e.t)}</b><span>${esc(e.s)}</span><div class="tags">${you ? `<span class="pill crit">${esc(t("watch_you"))}</span>` : ""}<span class="pill ${past ? "ok" : "info"}">${esc(past ? t("watch_past") : t("watch_soon"))}</span>${e.check ? `<span class="pill warn">${esc(t("watch_check"))}</span>` : ""}</div></div></li>`; }).join("")}</ol>
    </div>`;
  }

  /* ---------- méthode ---------- */
  function methodView() {
    current = null;
    app.innerHTML = `<div class="wrap narrow">
      <div class="cp-head"><a class="back" href="#accueil">${esc(t("back"))}</a><h1 id="pageH" tabindex="-1">${esc(t("method_title"))}</h1><p>${esc(t("method_sub"))}</p></div>
      ${copilots.map((c) => { const r = c.compute(X.defaults(c)); return `<section class="panel mth"><h2>${esc(cpT(c).title)} <span class="calc">${esc(c.calc)}</span></h2><p>${esc(cpT(c).intro)}</p>${r.hyp ? `<p><b>${esc(t("method"))}</b> ${esc(r.hyp)}</p>` : ""}<div class="sources">${r.sources.map((s) => `<span>${esc(s.t)} · <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(t("link"))}</a></span>`).join("")}</div></section>`; }).join("")}
      <section class="panel mth"><h2>${esc(t("nav_watch"))}</h2><p>${X.LINKS.map((l) => `${esc(cpT(byId[l.from]).title)} → ${esc(cpT(byId[l.to]).title)} (${esc(l.item)})`).join(" · ")}</p></section>
    </div>`;
  }

  /* ---------- rapport ---------- */
  function reportView() {
    current = null;
    const st = S(), used = copilots.filter((c) => st.used[c.id]), list = used.length ? used : copilots;
    app.innerHTML = `<div class="wrap">
      <div class="cp-head"><a class="back" href="#accueil">${esc(t("back"))}</a><div class="eyebrow">${esc(X.profile().nom || "Sillon")} · ${new Date().toLocaleDateString(st.lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div><h1 id="pageH" tabindex="-1">${esc(t("rep_title"))}</h1><p>${esc(used.length ? t("rep_sub_used", { n: used.length }) : t("rep_sub_none"))}</p></div>
      <div class="toolbar" style="margin:0 0 20px"><button class="chip-btn primary" type="button" id="pdfAll">${esc(t("rep_pdf"))}</button><button class="chip-btn" type="button" id="xlsAll">${esc(t("rep_xlsx"))}</button><a class="chip-btn" href="#presentation">${esc(t("nav_present"))}</a><button class="chip-btn" type="button" data-accomp>${esc(t("acc_cta"))}</button></div>
      <div class="grid4" style="padding-bottom:56px">${list.map((c) => { const r = X.result(c); return `<a class="card" href="#${c.id}"><div class="eyebrow">${esc(famT(families.find((f) => f.id === c.fam)).title)}</div><h3>${esc(cpT(c).title)}</h3><p><b style="color:var(--fg)">${esc(r.verdict)}</b><br>${esc(r.summary)}</p><div class="foot"><span class="state ${st.used[c.id] ? "done" : ""}">${esc(st.used[c.id] ? (st.ai[c.id] ? "Claude ✓" : t("st_used")) : t("example"))}</span><span class="mono">${r.gauge ? esc(r.gauge.show || r.gauge.val) : ""}</span></div></a>`; }).join("")}</div>
    </div>`;
    document.getElementById("pdfAll").onclick = () => window.SXE.pdf(list.map((c) => c.id));
    document.getElementById("xlsAll").onclick = () => window.SXE.xlsx(list.map((c) => c.id), true);
  }

  /* ---------- confidentialité et mentions légales ---------- */
  function legalView(kind) {
    current = null;
    const L = window.SILLON_LEGAL[S().lang === "en" ? "en" : "fr"][kind];
    app.innerHTML = `<div class="wrap narrow"><div class="cp-head"><a class="back" href="#accueil">${esc(t("back"))}</a><h1 id="pageH" tabindex="-1">${esc(L.title)}</h1><p>${esc(L.updated)}</p></div><article class="panel legal">${L.html}</article><div style="height:56px"></div></div>`;
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-accomp]")) window.SXC.accompanyDialog(); });

  window.SXV = { legalView, header, home, view, profileView, planView, watchView, methodView, reportView, md, flatInputs, resultText, profileText, gaugeSvg, spark, icon, current: () => current, renderRes, abortAI: () => aiCtl && aiCtl.abort(), clearCurrent: () => (current = null) };
})();
