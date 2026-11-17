// Sillon — espace entreprise (préversion). Les access tokens restent uniquement en mémoire.
(() => {
  let accessToken = null, user = null, organizations = [], selectedOrg = null, dossiers = [], refreshTimer = 0;
  let overlay = null, returnFocus = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const auth = async (action, payload) => fetch("/api/auth?action=" + action, {
    method: "POST", credentials: "same-origin",
    headers: payload ? { "content-type": "application/json" } : {},
    body: payload ? JSON.stringify(payload) : undefined,
  });

  function clearSession() {
    accessToken = null; user = null; organizations = []; selectedOrg = null; dossiers = [];
    clearTimeout(refreshTimer);
  }
  function setSession(data) {
    accessToken = data.access_token;
    user = data.user;
    clearTimeout(refreshTimer);
    const delay = Math.max(30_000, ((Number(data.expires_in) || 3600) - 60) * 1000);
    refreshTimer = setTimeout(() => refreshSession().catch(() => clearSession()), delay);
  }
  async function refreshSession() {
    const r = await auth("refresh");
    if (!r.ok) { clearSession(); return false; }
    const data = await r.json();
    if (!data.access_token) { clearSession(); return false; }
    setSession(data);
    return true;
  }

  async function api(resource, options = {}, retry = true) {
    if (!accessToken && !(await refreshSession())) throw new Error("session_expired");
    const url = "/api/tenant?resource=" + encodeURIComponent(resource) + (options.query ? "&" + options.query : "");
    const headers = { authorization: "Bearer " + accessToken };
    if (options.body !== undefined) headers["content-type"] = "application/json";
    const r = await fetch(url, {
      method: options.method || "GET", headers, credentials: "same-origin",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (r.status === 401 && retry && await refreshSession()) return api(resource, options, false);
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error(data?.code || "request_failed");
    return data;
  }

  function message(error) {
    const code = error?.message || "";
    const messages = {
      auth_not_configured: "L’espace entreprise n’est pas encore configuré dans Netlify (variables Supabase manquantes).",
      tenant_not_configured: "L’espace entreprise n’est pas encore configuré dans Netlify (variables Supabase manquantes).",
      unauthorized: "Votre session a expiré. Reconnectez-vous.",
      session_expired: "Votre session a expiré. Reconnectez-vous.",
      login_failed: "Adresse e-mail ou mot de passe incorrect.",
      auth_rate_limited: "Trop de tentatives. Réessayez plus tard.",
      identity_unavailable: "Le service d’authentification est temporairement indisponible.",
      tenant_read_failed: "Impossible de charger les organisations.",
      organization_create_failed: "Impossible de créer cette organisation.",
      dossier_read_failed: "Impossible de charger les dossiers.",
      dossier_create_failed: "Impossible de créer le dossier.",
      dossier_change_failed: "Cette opération n’a pas été autorisée.",
    };
    return messages[code] || "Une erreur est survenue. Vérifiez la configuration et réessayez.";
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "saas-overlay";
    overlay.hidden = true;
    overlay.innerHTML = '<section class="saas-dialog" role="dialog" aria-modal="true" aria-labelledby="saas-title"><button class="saas-close" type="button" data-saas-close aria-label="Fermer">×</button><div id="saas-content"></div></section>';
    overlay.addEventListener("click", (e) => { if (e.target === overlay || e.target.closest("[data-saas-close]")) close(); });
    document.body.appendChild(overlay);
  }
  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    if (returnFocus?.isConnected) returnFocus.focus();
  }
  function open() {
    ensureOverlay();
    returnFocus = document.activeElement;
    overlay.hidden = false;
    if (accessToken) loadWorkspace();
    else renderLogin();
  }
  function content(html) {
    ensureOverlay();
    overlay.querySelector("#saas-content").innerHTML = html;
  }
  function errorBox(text) {
    const box = overlay?.querySelector("[data-saas-error]");
    if (box) box.textContent = text;
  }

  function renderLogin(error = "") {
    content(
      '<p class="eyebrow">SILLON · ESPACE ENTREPRISE</p>' +
      '<h2 id="saas-title">Connexion</h2>' +
      '<p class="saas-intro">Accédez à votre espace de travail multi-entreprises.</p>' +
      '<form id="saas-login" class="saas-form">' +
      '<label>Adresse e-mail<input name="email" type="email" autocomplete="username" maxlength="254" required></label>' +
      '<label>Mot de passe<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="1024" required></label>' +
      '<button class="chip-btn primary" type="submit">Se connecter</button>' +
      '<p class="saas-error" data-saas-error role="alert">' + esc(error) + '</p></form>' +
      '<p class="saas-note">Les comptes sont actuellement créés par l’administrateur du projet. La création publique de comptes et les invitations ne sont pas encore activées.</p>' +
      '<p class="saas-note"><strong>Préversion technique :</strong> ne saisissez pas de données d’entreprise sensibles avant validation complète de la sécurité et configuration du projet Supabase.</p>'
    );
    overlay.querySelector('input[name="email"]')?.focus();
  }

  async function loadWorkspace(error = "") {
    content(
      '<p class="eyebrow">SILLON · ESPACE ENTREPRISE</p>' +
      '<h2 id="saas-title">Votre espace</h2>' +
      '<div class="saas-user"><span>' + esc(user?.email || "Compte connecté") + '</span><button class="linkish" type="button" data-saas-logout>Déconnexion</button></div>' +
      '<p class="saas-note"><strong>Préversion :</strong> ces dossiers cloud sont séparés de vos données locales actuelles. La synchronisation/import du dossier existant n’est pas encore activée. Évitez les données sensibles.</p>' +
      '<div class="saas-error" data-saas-error role="alert">' + esc(error) + '</div>' +
      '<div class="saas-section-head"><h3>Organisations</h3><button class="chip-btn" type="button" data-saas-reload>Actualiser</button></div>' +
      '<div id="saas-orgs" class="saas-list"><p class="saas-muted">Chargement…</p></div>' +
      '<form id="saas-create-org" class="saas-inline"><label>Créer une organisation<input name="name" maxlength="160" minlength="2" placeholder="Nom de l’entreprise" required></label><button class="chip-btn primary" type="submit">Créer</button></form>' +
      '<div id="saas-dossiers"></div>'
    );
    try {
      organizations = await api("organizations");
      renderOrganizations();
    } catch (e) { errorBox(message(e)); }
  }

  function renderOrganizations() {
    const box = overlay.querySelector("#saas-orgs");
    if (!box) return;
    if (!organizations.length) {
      box.innerHTML = '<p class="saas-muted">Aucune organisation pour le moment. Créez votre première organisation ci-dessous.</p>';
      return;
    }
    box.innerHTML = organizations.map((org) =>
      '<button class="saas-row ' + (selectedOrg?.id === org.id ? "selected" : "") + '" type="button" data-saas-org="' + esc(org.id) + '">' +
      '<span>' + esc(org.name) + '</span><small>' + (org.created_at ? new Date(org.created_at).toLocaleDateString("fr-FR") : "—") + '</small></button>'
    ).join("");
  }

  async function selectOrganization(id) {
    selectedOrg = organizations.find((o) => o.id === id) || null;
    dossiers = [];
    renderOrganizations();
    const target = overlay.querySelector("#saas-dossiers");
    if (!selectedOrg || !target) return;
    target.innerHTML = '<div class="saas-section-head"><h3>' + esc(selectedOrg.name) + '</h3></div><p class="saas-muted">Chargement des dossiers…</p>';
    try {
      dossiers = await api("dossiers", { query: "organization_id=" + encodeURIComponent(id) });
      renderDossiers();
    } catch (e) { target.innerHTML = '<p class="saas-error">' + esc(message(e)) + '</p>'; }
  }

  function renderDossiers() {
    const target = overlay.querySelector("#saas-dossiers");
    if (!target || !selectedOrg) return;
    const rows = dossiers.length ? dossiers.map((d) =>
      '<div class="saas-row dossier-row"><span>' + esc(d.name) + '</span><small>V' + esc(d.version) + ' · ' +
      (d.updated_at ? new Date(d.updated_at).toLocaleDateString("fr-FR") : "—") + '</small></div>'
    ).join("") : '<p class="saas-muted">Aucun dossier dans cette organisation.</p>';
    target.innerHTML =
      '<div class="saas-section-head"><h3>' + esc(selectedOrg.name) + ' · Dossiers</h3></div>' +
      '<div class="saas-list">' + rows + '</div>' +
      '<form id="saas-create-dossier" class="saas-inline"><label>Nouveau dossier<input name="name" maxlength="160" value="Nouveau dossier RSE" required></label><button class="chip-btn primary" type="submit">Créer le dossier</button></form>';
  }

  document.addEventListener("click", async (e) => {
    const openBtn = e.target.closest("[data-saas-open]");
    if (openBtn) { open(); return; }
    if (!overlay || overlay.hidden) return;
    if (e.target.closest("[data-saas-reload]")) { await loadWorkspace(); return; }
    const orgBtn = e.target.closest("[data-saas-org]");
    if (orgBtn) { await selectOrganization(orgBtn.dataset.saasOrg); return; }
    if (e.target.closest("[data-saas-logout]")) {
      try { await auth("logout"); } catch { /* le cookie est supprimé côté navigateur si le serveur répond */ }
      clearSession(); renderLogin("Vous êtes déconnecté."); return;
    }
  });

  document.addEventListener("submit", async (e) => {
    const form = e.target;
    if (form.id === "saas-login") {
      e.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true; errorBox("");
      try {
        const r = await auth("login", { email: form.elements.email.value, password: form.elements.password.value });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.code || "login_failed");
        setSession(data);
        await loadWorkspace();
      } catch (err) { renderLogin(message(err)); }
      return;
    }
    if (form.id === "saas-create-org") {
      e.preventDefault();
      try {
        const created = await api("organizations", { method: "POST", body: { name: form.elements.name.value } });
        await loadWorkspace();
        if (created?.id) await selectOrganization(created.id);
      } catch (err) { errorBox(message(err)); }
      return;
    }
    if (form.id === "saas-create-dossier") {
      e.preventDefault();
      if (!selectedOrg) return;
      try {
        await api("dossiers", { method: "POST", body: { organization_id: selectedOrg.id, name: form.elements.name.value, payload: {} } });
        await selectOrganization(selectedOrg.id);
      } catch (err) { errorBox(message(err)); }
    }
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay && !overlay.hidden) close(); });
  refreshSession().catch(() => clearSession());
})();
