// Garde-fous du cœur : aucune passerelle ne doit attribuer automatiquement une preuve ou un point RSE.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = {
  window: {},
  matchMedia: () => ({ matches: false }),
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout, clearTimeout, fetch: async () => new Response(""),
  URL, console, crypto: { getRandomValues: (a) => a },
};
vm.createContext(ctx);
for (const file of ["referentiels.js", "copilots.js", "i18n.js", "core.js"]) {
  vm.runInContext(readFileSync(new URL("../" + file, import.meta.url), "utf8"), ctx, { filename: file });
}
const SX = ctx.window.SX;

test("aucune passerelle ne crédite automatiquement une exigence RSE", () => {
  assert.deepEqual(Array.from(SX.LINKS), []);
  const allUsed = Object.fromEntries(SX.copilots.map((cp) => [cp.id, true]));
  SX.setState({ ...SX.blank(), used: allUsed });
  for (const cp of SX.copilots) {
    const { applied } = SX.resolved(cp);
    assert.deepEqual(Object.keys(applied), [], cp.id + " ne doit recevoir aucune preuve implicite");
  }
});

test("un résultat source ne modifie pas les réponses du copilote destinataire", () => {
  const source = SX.byId["bilan-carbone"];
  const target = SX.byId["reporting-vsme"];
  const state = { ...SX.blank(), used: { "bilan-carbone": true } };
  SX.setState(state);
  const before = JSON.stringify(SX.defaults(target));
  const after = JSON.stringify(SX.resolved(target).v);
  assert.equal(after, before);
  assert.ok(source && target);
});
