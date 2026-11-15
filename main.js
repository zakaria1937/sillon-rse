/* Sillon — scène 3D (champ labouré) et routage. */
(function () {
  const X = window.SX, V = window.SXV, C = window.SXC;

  /* ---------- scène 3D : le relief réel de la Normandie, labouré ----------
     Données : IGN RGE ALTI (Licence Ouverte 2.0), grille 128 × 100, octet v = 1 + altitude/2 m, 0 = mer.
     Chaque ligne de la scène est une rangée de la grille : un sillon qui épouse le relief. */
  const GW = 128, GH = 100, BBOX = [-1.95, 48.15, 1.85, 50.10];
  const SX_ = 27.7, SZ_ = 21.7, EXAG = 0.004;           // 1 unité = 10 km ; relief exagéré × 40
  const VILLES = [["Cherbourg", -1.62, 49.64], ["Le Havre", 0.11, 49.49], ["Dieppe", 1.08, 49.92, 1], ["Rouen", 1.10, 49.44],
    ["Caen", -0.37, 49.18], ["Saint-Lô", -1.09, 49.12, 1], ["Évreux", 1.15, 49.03, 1], ["Alençon", 0.09, 48.43]];
  let relief = null, reliefP = null, stopField = null;
  function loadRelief() {
    if (!reliefP) reliefP = fetch("assets/normandie.bin").then((r) => { if (!r.ok) throw new Error("relief"); return r.arrayBuffer(); }).then((b) => (relief = new Uint8Array(b)));
    return reliefP;
  }
  const alt = (v) => (v ? (v - 1) * 2 : 0);
  function hAt(gx, gy) {                                  // altitude bilinéaire (m), -1 en mer
    gx = Math.max(0, Math.min(GW - 1.001, gx)); gy = Math.max(0, Math.min(GH - 1.001, gy));
    const x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0, g = (i, j) => relief[j * GW + i];
    const a = g(x0, y0), b = g(x0 + 1, y0), c = g(x0, y0 + 1), d = g(x0 + 1, y0 + 1);
    const land = (a ? 1 : 0) * (1 - fx) * (1 - fy) + (b ? 1 : 0) * fx * (1 - fy) + (c ? 1 : 0) * (1 - fx) * fy + (d ? 1 : 0) * fx * fy;
    const m = alt(a) * (1 - fx) * (1 - fy) + alt(b) * fx * (1 - fy) + alt(c) * (1 - fx) * fy + alt(d) * fx * fy;
    return land < 0.5 ? -1 : m / Math.max(land, 0.001);
  }
  const toX = (lon) => ((lon - BBOX[0]) / (BBOX[2] - BBOX[0]) - 0.5) * SX_;
  const toZ = (lat) => ((BBOX[3] - lat) / (BBOX[3] - BBOX[1]) - 0.5) * SZ_;
  const css = (el, n) => getComputedStyle(el).getPropertyValue(n).trim();
  function carbon() {                                     // tonnes CO2e du bilan carbone, si l'utilisateur l'a fait
    const st = X.state(), cp = X.byId["bilan-carbone"];
    if (!st.used || !st.used["bilan-carbone"] || !cp) return 0;
    try { const g = X.result(cp).gauge; return g && g.val > 0 ? g.val : 0; } catch (e) { return 0; }
  }
  window.SXS_carbon = carbon;
  window.SXS_relief = () => relief;

  function start() {
    if (stopField) stopField();
    const cv = document.getElementById("field"); if (!cv) return;
    const box = cv.parentElement, hero = box.closest(".hero") || box;
    // three.js (600 Ko) et le relief (12 Ko) sont chargés après l'affichage de la page.
    if (!window.THREE || !relief) {
      Promise.all([window.THREE ? 0 : X.loadLib("three"), loadRelief()]).then(() => { if (document.getElementById("field") === cv) start(); }).catch(() => { box.classList.add("map-off"); cv.remove(); });
      return;
    }
    const T = window.THREE;
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { box.classList.add("map-off"); cv.remove(); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(32, 1, 0.1, 200);
    const COLS = 256, tons = carbon(), RED = tons ? Math.max(1, Math.min(GH, Math.round(tons / 50))) : 0;
    // bande rouge au premier plan (sud) : 1 sillon = 50 t CO2e du bilan carbone de l'utilisateur
    const redFrom = GH - RED;
    const base = [], lines = [], mats = [];
    for (let r = 0; r < GH; r++) {
      const pos = new Float32Array(COLS * 3), col = new Float32Array(COLS * 3), b = new Float32Array(COLS), sea = new Uint8Array(COLS);
      for (let c = 0; c < COLS; c++) {
        const gx = (c / (COLS - 1)) * (GW - 1), m = hAt(gx, r);
        pos[c * 3] = (c / (COLS - 1) - 0.5) * SX_; pos[c * 3 + 2] = (r / (GH - 1) - 0.5) * SZ_;
        b[c] = m < 0 ? 0.004 : m * EXAG + 0.012; sea[c] = m < 0 ? 1 : 0; pos[c * 3 + 1] = b[c];
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("color", new T.BufferAttribute(col, 3));
      const mat = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1 });
      const l = new T.Line(g, mat); l.userData = { r, sea, red: RED > 0 && r >= redFrom }; scene.add(l); lines.push(l); base.push(b); mats.push(mat);
    }
    // maillage invisible pour lire l'altitude sous le pointeur
    const pick = new T.Mesh(new T.PlaneGeometry(SX_, SZ_, GW - 1, GH - 1), new T.MeshBasicMaterial({ side: T.DoubleSide }));
    pick.rotation.x = -Math.PI / 2; pick.updateMatrixWorld();
    // le maillage, peint couleur papier et légèrement reculé, masque les sillons cachés derrière les crêtes (rendu « gravure »)
    pick.material.polygonOffset = true; pick.material.polygonOffsetFactor = 1; pick.material.polygonOffsetUnits = 1;
    { const p = pick.geometry.attributes.position; for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const m = hAt(i, j); p.setZ(j * GW + i, m < 0 ? 0 : m * EXAG); } p.needsUpdate = true; pick.geometry.computeBoundingSphere(); }
    scene.add(pick);

    function paint() {                                    // couleurs lues dans les variables CSS : suit le thème clair ou sombre
      const ink = new T.Color(css(hero, "--map-ink") || "#1C1B17"), paper = new T.Color(css(hero, "--map-paper") || "#F1ECE1"), soil = new T.Color(css(hero, "--map-soil") || "#9A3B12");
      const seaC = ink.clone().lerp(paper, 0.86), far = paper; pick.material.color.copy(paper);
      lines.forEach((l) => {
        const { r, sea, red } = l.userData, a = l.geometry.attributes.color.array, depth = 0.45 * (1 - r / (GH - 1));
        for (let c = 0; c < sea.length; c++) {
          // la mer : un sillon sur trois, très pâle
          const k = (sea[c] ? (r % 3 ? paper : seaC) : red ? soil : ink).clone().lerp(far, sea[c] ? depth * 0.4 : depth);
          a[c * 3] = k.r; a[c * 3 + 1] = k.g; a[c * 3 + 2] = k.b;
        }
        l.geometry.attributes.color.needsUpdate = true;
      });
    }
    paint();
    const mq = matchMedia("(prefers-color-scheme: dark)"), onScheme = () => { paint(); if (X.reduce) renderer.render(scene, cam); };
    mq.addEventListener ? mq.addEventListener("change", onScheme) : mq.addListener(onScheme);

    // repères : villes et curseur, en HTML par-dessus le canvas (décoratifs, masqués aux lecteurs d'écran)
    const tags = VILLES.map(([n, lo, la, minor]) => { const el = document.createElement("span"); el.className = "map-tag" + (minor ? " minor" : ""); el.textContent = n; box.appendChild(el); const gx = ((lo - BBOX[0]) / (BBOX[2] - BBOX[0])) * (GW - 1), gy = ((BBOX[3] - la) / (BBOX[3] - BBOX[1])) * (GH - 1); return { el, v: new T.Vector3(toX(lo), Math.max(0, hAt(gx, gy)) * EXAG + 0.06, toZ(la)) }; });
    const cross = document.createElement("span"); cross.className = "map-cross"; cross.hidden = true; box.appendChild(cross);
    const read = box.parentElement.querySelector("[data-map-read]");
    const ray = new T.Raycaster(), ndc = new T.Vector2(); let hit = null, mx = 0, my = 0, raf = 0, vis = true, w = 1, h = 1;
    const onMove = (e) => {
      const rc = box.getBoundingClientRect(); mx = (e.clientX - rc.left) / rc.width - 0.5; my = (e.clientY - rc.top) / rc.height - 0.5;
      ndc.set(mx * 2, -my * 2); ray.setFromCamera(ndc, cam); const i = ray.intersectObject(pick)[0];
      hit = i ? i.point : null;
      if (read) {
        if (!hit) { read.textContent = read.dataset.idle; cross.hidden = true; return; }
        const lon = BBOX[0] + (hit.x / SX_ + 0.5) * (BBOX[2] - BBOX[0]), lat = BBOX[3] - (hit.z / SZ_ + 0.5) * (BBOX[3] - BBOX[1]);
        const m = hAt(((lon - BBOX[0]) / (BBOX[2] - BBOX[0])) * (GW - 1), ((BBOX[3] - lat) / (BBOX[3] - BBOX[1])) * (GH - 1));
        read.textContent = `${lat.toFixed(2).replace(".", ",")}° N · ${Math.abs(lon).toFixed(2).replace(".", ",")}° ${lon < 0 ? "O" : "E"} · ${m < 0 ? "Manche" : Math.round(m) + " m"}`;
      }
      if (X.reduce) place();
    };
    const onLeave = () => { hit = null; mx = my = 0; cross.hidden = true; if (read) read.textContent = read.dataset.idle; };
    box.addEventListener("pointermove", onMove); box.addEventListener("pointerleave", onLeave);
    const v3 = new T.Vector3();
    function place() {
      tags.forEach((t) => { v3.copy(t.v).project(cam); const out = v3.z > 1 || Math.abs(v3.x) > 1.02 || Math.abs(v3.y) > 1.02; t.el.style.visibility = out ? "hidden" : ""; t.el.style.transform = `translate(${((v3.x + 1) / 2) * w}px,${((1 - v3.y) / 2) * h}px)`; });
      if (hit) { v3.copy(hit).project(cam); cross.hidden = false; cross.style.transform = `translate(${((v3.x + 1) / 2) * w}px,${((1 - v3.y) / 2) * h}px)`; }
    }
    const size = () => {
      w = box.clientWidth || 1; h = box.clientHeight || 1; renderer.setSize(w, h, false); cam.aspect = w / h;
      // cadrage : la carte entière tient dans le cadre, quel que soit le format
      cam.userData.d = Math.max(22, (1.12 * (SX_ / 2)) / (Math.tan((cam.fov * Math.PI) / 360) * cam.aspect)); cam.updateProjectionMatrix();
      if (X.reduce || !raf) { frame(performance.now(), true); }
    };
    const t0 = performance.now(), INTRO = X.reduce ? 0 : 1800;
    function shape(t, intro) {
      // les sillons se tracent du nord au sud à l'ouverture, puis le relief « respire » sous le pointeur
      lines.forEach((l, r) => {
        const show = intro >= 1 ? 1 : Math.max(0, Math.min(1, intro * 1.6 - (1 - r / (GH - 1)) * 0.6));
        l.geometry.setDrawRange(0, Math.round(COLS * show));
        if (!hit && intro >= 1) return;
        const a = l.geometry.attributes.position.array, b = base[r];
        for (let c = 0; c < COLS; c++) {
          let y = b[c];
          if (hit && !l.userData.sea[c]) { const dx = a[c * 3] - hit.x, dz = a[c * 3 + 2] - hit.z, d2 = dx * dx + dz * dz; if (d2 < 9) y += 0.35 * Math.exp(-d2 / 1.4) * (0.6 + 0.4 * Math.sin(t * 3 - Math.sqrt(d2) * 2.2)); }
          a[c * 3 + 1] = y;
        }
        l.geometry.attributes.position.needsUpdate = true;
      });
    }
    function frame(now, once) {
      raf = 0; if (!vis && !once) return;
      const t = (now - t0) / 1000, intro = INTRO ? Math.min(1, (now - t0) / INTRO) : 1, d = cam.userData.d || 27;
      shape(t, intro);
      const tx = mx * 2.2, ty = my * 1.2;
      cam.position.set(tx, d * 0.74 - ty, d * 0.68); cam.lookAt(0, -0.2, 1.6);
      renderer.render(scene, cam); place();
      if (!once && !X.reduce) raf = requestAnimationFrame(frame);
    }
    const ro = new ResizeObserver(size); ro.observe(box); size();
    const io = new IntersectionObserver(([en]) => { vis = en.isIntersecting; if (vis && !raf && !X.reduce) raf = requestAnimationFrame(frame); }); io.observe(box);
    if (!X.reduce) raf = requestAnimationFrame(frame);
    box.classList.add("map-on");
    stopField = () => { cancelAnimationFrame(raf); raf = -1; ro.disconnect(); io.disconnect(); box.removeEventListener("pointermove", onMove); box.removeEventListener("pointerleave", onLeave); mq.removeEventListener && mq.removeEventListener("change", onScheme); tags.forEach((t) => t.el.remove()); cross.remove(); renderer.dispose(); stopField = null; };
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
