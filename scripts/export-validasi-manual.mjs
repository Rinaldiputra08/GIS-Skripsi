/**
 * Ekspor bahan validasi perhitungan manual AHP-TOPSIS (Bab IV).
 *
 * Menjalankan kode perhitungan yang SAMA dengan aplikasi (lib/ahp.ts, lib/topsis.ts) pada data
 * grid_points terkini di Supabase, lalu menyimpan masukan dan keluarannya apa adanya (tanpa
 * pembulatan). Berkas ini menjadi "keluaran sistem" yang dibandingkan dengan hitungan Excel.
 *
 * Jalankan:  node --env-file=.env scripts/export-validasi-manual.mjs
 * Keluaran : ../Dokumen-Skripsi-KopiSpasial/04-validasi/keluaran-sistem-ahp-topsis.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOC_ROOT = process.env.SKRIPSI_DOCS || path.join(__dirname, '..', '..', 'Dokumen-Skripsi-KopiSpasial');
const OUT = path.join(DOC_ROOT, '04-validasi', 'keluaran-sistem-ahp-topsis.json');
const jiti = createJiti(import.meta.url, { alias: { '@': ROOT } });

const { buildAhpMatrix, calculateAhp, AHP_PRESETS, RANDOM_INDEX_TABLE } = await jiti.import(path.join(ROOT, 'lib/ahp.ts'));
const { calculateTopsis } = await jiti.import(path.join(ROOT, 'lib/topsis.ts'));
const { getSettings } = await jiti.import(path.join(ROOT, 'lib/settings.ts'));
const { loadSettings } = await jiti.import(path.join(ROOT, 'lib/settings-db.ts'));
const { loadGridFromDb } = await jiti.import(path.join(ROOT, 'lib/spatial-db.ts'));

await loadSettings();
const settings = getSettings();
const grid = await loadGridFromDb({ fresh: true });
if (!grid) throw new Error('grid_points tidak terbaca dari Supabase');

const feasible = grid.filter((c) => !c.isRestricted);
const restricted = grid.filter((c) => c.isRestricted);

const presets = AHP_PRESETS.map((p) => {
  const matrix = buildAhpMatrix(p.pairs);
  const ahp = calculateAhp(matrix);
  const t = calculateTopsis(grid, ahp.weightsArray);
  const byId = {};
  for (const c of t.candidates) {
    if (c.rank > 0) byId[c.id] = { score: c.score, rank: c.rank, category: c.category, dPlus: c.dPlus, dMinus: c.dMinus, r: c.r, y: c.y };
  }
  return {
    id: p.id, label: p.label, pairs: p.pairs, matrix,
    weights: ahp.weightsArray, lambdaMax: ahp.lambdaMax, ci: ahp.ci, cr: ahp.cr, isConsistent: ahp.isConsistent,
    divisors: t.divisors, idealPositive: t.idealPositive, idealNegative: t.idealNegative,
    tierCutoffs: t.tierCutoffs, results: byId,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  source: 'Supabase grid_points + lib/ahp.ts + lib/topsis.ts',
  settings,
  ri: RANDOM_INDEX_TABLE[4],
  counts: { total: grid.length, feasible: feasible.length, restricted: restricted.length },
  // urutan = urutan masukan TOPSIS di aplikasi (selatan ke utara, barat ke timur)
  feasible: feasible.map((c) => ({
    id: c.id, lat: c.lat, lng: c.lng, district: c.district, village: c.village ?? null,
    c1: c.c1_dist_competitor, c2: c.c2_density, c3: c.c3_dist_road, c4: c.c4_dist_crowd,
  })),
  presets,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report));
console.log(`total ${grid.length} | layak ${feasible.length} | terlarang ${restricted.length}`);
for (const p of presets) {
  console.log(`${p.id.padEnd(18)} w=${p.weights.map((w) => w.toFixed(4)).join('/')} CR=${p.cr} λ=${p.lambdaMax.toFixed(6)}`);
}
console.log('Ditulis:', OUT);
