// Le site est publié depuis la racine du dépôt : vérifier que le code serveur, le schéma SQL,
// les tests et les archives ne sont jamais servis publiquement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const toml = await readFile(new URL("../netlify.toml", import.meta.url), "utf8");
const blocked = [...toml.matchAll(/\[\[redirects\]\]\s+from = "([^"]+)"\s+to = "[^"]+"\s+status = 404\s+force = true/g)].map((m) => m[1]);

test("le code serveur, les migrations, les tests et les archives renvoient 404", () => {
  for (const path of ["/netlify/*", "/supabase/*", "/tests/*", "/docs/*", "/sillon-v5/*", "/sillon-v4.zip", "/package.json", "/claude.mjs", "/shared.mjs"]) {
    assert.ok(blocked.includes(path), `${path} doit être bloqué dans netlify.toml`);
  }
});

test("aucun fichier chargé par le site n'est bloqué", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const used = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => "/" + m[1].replace(/^\//, ""));
  for (const url of used) {
    const hit = blocked.find((b) => (b.endsWith("/*") ? url.startsWith(b.slice(0, -1)) : url === b));
    assert.equal(hit, undefined, `${url} est utilisé par index.html mais bloqué par ${hit}`);
  }
});
