// Le relief de l'accueil : grille IGN RGE ALTI de 128 × 100 points (octet = 1 + altitude / 2 m, 0 = mer).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const g = fs.readFileSync(new URL("../assets/normandie.bin", import.meta.url));
const W = 128, H = 100, B = [-1.95, 48.15, 1.85, 50.10];
const at = (lon, lat) => g[Math.round(((B[3] - lat) / (B[3] - B[1])) * (H - 1)) * W + Math.round(((lon - B[0]) / (B[2] - B[0])) * (W - 1))];
test("la grille a la bonne taille et des altitudes plausibles pour la Normandie", () => {
  assert.equal(g.length, W * H);
  const max = Math.max(...g) * 2 - 2;
  assert.ok(max > 300 && max < 420, `point culminant ${max} m`);
});
test("la mer et la terre sont au bon endroit", () => {
  assert.equal(at(-0.6, 49.9), 0, "la Manche au large de Caen");
  assert.ok(at(0.9, 49.3) > 0, "le plateau de Rouen est terrestre");
  assert.ok(at(-0.2, 48.6) * 2 > 150, "les collines de Normandie (Écouves) dépassent 150 m");
});
