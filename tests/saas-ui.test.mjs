import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const source = await readFile(new URL("../saas.js", import.meta.url), "utf8");

test("espace entreprise : le script navigateur est syntaxiquement valide", () => {
  assert.doesNotThrow(() => new Script(source, { filename: "saas.js" }));
});

test("espace entreprise : l'access token reste en mémoire et le refresh passe par le cookie HttpOnly", () => {
  assert.match(source, /refreshSession/);
  assert.match(source, /credentials:\s*"same-origin"/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test("espace entreprise : l'interface prévient que la synchronisation et la préversion sont limitées", () => {
  assert.match(source, /data-saas-open/);
  assert.match(source, /Préversion/);
  assert.match(source, /synchronisation\/import du dossier existant n’est pas encore activée/);
});

test("espace entreprise : les données dynamiques affichées sont échappées", () => {
  assert.match(source, /const esc =/);
  assert.match(source, /textContent = text/);
});


test("espace entreprise : attend la vérification initiale de session avant de choisir l'écran", () => {
  assert.match(source, /sessionReady = refreshSession\(\)/);
  assert.match(source, /if \(sessionReady\) await sessionReady/);
});

test("le renouvellement de session est mutualisé pour éviter la rotation concurrente des refresh tokens", () => {
  assert.match(source, /if \(refreshInFlight\) return refreshInFlight/);
  assert.match(source, /refreshInFlight = \(async \(\) =>/);
  assert.match(source, /finally \{\s*refreshInFlight = null/);
});

test("l'espace entreprise replace le focus dans la fenêtre après chargement", () => {
  assert.match(source, /overlay\.querySelector\("\[data-saas-logout\]"\)\?\.focus\(\)/);
});

test("le rôle affiché dans l'organisation provient de l'adhésion retournée par l'API", () => {
  assert.match(source, /api\("memberships"/);
  assert.match(source, /memberships\.find\(\(m\) => m\.user_id === user\?\.id\)/);
  assert.match(source, /Votre rôle :/);
});

test("le rôle lecteur ne voit pas le formulaire de création de dossier", () => {
  assert.match(source, /const canEdit = ownMembership && \["admin", "rse_lead", "contributor"\]\.includes\(ownMembership\.role\)/);
  assert.match(source, /Accès en lecture seule/);
});


test("seul un administrateur voit les commandes de gestion des rôles", () => {
  assert.match(source, /const canManageMembers = ownMembership\?\.role === "admin"/);
  assert.match(source, /saas-member-role/);
  assert.match(source, /api\("memberships",\s*\{\s*method: "PATCH"/);
  assert.match(source, /organization_id: selectedOrg\.id, user_id: form\.dataset\.saasMember, role: form\.elements\.role\.value/);
});


test("le journal d'activité est réservé aux administrateurs et responsables RSE", () => {
  assert.match(source, /const canReadAudit = ownMembership && \["admin", "rse_lead"\]\.includes\(ownMembership\.role\)/);
  assert.match(source, /api\("audits"/);
  assert.match(source, /Activité récente/);
  assert.match(source, /dossier\.created/);
  assert.match(source, /membership\.role_changed/);
});


test("seul un administrateur voit la commande de retrait, avec confirmation et RPC DELETE", () => {
  assert.match(source, /data-saas-remove-member/);
  assert.match(source, /Retirer ce membre de l’organisation/);
  assert.match(source, /method: "DELETE"/);
  assert.match(source, /membership\.removed/);
  assert.match(source, /memberId === user\?\.id/);
});


test("l'import local vers le cloud est volontaire, ponctuel, limité et exclut les conversations et coordonnées", () => {
  assert.match(source, /data-saas-import-local/);
  assert.match(source, /window\.SX\.state\(\)/);
  assert.match(source, /delete payload\.chat/);
  assert.match(source, /delete payload\.contact/);
  assert.match(source, /300000/);
  assert.match(source, /Copie ponctuelle/);
});


test("l'interface expose la récupération et le changement de mot de passe sans persister le jeton", () => {
  assert.match(source, /data-saas-recover/);
  assert.match(source, /id="saas-recover"/);
  assert.match(source, /id="saas-update-password"/);
  assert.match(source, /auth\("recover"/);
  assert.match(source, /auth\("update-password"/);
  assert.match(source, /history\.replaceState/);
  assert.match(source, /recoveryAccessToken/);
});
