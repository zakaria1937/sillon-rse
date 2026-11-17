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
