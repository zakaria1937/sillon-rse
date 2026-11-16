/* Sillon — exports PDF (jsPDF) et Excel (SheetJS). */
(function () {
  const X = window.SX;
  const { copilots, byId, t, cpT } = X;
  const S = () => X.state();
  const clean = (s) => String(s ?? "").replace(/[  ]/g, " ").replace(/₂/g, "2").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/≈/g, "env.").replace(/→/g, "->").replace(/←/g, "<-").replace(/×/g, "x").replace(/–|—/g, "-").replace(/[“”«»]/g, '"').replace(/✓/g, "ok").replace(/[^\x00-\xFF€’…œŒ]/g, "");
  const stamp = () => new Date().toISOString().slice(0, 10);
  const status = (msg, bad) => { const el = document.getElementById("exportStatus"); if (el) { el.textContent = msg; el.classList.toggle("bad", !!bad); } };
  // Les exports sont libres. L'éditeur n'est prévenu que si la personne a accepté d'être recontactée.
  const tell = (ev, extra) => { const c = S().contact; if (c && c.recontact) X.notify(ev, extra); };
  const fail = (e) => { status(t("exp_fail"), true); if (e && e.code === "declined") return; X.toast(e && e.code === "unavailable" ? (S().lang === "en" ? "Downloads are not available in this view." : "Le téléchargement n'est pas disponible dans cette vue.") : t("toast_fail")); };

  const summary = (ids) => ids.map((id) => { const c = byId[id], r = X.result(c); return `${c.title} : ${r.verdict} — ${r.summary}`; }).join("\n");
  async function pdf(ids) {
    status(t("exp_wait"));
    try { await X.loadLib("jspdf"); } catch (e) { X.toast(t("toast_lib")); status(t("toast_lib"), true); return; }
    const { jsPDF } = window.jspdf, st = S(), p = X.profile();
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const PW = 210, M = 18, CW = PW - 2 * M;
    let y = 0;
    const ink = [28, 27, 23], mut = [90, 84, 70], acc = [31, 74, 56], soil = [154, 59, 18];
    const lvlC = { ok: [42, 95, 55], warn: [122, 81, 8], crit: [160, 44, 30], info: [90, 84, 70] };
    const need = (h) => { if (y + h > 280) { doc.addPage(); y = 20; } };
    const text = (s, size, color, style = "normal", indent = 0, lh = 1.45) => {
      doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color);
      doc.splitTextToSize(clean(s), CW - indent).forEach((ln) => { need(size * 0.42 * lh); doc.text(ln, M + indent, y); y += size * 0.3528 * lh; });
    };
    doc.setFillColor(241, 236, 225); doc.rect(0, 0, PW, 74, "F");
    doc.setDrawColor(...ink); doc.setLineWidth(0.5); doc.line(M, 70, PW - M, 70);
    const TW = 106;
    // couverture : le relief réel de la Normandie (IGN) en sillons, si la carte a été chargée sur l'accueil
    const rel = window.SXS_relief && window.SXS_relief();
    if (rel) {
      doc.setLineWidth(0.18);
      for (let r = 4; r < 100; r += 4) { const pts = []; for (let c = 0; c < 128; c += 2) { const v = rel[r * 128 + c]; pts.push([132 + (c / 127) * 62, 14 + r * 0.5 - (v ? (v - 1) * 2 : 0) * 0.02, !!v]); }
        doc.setDrawColor(...(r > 84 ? soil : ink)); for (let k = 1; k < pts.length; k++) if (pts[k][2] && pts[k - 1][2]) doc.line(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]); }
    } else { doc.setDrawColor(...ink); doc.setLineWidth(0.3); for (let i = 0; i < 9; i++) { const yy = 14 + i * 5.5; doc.line(120, yy, 196, yy - 6 + Math.sin(i) * 2); } }
    doc.setTextColor(...ink); doc.setFont("times", "bold"); doc.setFontSize(30); doc.text("Sillon", M, 26);
    doc.setFont("helvetica", "normal"); doc.setFontSize(13);
    doc.text(clean((p.nom ? p.nom + " · " : "") + (ids.length > 1 ? (st.lang === "en" ? "Consolidated CSR report" : "Rapport RSE consolidé") : cpT(byId[ids[0]]).title)), M, 36, { maxWidth: TW });
    doc.setFontSize(9.5); doc.setTextColor(...mut);
    doc.text(clean(`${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · ${p.secteur} · ${p.eff} salariés · ${p.ca} M€ · ${ids.length} copilote(s)`), M, 45, { maxWidth: TW });
    doc.setFontSize(8); doc.text(clean(t("foot2")), M, 55, { maxWidth: TW });
    y = 84;
    const entered = ids.filter((id) => st.used[id]).length;
    text("PÉRIMÈTRE ET QUALITÉ DES DONNÉES", 11, acc, "bold");
    text("Périmètre : " + ids.length + " copilote(s) ; " + entered + " avec saisies utilisateur ; " + (ids.length - entered) + " avec valeurs de démonstration.", 9, mut);
    text("Les données saisies ne sont pas vérifiées et les justificatifs ne sont pas audités. Auto-évaluation indicative : ni audit, ni certification, ni avis juridique, ni attestation de conformité.", 8.5, soil);
    y += 4;
    if (ids.length > 1) {
      text(st.lang === "en" ? "Summary" : "Synthèse", 14, ink, "bold"); y += 1;
      ids.forEach((id) => { const c = byId[id], r = X.result(c); text(`${cpT(c).title} : ${r.verdict}${r.gauge ? ` (${r.gauge.show || r.gauge.val}${r.gauge.raw || r.gauge.show ? "" : "/100"})` : ""}${st.used[id] ? "" : " [exemple]"}`, 10, mut, "normal", 2); });
      const pl = X.planItems().filter((a) => a.status !== "done").slice(0, 10);
      if (pl.length) { y += 4; text(t("plan_title"), 14, ink, "bold"); y += 1; pl.forEach((a, i) => { text(`${i + 1}. [${t(a.impact)}] ${a.text}${a.owner ? " · Responsable : " + a.owner : " · Responsable à désigner"}${a.due ? " · Échéance : " + a.due : " · Échéance à fixer"}`, 9.5, ink, "normal", 2); if (a.kpi) text("Indicateur : " + a.kpi, 8.5, mut, "normal", 1); if (a.evidence) text("Preuve attendue : " + a.evidence, 8.5, mut, "normal", 1); }); }
    }
    ids.forEach((id, k) => {
      const c = byId[id], r = X.result(c);
      if (k > 0 || ids.length > 1) { doc.addPage(); y = 22; }
      doc.setFillColor(...acc); doc.rect(M, y - 5, 2.2, 9, "F");
      text(cpT(c).title, 18, ink, "bold", 5); y += 1;
      text(`${r.verdict}${st.used[id] ? "" : " · valeurs d'exemple"}`, 11, soil, "bold");
      text(r.summary, 10.5, mut); y += 3;
      if (r.kpis.length) {
        const w = (CW - 8) / 3;
        r.kpis.forEach((kp, i) => {
          const col = i % 3; if (col === 0) { if (i) y += 22; need(22); }
          const x = M + col * (w + 4);
          doc.setDrawColor(203, 212, 200); doc.setFillColor(237, 240, 234); doc.roundedRect(x, y, w, 19, 2, 2, "FD");
          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...mut); doc.text(clean(kp.l), x + 3, y + 5);
          doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...ink); doc.text(clean(`${kp.v} ${kp.u}`), x + 3, y + 12);
          doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...mut); doc.text(doc.splitTextToSize(clean(kp.s), w - 6)[0] || "", x + 3, y + 16.5);
        });
        y += 27;
      }
      text(t("findings"), 12, ink, "bold"); y += 1;
      r.findings.forEach((f) => { need(8); doc.setFillColor(...lvlC[f.lvl]); doc.circle(M + 1.5, y - 1.2, 1.2, "F"); text(`${f.tag ? f.tag + " : " : ""}${f.t}`, 9.5, ink, "normal", 5); y += 1; });
      y += 2; text(t("actions"), 12, ink, "bold"); y += 1;
      r.actions.forEach((a, i) => text(`${i + 1}. ${a}`, 9.5, ink, "normal", 2));
      if (st.ai[id]) {
        y += 3; text(t("ai_title"), 12, acc, "bold"); y += 1;
        st.ai[id].split("\n").forEach((l) => { if (!l.trim()) return; const h = l.match(/^#{1,4}\s+(.*)/); if (h) { y += 1; text(h[1].replace(/\*\*/g, ""), 10.5, ink, "bold"); } else text(l.replace(/^\s*[-*•]\s+/, "• ").replace(/\*\*/g, ""), 9.5, ink, "normal", /^\s*[-*•]/.test(l) ? 2 : 0); });
      }
      if (r.hyp) { y += 3; text(t("method") + " " + r.hyp, 8.5, mut, "italic"); }
      y += 2; text(t("sources"), 9.5, mut, "bold");
      r.sources.forEach((s) => text(`${s.t} - ${s.url}`, 8, mut, "normal", 2));
    });
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...mut); doc.setFont("helvetica", "normal"); doc.text(`Sillon · ${i}/${pages}`, PW - M, 290, { align: "right" }); }
    try { const fname = ids.length > 1 ? `sillon-rapport-${stamp()}.pdf` : `sillon-${ids[0]}-${stamp()}.pdf`; await X.saveFile(fname, doc.output("blob")); X.toast(t("toast_pdf")); status(t("exp_ok", { f: fname })); tell(ids.length > 1 ? "Rapport PDF consolidé téléchargé" : "Rapport PDF téléchargé", { copilote: ids.join(", "), resume: summary(ids) }); } catch (e) { fail(e); }
  }

  async function xlsx(ids, withPlan) {
    status(t("exp_wait"));
    try { await X.loadLib("xlsx"); } catch (e) { X.toast(t("toast_lib")); status(t("toast_lib"), true); return; }
    const XL = window.XLSX, wb = XL.utils.book_new(), st = S(), p = X.profile();
    const add = (name, rows, widths) => { const ws = XL.utils.aoa_to_sheet(rows); ws["!cols"] = (widths || [30, 50, 18, 14]).map((w) => ({ wch: w })); XL.utils.book_append_sheet(wb, ws, name.slice(0, 31).replace(/[\\/?*[\]:]/g, "")); };
    add("Profil", [["Champ", "Valeur"], ...X.PROFILE_FIELDS.map((f) => [t(f.k), p[f.id]])], [36, 30]);
    const entered = ids.filter((id) => st.used[id]).length;
    add("Qualité & périmètre", [["Contrôle", "Constat"], ["Date export", new Date().toLocaleString("fr-FR")], ["Périmètre", ids.length + " copilote(s)"], ["Modules renseignés", entered + " / " + ids.length], ["Modules avec valeurs de démonstration", String(ids.length - entered)], ["Vérification", "Données non vérifiées ; justificatifs non contrôlés"], ["Analyse IA", ids.some((id) => !!st.ai[id]) ? "Présente ; contenu à relire" : "Aucune analyse enregistrée"], ["Portée", "Auto-évaluation indicative ; ni audit, certification, avis juridique ou attestation de conformité"], ["Scores", "Indicateurs internes ; aucune preuve indépendante"]], [38, 92]);
    if (ids.length) add("Synthèse", [["Copilote", "Verdict", "Score", "Résumé", "Données"], ...ids.map((id) => { const c = byId[id], r = X.result(c); return [cpT(c).title, r.verdict, r.gauge ? r.gauge.show || r.gauge.val : "", r.summary, st.used[id] ? "saisies" : "exemple"]; })], [22, 30, 10, 70, 10]);
    ids.forEach((id) => {
      const c = byId[id], r = X.result(c), v = X.resolved(c).v, rows = [["Section", "Libellé", "Valeur", "Unité"]];
      c.fields.forEach((f) => {
        if (f.type === "group") return;
        if (f.type === "checklist") f.items.forEach((i) => rows.push(["Saisie · " + f.label, (i.code ? i.code + " " : "") + i.label, (f.states.find((s) => String(s[0]) === String((v[f.id] || {})[i.id])) || [, ""])[1], ""]));
        else if (f.type === "table") (v[f.id] || []).forEach((row, n) => rows.push(["Saisie · " + f.label, `Ligne ${n + 1}`, f.columns.map((col) => (col.options ? (col.options.find((o) => o[0] === row[col.id]) || [, row[col.id]])[1] : row[col.id])).join(" | "), ""]));
        else if (f.type === "select" || f.type === "seg") rows.push(["Saisie", f.label, (f.options.find((o) => String(o[0]) === String(v[f.id])) || [, v[f.id]])[1], ""]);
        else rows.push(["Saisie", f.label, f.type === "textarea" ? v[f.id] : X.num(v[f.id]), f.unit || ""]);
      });
      rows.push([], ["Traçabilité", "Statut des données", st.used[id] ? "Saisies utilisateur — non vérifiées" : "Valeurs par défaut / démonstration", ""], ["Résultat", "Verdict", r.verdict, ""], ["Résultat", "Résumé", r.summary, ""]);
      r.kpis.forEach((k) => rows.push(["Indicateur", k.l, k.v, k.u]));
      r.findings.forEach((f) => rows.push(["Constat", f.tag || f.lvl, f.t, ""]));
      r.actions.forEach((a) => rows.push(["Action", "", a, ""]));
      if (st.ai[id]) rows.push(["Analyse Claude", "", st.ai[id], ""]);
      if (r.hyp) rows.push(["Méthode", "", r.hyp, ""]);
      r.sources.forEach((s) => rows.push(["Source", s.t, s.url, ""]));
      add(cpT(c).title, rows);
    });
    if (withPlan) add("Plan d'action", [["Action", "Copilote", "Impact", "Effort", "Responsable", "Échéance", "Statut", "Indicateur de réussite", "Preuve attendue"], ...X.planItems().map((a) => [a.text, a.cp ? cpT(byId[a.cp]).title : t("plan_custom"), t(a.impact), t(a.effort), a.owner, a.due, t("st_" + a.status), a.kpi || "", a.evidence || ""])], [60, 20, 10, 10, 20, 12, 12, 32, 38]);
    const out = XL.write(wb, { bookType: "xlsx", type: "array" });
    const name = ids.length === 1 && !withPlan ? `sillon-${ids[0]}-${stamp()}.xlsx` : `sillon-dossier-rse-${stamp()}.xlsx`;
    try { await X.saveFile(name, new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); X.toast(t("toast_xlsx")); status(t("exp_ok", { f: name })); tell("Export Excel téléchargé", { copilote: ids.join(", ") || "plan d'action", resume: summary(ids) }); } catch (e) { fail(e); }
  }

  window.SXE = { pdf, xlsx };
})();
