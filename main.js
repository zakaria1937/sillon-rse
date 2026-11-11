/* Sillon — scène 3D (champ labouré) et routage. */
(function () {
  const X = window.SX, V = window.SXV, C = window.SXC;

  /* ---------- scène 3D ---------- */
  let stopField = null;
  function start() {
    if (stopField) stopField();
    const cv = document.getElementById("field"); if (!cv) return;
    const hero = cv.parentElement;
    // three.js (600 Ko) est chargé après l'affichage de la page, pour ne pas ralentir l'accueil.
    if (!window.THREE) { X.loadLib("three").then(() => { if (document.getElementById("field") === cv) start(); }).catch(() => cv.remove()); return; }
    const T = window.THREE;
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { cv.remove(); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new T.Scene(); scene.fog = new T.Fog(0x0a120e, 6, 26);
    const cam = new T.PerspectiveCamera(42, 1, 0.1, 100); cam.position.set(0, 2.6, 9); cam.lookAt(0, 0, -4);
    const ROWS = 46, COLS = 140, lines = [], col = new T.Color("#7DB896"), soilC = new T.Color("#E0A062");
    for (let r = 0; r < ROWS; r++) {
      const g = new T.BufferGeometry(), pos = new Float32Array(COLS * 3);
      for (let c = 0; c < COLS; c++) { pos[c * 3] = -14 + (28 * c) / (COLS - 1); pos[c * 3 + 2] = 4 - r * 0.62; }
      g.setAttribute("position", new T.BufferAttribute(pos, 3));
      const l = new T.Line(g, new T.LineBasicMaterial({ color: r % 9 === 4 ? soilC : col, transparent: true, opacity: r % 9 === 4 ? 0.9 : 0.55 }));
      scene.add(l); lines.push(l);
    }
    const NP = 260, pg = new T.BufferGeometry(), pp = new Float32Array(NP * 3), sp = new Float32Array(NP);
    for (let i = 0; i < NP; i++) { pp[i * 3] = (Math.random() - 0.5) * 26; pp[i * 3 + 1] = Math.random() * 4; pp[i * 3 + 2] = 4 - Math.random() * 26; sp[i] = 0.2 + Math.random() * 0.6; }
    pg.setAttribute("position", new T.BufferAttribute(pp, 3));
    scene.add(new T.Points(pg, new T.PointsMaterial({ color: 0xcfe6d6, size: 0.05, transparent: true, opacity: 0.8 })));
    let mx = 0, my = 0, raf = 0, vis = true; const t0 = performance.now();
    const onMove = (e) => { const r = hero.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; };
    hero.addEventListener("pointermove", onMove);
    const size = () => { const w = hero.clientWidth, h = hero.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    const ro = new ResizeObserver(size); ro.observe(hero); size();
    const io = new IntersectionObserver(([en]) => { vis = en.isIntersecting; if (vis && !raf && !X.reduce) raf = requestAnimationFrame(frame); }); io.observe(hero);
    function shape(t) {
      lines.forEach((l) => {
        const a = l.geometry.attributes.position.array;
        for (let c = 0; c < COLS; c++) { const x = a[c * 3], z = a[c * 3 + 2]; a[c * 3 + 1] = Math.sin(x * 0.45 + t * 0.6) * 0.35 + Math.sin(z * 0.5 - t * 0.4 + x * 0.12) * 0.45 + Math.cos(x * 0.18 + z * 0.22 + t * 0.25) * 0.5 - 0.6 + Math.sin(x * 2.4) * 0.05; }
        l.geometry.attributes.position.needsUpdate = true;
      });
      const p = pg.attributes.position.array;
      for (let i = 0; i < NP; i++) { p[i * 3 + 1] += sp[i] * 0.004; if (p[i * 3 + 1] > 4) p[i * 3 + 1] = -0.2; }
      pg.attributes.position.needsUpdate = true;
    }
    function frame(now) {
      raf = 0; if (!vis) return;
      shape((now - t0) / 1000);
      cam.position.x += (mx * 1.6 - cam.position.x) * 0.04; cam.position.y += (2.6 - my * 0.8 - cam.position.y) * 0.04; cam.lookAt(0, 0, -4);
      renderer.render(scene, cam); raf = requestAnimationFrame(frame);
    }
    if (X.reduce) { shape(2); renderer.render(scene, cam); } else raf = requestAnimationFrame(frame);
    stopField = () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); hero.removeEventListener("pointermove", onMove); renderer.dispose(); stopField = null; };
  }
  window.SXS = { start };

  /* ---------- routage ---------- */
  let first = true;
  function route() {
    V.abortAI(); if (stopField) stopField();
    document.querySelectorAll(".pres,.modal").forEach((el) => el.remove());
    const h = location.hash.slice(1);
    V.header();
    if (X.byId[h]) V.view(X.byId[h]);
    else if (h === "profil") V.profileView();
    else if (h === "plan") V.planView();
    else if (h === "veille") V.watchView();
    else if (h === "methode") V.methodView();
    else if (h === "rapport") V.reportView();
    else if (["confidentialite", "mentions", "cgu", "cookies", "credits", "accessibilite"].includes(h)) V.legalView(h);
    else if (h === "mes-donnees") V.myDataView();
    else if (h.startsWith("dossier-")) { V.myDataView(); const inp = document.getElementById("cl-in"); if (inp) { inp.value = h.slice(8); inp.focus(); } }
    else if (h === "presentation") { V.reportView(); C.presentation(); }
    else if (h === "main") return;
    else { V.clearCurrent(); V.home(); }
    C.chatInit();
    V.notice();
    if (!first) { scrollTo(0, 0); const hd = document.getElementById("pageH"); if (hd) hd.focus({ preventScroll: true }); }
    first = false;
  }
  window.SXR = { route };
  X.onCaps(() => {
    document.querySelectorAll("[data-needs-ai]").forEach((el) => (el.hidden = !X.aiAvailable()));
    document.querySelectorAll("[data-needs-ai-off]").forEach((el) => (el.hidden = X.aiAvailable()));
    const co = document.getElementById("chatOff"); if (co) co.hidden = X.aiAvailable();
  });
  document.addEventListener("click", (e) => { const a = e.target.closest("[data-skip]"); if (a) { e.preventDefault(); const m = document.getElementById("pageH") || document.getElementById("main"); m.focus(); } });
  addEventListener("hashchange", route);
  route();
})();
