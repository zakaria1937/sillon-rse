// Sillon — espace entreprise (préversion). Les access tokens restent uniquement en mémoire.
(() => {
  let accessToken = null, user = null, organizations = [], selectedOrg = null, dossiers = [], memberships = [], auditEvents = [], refreshTimer = 0;
  let overlay = null, returnFocus = null, sessionReady = null, refreshInFlight = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const auth = async (action, payload) => fetch("/api/auth?action=" + action, {
    method: "POST", credentials: "same-origin",
    headers: payload ? { "content-type": "application/json" } : {},
    body: payload ? JSON.stringify(payload) : undefined,
  });

  function clearSession() {
    accessToken = null; user = null; organizations = []; selectedOrg = null; dossiers = []; memberships = []; auditEvents = [];
    clearTimeout(refreshTimer);
  }
  function setSession(data) {
    accessToken = data.access_token;
    user = data.user;
    clearTimeout(refreshTimer);
    const delay = Math.max(30_000, ((Number(data.expires_in) || 3600) - 60) * 1000);
    refreshTimer = setTimeout(async () => {
      const ok = await refreshSession();
      if (!ok && overlay && !overlay.hidden) renderLogin("Votre session a expiré. Reconnectez-vous.");
    }, delay);
  }
  // Un seul renouvellement à la fois : Supabase fait tourner les refresh tokens.
  // Deux refresh simultanés avec le même ancien token pourraient invalider la session.
  function refreshSession() {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      try {
        const r = await auth("refresh");
        if (!r.ok) { clearSession(); return false; }
        const data = await r.json();
        if (!data.access_token) { clearSession(); return false; }
        setSession(data);
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
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
      rate_limit_not_configured: "La sécurité de connexion n’est pas complètement configurée. Contactez l’administrateur.",
      rate_limit_unavailable: "La protection contre les tentatives répétées est temporairement indisponible. Réessayez plus tard.",
      identity_unavailable: "Le service d’authentification est temporairement indisponible.",
      tenant_read_failed: "Impossible de charger les organisations.",
      organization_create_failed: "Impossible de créer cette organisation.",
      dossier_read_failed: "Impossible de charger les dossiers.",
      dossier_create_failed: "Impossible de créer le dossier.",
      dossier_change_failed: "Cette opération n’a pas été autorisée.",
      membership_role_update_failed: "Impossible de modifier ce rôle. Vérifiez vos droits et réessayez.",
      audit_read_failed: "Impossible de charger le journal d’activité de cette organisation.",
      last_admin_protected: "Cette organisation doit conserver au moins un administrateur. Attribuez d’abord ce rôle à une autre personne.",
      member_not_found: "Ce membre n’appartient plus à cette organisation.",
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
    overlay.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const items = [...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')]
        .filter((el) => !el.hidden && el.getAttribute("aria-hidden") !== "true");
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.body.appendChild(overlay);
  }
  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    if (returnFocus?.isConnected) returnFocus.focus();
  }
  async function open() {
    ensureOverlay();
    returnFocus = document.activeElement;
    overlay.hidden = false;
    // Évite d'afficher brièvement le formulaire de connexion à un utilisateur déjà connecté
    // lorsque la vérification du cookie de session est encore en cours au chargement.
    try { if (sessionReady) await sessionReady; } catch { clearSession(); }
    if (overlay.hidden) return;
    if (accessToken) await loadWorkspace();
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
      [dossiers, memberships] = await Promise.all([
        api("dossiers", { query: "organization_id=" + encodeURIComponent(id) }),
        api("memberships", { query: "organization_id=" + encodeURIComponent(id) }),
      ]);
      const own = memberships.find((m) => m.user_id === user?.id);
      auditEvents = own && ["admin", "rse_lead"].includes(own.role)
        ? await api("audits", { query: "organization_id=" + encodeURIComponent(id) })
        : [];
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
    const ownMembership = memberships.find((m) => m.user_id === user?.id);
    const roleNames = { admin: "Administrateur", rse_lead: "Responsable RSE", contributor: "Contributeur", reader: "Lecteur" };
    const canEdit = ownMembership && ["admin", "rse_lead", "contributor"].includes(ownMembership.role);
    const canManageMembers = ownMembership?.role === "admin";
    const canReadAudit = ownMembership && ["admin", "rse_lead"].includes(ownMembership.role);
    const memberRows = memberships.map((member) => {
      const label = member.user_id === user?.id ? "Vous" : "Membre " + member.user_id.slice(0, 8);
      const role = roleNames[member.role] || member.role;
      if (!canManageMembers) return '<div class="saas-row"><span>' + esc(label) + '</span><small>' + esc(role) + '</small></div>';
      const options = Object.entries(roleNames).map(([value, title]) =>
        '<option value="' + esc(value) + '"' + (member.role === value ? " selected" : "") + '>' + esc(title) + '</option>'
      ).join("");
      return '<form class="saas-inline saas-member-role" data-saas-member="' + esc(member.user_id) + '">' +
        '<label>' + esc(label) + '<select name="role">' + options + '</select></label>' +
        '<button class="chip-btn" type="submit">Modifier le rôle</button></form>';
    }).join("");
    const auditLabels = {
      "dossier.created": "Dossier créé", "dossier.updated": "Dossier modifié", "dossier.deleted": "Dossier supprimé",
      "membership.created": "Membre ajouté", "membership.role_changed": "Rôle modifié", "membership.removed": "Membre retiré",
    };
    const auditRows = auditEvents.map((event) => {
      const actor = event.actor_id ? event.actor_id.slice(0, 8) : "Système";
      const targetUser = event.target_user_id ? " · membre " + event.target_user_id.slice(0, 8) : "";
      const roleChange = event.previous_role || event.new_role
        ? " · " + (roleNames[event.previous_role] || event.previous_role || "—") + " → " + (roleNames[event.new_role] || event.new_role || "—")
        : "";
      const date = event.occurred_at ? new Date(event.occurred_at).toLocaleString("fr-FR") : "—";
      return '<div class="saas-row"><span>' + esc(auditLabels[event.event_type] || event.event_type) +
        esc(targetUser) + esc(roleChange) + '</span><small>' + esc(date) + ' · ' + esc(actor) + '</small></div>';
    }).join("") || '<p class="saas-muted">Aucune activité enregistrée.</p>';
    target.innerHTML =
      '<div class="saas-section-head"><h3>' + esc(selectedOrg.name) + ' · Dossiers</h3></div>' +
      (ownMembership ? '<p class="saas-muted">Votre rôle : <strong>' + esc(roleNames[ownMembership.role] || ownMembership.role) + '</strong></p>' : '') +
      '<div class="saas-list">' + rows + '</div>' +
      (canEdit
        ? '<form id="saas-create-dossier" class="saas-inline"><label>Nouveau dossier<input name="name" maxlength="160" value="Nouveau dossier RSE" required></label><button class="chip-btn primary" type="submit">Créer le dossier</button></form>'
        : '<p class="saas-note">Accès en lecture seule : votre rôle ne permet pas de créer ou modifier un dossier.</p>') +
      (memberships.length ? '<h4>Membres de l’organisation</h4><div class="saas-list">' + memberRows + '</div>' : '') +
      (canReadAudit ? '<h4>Activité récente</h4><div class="saas-list">' + auditRows + '</div>' : '');
  }

  document.addEventListener("click", async (e) => {
    const openBtn = e.target.closest("[data-saas-open]");
    if (openBtn) { await open(); return; }
    if (!overlay || overlay.hidden) return;
    if (e.target.closest("[data-saas-reload]")) { await loadWorkspace(); return; }
    const orgBtn = e.target.closest("[data-saas-org]");
    if (orgBtn) { await selectOrganization(orgBtn.dataset.saasOrg); return; }
    if (e.target.closest("[data-saas-logout]")) {
      try {
        const r = await auth("logout");
        if (!r.ok) throw new Error("logout_failed");
        clearSession(); renderLogin("Vous êtes déconnecté.");
      } catch {
        errorBox("La déconnexion n'a pas pu être confirmée par le serveur. Vérifiez votre connexion puis réessayez.");
      }
      return;
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
        overlay.querySelector("[data-saas-logout]")?.focus();
      } catch (err) { renderLogin(message(err)); }
      return;
    }
    if (form.id === "saas-create-org") {
      e.preventDefault();
      try {
        const created = await api("organizations", { method: "POST", body: { name: form.elements.name.value } });
        await loadWorkspace();
        overlay.querySelector("[data-saas-logout]")?.focus();
        if (created?.id) await selectOrganization(created.id);
      } catch (err) { errorBox(message(err)); }
      return;
    }
    if (form.classList.contains("saas-member-role")) {
      e.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        await api("memberships", {
          method: "PATCH",
          body: { organization_id: selectedOrg.id, user_id: form.dataset.saasMember, role: form.elements.role.value },
        });
        await selectOrganization(selectedOrg.id);
        errorBox("Rôle mis à jour.");
      } catch (err) {
        errorBox(message(err));
        submit.disabled = false;
      }
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
  sessionReady = refreshSession().catch(() => { clearSession(); return false; });
})();
