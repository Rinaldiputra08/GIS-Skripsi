/**
 * Validasi & analisis sensitivitas model AHP-TOPSIS (bahan Bab 4).
 *
 * Memakai kode perhitungan yang SAMA dengan aplikasi (lib/ahp.ts, lib/topsis.ts, lib/settings.ts,
 * lib/spatial-db.ts) melalui jiti, dan data grid_points terkini di Supabase.
 *
 * A. Validasi sisi permintaan (C2-C4)
 *    Kedai kopi eksisting adalah bukti lapangan bahwa suatu lokasi punya pasar. Bila C2-C4 benar-benar
 *    mengukur potensi pasar, kedai eksisting seharusnya lebih sering berada di sel berpotensi tinggi
 *    daripada yang diharapkan secara acak. C1 sengaja dinolkan pada uji ini: C1 mengukur jarak ke kedai
 *    itu sendiri, sehingga sel tempat kedai berada pasti dinilai rendah oleh C1 (bias sirkular).
 *    Ukuran: proporsi kedai per kelas vs proporsi sel (15/35/50%) -> lift = observasi / harapan.
 *    Dijalankan untuk data C4 lama (tanpa kampus/RS/kantor) dan baru, sebagai pembanding.
 * B. Validasi popularitas: korelasi Spearman antara jumlah ulasan Google (Kaggle, 86 kedai) dan V_i
 *    sisi permintaan pada sel kedai.
 * C. Perilaku model penuh (C1-C4): seberapa jauh rekomendasi bergeser dari kedai eksisting (celah pasar).
 * D. Sensitivitas: (1) antar preset, (2) perubahan bobot satu-per-satu ±10% dan ±20%,
 *    (3) batas jenuh C1 (0/500/800/1200/1600 m).
 *
 * Jalankan:  node --env-file=.env scripts/validate-model.mjs
 * Keluaran : docs/validasi/hasil-validasi.md dan docs/validasi/hasil-validasi.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'validasi');
const jiti = createJiti(import.meta.url, { alias: { '@': ROOT } });

const { buildAhpMatrix, calculateAhp, AHP_PRESETS } = await jiti.import(path.join(ROOT, 'lib/ahp.ts'));
const { calculateTopsis } = await jiti.import(path.join(ROOT, 'lib/topsis.ts'));
const { applySettings, getSettings } = await jiti.import(path.join(ROOT, 'lib/settings.ts'));
const { loadSettings } = await jiti.import(path.join(ROOT, 'lib/settings-db.ts'));
const { loadGridFromDb } = await jiti.import(path.join(ROOT, 'lib/spatial-db.ts'));
const { getSupabaseAdmin } = await jiti.import(path.join(ROOT, 'lib/supabase.ts'));

const NEW_CROWD = new Set(['university', 'hospital', 'office']);

// ---------------- util ----------------
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371008.8, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function ranks(arr) {
  const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(arr.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}
function pearson(a, b) {
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db);
}
const spearman = (a, b) => pearson(ranks(a), ranks(b));
/** Nilai-p dua sisi Spearman (pendekatan distribusi t, df = n-2) */
function spearmanP(rho, n) {
  const t = rho * Math.sqrt((n - 2) / (1 - rho * rho));
  return 2 * (1 - studentT(Math.abs(t), n - 2));
}
function studentT(t, df) { // CDF t-Student via fungsi beta tak lengkap
  const x = df / (df + t * t);
  return 1 - 0.5 * betaInc(x, df / 2, 0.5);
}
function betaInc(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const lbeta = lgamma(a + b) - lgamma(a) - lgamma(b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b + lbeta);
  if (x < (a + 1) / (a + b + 2)) return (front * cf(x, a, b)) / a;
  return 1 - (front * cf(1 - x, b, a)) / b;
}
function cf(x, a, b) {
  let c = 1, d = 1 - ((a + b) * x) / (a + 1); d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; c = 1 + aa / c; d = 1 / d; h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; c = 1 + aa / c; d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return h;
}
function lgamma(z) {
  const g = 7, p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1; let x = p[0];
  for (let i = 1; i < g + 2; i++) x += p[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
/** Uji binomial satu sisi (pendekatan normal): P(X >= k) dengan X ~ Bin(n, p) */
function binomUpperP(k, n, p) {
  const mu = n * p, sd = Math.sqrt(n * p * (1 - p));
  const z = (k - 0.5 - mu) / sd;
  return 0.5 * erfc(z / Math.SQRT2);
}
function erfc(x) {
  const t = 1 / (1 + 0.5 * Math.abs(x));
  const y = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? y : 2 - y;
}
const jaccard = (a, b) => { const A = new Set(a), B = new Set(b); let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const f = (x, d = 3) => Number(x).toFixed(d);
const fp = (p) => (p < 0.001 ? '< 0,001' : f(p, 3)).replace('.', ',');

// ---------------- data ----------------
await loadSettings();
const BASE_SETTINGS = { ...getSettings() };
const grid = await loadGridFromDb({ fresh: true });
if (!grid) throw new Error('grid_points tidak tersedia');
const db = getSupabaseAdmin();
async function fetchAll(view, cols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(view).select(cols).range(from, from + 999);
    if (error) throw new Error(`${view}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
const shops = await fetchAll('v_competitors', 'id,name,latitude,longitude,total_reviews,source');
const crowd = await fetchAll('v_crowd_centers', 'name,category,latitude,longitude');
const oldCrowd = crowd.filter((c) => !NEW_CROWD.has(c.category));
const districtDensity = new Map((await fetchAll('v_districts', 'name,density')).map((d) => [d.name, Number(d.density)]));
const villageCount = (await fetchAll('v_villages', 'code')).length;

// C4 versi lama (tanpa kampus/RS/kantor) untuk pembanding; batas bawah sama dengan pipeline
const gridOldC4 = grid.map((g) => {
  let best = Infinity;
  for (const c of oldCrowd) best = Math.min(best, haversine(g.lat, g.lng, c.latitude, c.longitude));
  return { ...g, c4_dist_crowd: Math.max(BASE_SETTINGS.floorC4, Math.round(best)) };
});
// C2 versi kecamatan (BPS) untuk pembanding; grid aktif memakai C2 per kelurahan
const toKecC2 = (cands) => cands.map((g) => ({ ...g, c2_density: districtDensity.get(g.district) ?? g.c2_density }));
const gridKecC2 = toKecC2(grid);          // C4 baru, C2 kecamatan
const gridBaseline = toKecC2(gridOldC4);  // C4 lama, C2 kecamatan (kondisi awal)
const c2IsVillage = villageCount > 0 && new Set(grid.map((g) => g.c2_density)).size > districtDensity.size;

// Petakan kedai ke sel grid layak terdekat (maks. setengah diagonal sel)
const feasible = grid.filter((g) => !g.isRestricted);
const maxSnap = (BASE_SETTINGS.cellMeters * Math.SQRT2) / 2 + 1;
const shopCells = [];
for (const s of shops) {
  let best = null, bd = Infinity;
  for (const g of feasible) {
    const d = haversine(s.latitude, s.longitude, g.lat, g.lng);
    if (d < bd) { bd = d; best = g; }
  }
  if (best && bd <= maxSnap) shopCells.push({ ...s, cellId: best.id });
}

function presetWeights(p) {
  const ahp = calculateAhp(buildAhpMatrix(p.pairs));
  return { w: ahp.weightsArray, cr: ahp.cr };
}
const demandOnly = (w) => { const s = w[1] + w[2] + w[3]; return [0, w[1] / s, w[2] / s, w[3] / s]; };
function run(cands, w, settings = BASE_SETTINGS) {
  applySettings(settings);
  const res = calculateTopsis(cands, w);
  applySettings(BASE_SETTINGS);
  const ranked = res.candidates.filter((c) => c.rank > 0);
  return { ranked, byId: new Map(ranked.map((c) => [c.id, c])) };
}
function tierShare(byId) {
  const n = { high: 0, medium: 0, low: 0 };
  for (const s of shopCells) n[byId.get(s.cellId).category]++;
  return n;
}

const presets = AHP_PRESETS.map((p) => ({ id: p.id, label: p.label, ...presetWeights(p) }));
const report = { generatedAt: new Date().toISOString(), settings: BASE_SETTINGS, counts: {
  gridPoints: grid.length, feasible: feasible.length, shops: shops.length, shopsMapped: shopCells.length,
  shopsWithReviews: shopCells.filter((s) => s.total_reviews != null).length,
  crowdOld: oldCrowd.length, crowdNew: crowd.length, villages: villageCount, c2DistinctValues: new Set(grid.map((g) => g.c2_density)).size,
} };
const md = [];
md.push('# Hasil Validasi & Analisis Sensitivitas Model AHP-TOPSIS', '');
md.push(`Dibuat otomatis oleh \`scripts/validate-model.mjs\` pada ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.`, '');
md.push(`Data: ${grid.length} titik grid (${feasible.length} layak, sel ${BASE_SETTINGS.cellMeters} m), ${shops.length} kedai kopi eksisting di Kota Bogor (${shopCells.length} terpetakan ke sel layak), pusat keramaian ${oldCrowd.length} titik (lama) / ${crowd.length} titik (baru, + kampus, rumah sakit, perkantoran). Kelas: ${BASE_SETTINGS.tierHighPct}% teratas tinggi, ${BASE_SETTINGS.tierMediumPct}% berikutnya sedang. Batas jenuh C1 ${BASE_SETTINGS.c1Cap} m. C2: ${c2IsVillage ? `kepadatan per kelurahan (${villageCount} kelurahan, ${report.counts.c2DistinctValues} nilai berbeda)` : 'kepadatan per kecamatan'}.`, '');
md.push('Konfigurasi data yang dibandingkan: **awal** = C4 tanpa kampus/RS/kantor + C2 per kecamatan; **C4 baru** = + kampus, rumah sakit, perkantoran; **C4 + C2 kelurahan** = konfigurasi akhir yang dipakai aplikasi.', '');
const CONFIGS = c2IsVillage
  ? [['awal', gridBaseline], ['C4 baru', gridKecC2], ['C4 + C2 kelurahan', grid]]
  : [['awal', gridBaseline], ['C4 baru', grid]];

// ---------------- A ----------------
const expHigh = BASE_SETTINGS.tierHighPct / 100, expMed = BASE_SETTINGS.tierMediumPct / 100;
md.push('## A. Validasi sisi permintaan (C2–C4)', '');
md.push('Kedai eksisting dipakai sebagai bukti lapangan adanya pasar. Bobot C1 dinolkan (C1 diukur dari kedai itu sendiri sehingga bias), bobot C2–C4 mengikuti preset lalu dinormalisasi. Harapan acak: ' +
  `${pct(expHigh, 0)} kedai di kelas tinggi, ${pct(expMed, 0)} di sedang. Lift = proporsi observasi ÷ harapan acak (> 1 berarti model lebih baik dari acak).`, '');
md.push('| Preset | Data | Kedai di kelas tinggi | Lift tinggi | Kedai di tinggi+sedang | Lift tinggi+sedang | p (binomial) |', '|---|---|---|---|---|---|---|');
report.demand = [];
for (const p of presets) {
  const wd = demandOnly(p.w);
  for (const [label, cands] of CONFIGS) {
    const { byId } = run(cands, wd);
    const t = tierShare(byId), n = shopCells.length;
    const hi = t.high / n, hm = (t.high + t.medium) / n;
    const pHi = binomUpperP(t.high, n, expHigh);
    report.demand.push({ preset: p.id, config: label, weights: wd, ...t, n, liftHigh: hi / expHigh, liftHighMed: hm / (expHigh + expMed), pHigh: pHi });
    md.push(`| ${p.label} | ${label} | ${t.high}/${n} (${pct(hi)}) | ${f(hi / expHigh, 2)} | ${t.high + t.medium}/${n} (${pct(hm)}) | ${f(hm / (expHigh + expMed), 2)} | ${fp(pHi)} |`);
  }
}
md.push('');

// ---------------- B ----------------
md.push('## B. Validasi popularitas (jumlah ulasan Google, data Kaggle)', '');
md.push('Korelasi peringkat Spearman antara jumlah ulasan kedai dan V_i sisi permintaan pada sel kedai. Popularitas juga dipengaruhi faktor non-lokasi (harga, produk, promosi), sehingga korelasi lemah-sedang sudah wajar.', '');
md.push('| Preset | n | ρ Spearman | p | Median ulasan: kelas tinggi | sedang | rendah |', '|---|---|---|---|---|---|---|');
const reviewed = shopCells.filter((s) => s.total_reviews != null);
const median = (a) => { if (!a.length) return '-'; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
report.popularity = [];
for (const p of presets) {
  const { byId } = run(grid, demandOnly(p.w));
  const vi = reviewed.map((s) => byId.get(s.cellId).score);
  const rv = reviewed.map((s) => Number(s.total_reviews));
  const rho = spearman(vi, rv), pv = spearmanP(rho, reviewed.length);
  const byTier = (t) => reviewed.filter((s) => byId.get(s.cellId).category === t).map((s) => Number(s.total_reviews));
  const med = { high: median(byTier('high')), medium: median(byTier('medium')), low: median(byTier('low')) };
  report.popularity.push({ preset: p.id, n: reviewed.length, rho, p: pv, median: med, nTier: { high: byTier('high').length, medium: byTier('medium').length, low: byTier('low').length } });
  md.push(`| ${p.label} | ${reviewed.length} | ${f(rho)} | ${fp(pv)} | ${med.high} (n=${byTier('high').length}) | ${med.medium} (n=${byTier('medium').length}) | ${med.low} (n=${byTier('low').length}) |`);
}
md.push('');

// ---------------- C ----------------
md.push('## C. Perilaku model penuh (C1–C4): rekomendasi mengarah ke celah pasar', '');
md.push('Dengan C1 aktif, model sengaja menurunkan nilai sel yang sudah padat kedai. Tabel ini menunjukkan seberapa banyak kedai eksisting yang selnya tetap berkelas tinggi, dan jarak rata-rata sel kelas tinggi ke kedai terdekat.', '');
md.push('| Preset | Bobot C1/C2/C3/C4 | CR | Kedai di sel kelas tinggi | Median C1 sel kelas tinggi | Median C4 sel kelas tinggi | Median C1 semua sel |', '|---|---|---|---|---|---|---|');
const medOf = (arr, k) => median(arr.map((c) => Math.round(c[k])));
report.full = [];
const fullRuns = {};
for (const p of presets) {
  const r = run(grid, p.w); fullRuns[p.id] = r;
  const t = tierShare(r.byId), hi = r.ranked.filter((c) => c.category === 'high');
  report.full.push({ preset: p.id, weights: p.w, cr: p.cr, ...t, medC1High: medOf(hi, 'c1_dist_competitor'), medC4High: medOf(hi, 'c4_dist_crowd') });
  md.push(`| ${p.label} | ${p.w.map((x) => f(x, 3)).join(' / ')} | ${pct(p.cr, 2)} | ${t.high}/${shopCells.length} (${pct(t.high / shopCells.length)}) | ${medOf(hi, 'c1_dist_competitor')} m | ${medOf(hi, 'c4_dist_crowd')} m | ${medOf(r.ranked, 'c1_dist_competitor')} m |`);
}
md.push('');

// ---------------- D ----------------
const topIds = (ranked, k) => ranked.slice(0, k).map((c) => c.id);
const nHigh = (n) => Math.ceil((n * BASE_SETTINGS.tierHighPct) / 100);
function compare(base, other) {
  const ids = base.ranked.map((c) => c.id);
  const rho = spearman(ids.map((id) => base.byId.get(id).score), ids.map((id) => other.byId.get(id).score));
  const k = nHigh(base.ranked.length);
  const top10 = topIds(base.ranked, 10).filter((id) => topIds(other.ranked, 10).includes(id)).length;
  const changed = ids.filter((id) => base.byId.get(id).category !== other.byId.get(id).category).length / ids.length;
  return { rho, jaccardHigh: jaccard(topIds(base.ranked, k), topIds(other.ranked, k)), top10, tierChanged: changed };
}
md.push('## D. Analisis sensitivitas', '');
md.push('### D1. Antar preset bobot', '');
md.push('ρ = korelasi Spearman V_i seluruh sel layak; J = indeks Jaccard himpunan sel kelas tinggi (1 = identik).', '');
md.push(`| | ${presets.map((p) => p.id).join(' | ')} |`, `|---|${presets.map(() => '---').join('|')}|`);
report.presetPairs = [];
for (const a of presets) {
  const cells = presets.map((b) => {
    if (a.id === b.id) return '–';
    const c = compare(fullRuns[a.id], fullRuns[b.id]);
    report.presetPairs.push({ a: a.id, b: b.id, ...c });
    return `ρ ${f(c.rho, 2)} / J ${f(c.jaccardHigh, 2)}`;
  });
  md.push(`| ${a.id} | ${cells.join(' | ')} |`);
}
md.push('');

md.push('### D2. Perubahan bobot satu-per-satu (preset seimbang)', '');
md.push('Bobot satu kriteria diubah, bobot lain disesuaikan proporsional agar total tetap 1. Dibandingkan dengan hasil dasar.', '');
md.push('| Kriteria | Perubahan | Bobot baru | ρ Spearman | Jaccard kelas tinggi | 10 teratas tetap | Sel berganti kelas |', '|---|---|---|---|---|---|---|');
const base = fullRuns.balanced, bw = presets.find((p) => p.id === 'balanced').w;
report.oat = [];
for (let j = 0; j < 4; j++) {
  for (const d of [-0.2, -0.1, 0.1, 0.2]) {
    const nw = bw[j] * (1 + d), rest = 1 - bw[j];
    const w = bw.map((x, i) => (i === j ? nw : (x * (1 - nw)) / rest));
    const c = compare(base, run(grid, w));
    report.oat.push({ criterion: `C${j + 1}`, delta: d, weights: w, ...c });
    md.push(`| C${j + 1} | ${d > 0 ? '+' : ''}${d * 100}% | ${w.map((x) => f(x, 3)).join(' / ')} | ${f(c.rho)} | ${f(c.jaccardHigh, 2)} | ${c.top10}/10 | ${pct(c.tierChanged)} |`);
  }
}
md.push('');

md.push('### D3. Batas jenuh C1 (preset seimbang)', '');
md.push(`Pembanding: batas jenuh ${BASE_SETTINGS.c1Cap} m (nilai dipakai).`, '');
md.push('| Batas jenuh C1 | ρ Spearman | Jaccard kelas tinggi | 10 teratas tetap | Sel berganti kelas | Median C1 sel kelas tinggi | Median C4 sel kelas tinggi |', '|---|---|---|---|---|---|---|');
report.c1cap = [];
for (const cap of [0, 500, 800, 1200, 1600]) {
  const r = run(grid, bw, { ...BASE_SETTINGS, c1Cap: cap });
  const c = compare(base, r), hi = r.ranked.filter((x) => x.category === 'high');
  report.c1cap.push({ cap, ...c, medC1High: medOf(hi, 'c1_dist_competitor'), medC4High: medOf(hi, 'c4_dist_crowd') });
  md.push(`| ${cap === 0 ? 'nonaktif' : cap + ' m'} | ${f(c.rho)} | ${f(c.jaccardHigh, 2)} | ${c.top10}/10 | ${pct(c.tierChanged)} | ${medOf(hi, 'c1_dist_competitor')} m | ${medOf(hi, 'c4_dist_crowd')} m |`);
}
md.push('');

if (c2IsVillage) {
  md.push('### D4. Dampak C2 per kelurahan (dibanding C2 per kecamatan)', '');
  md.push('Data lain identik; hanya sumber C2 yang berbeda. Juga ditunjukkan korelasi Spearman C2 dengan kriteria lain pada sel layak (makin kecil makin independen).', '');
  md.push('| Preset | ρ Spearman | Jaccard kelas tinggi | 10 teratas tetap | Sel berganti kelas |', '|---|---|---|---|---|');
  report.c2Impact = [];
  for (const p of presets) {
    const c = compare(run(gridKecC2, p.w), fullRuns[p.id]);
    report.c2Impact.push({ preset: p.id, ...c });
    md.push(`| ${p.label} | ${f(c.rho)} | ${f(c.jaccardHigh, 2)} | ${c.top10}/10 | ${pct(c.tierChanged)} |`);
  }
  const fz = grid.filter((g) => !g.isRestricted), fzK = gridKecC2.filter((g) => !g.isRestricted);
  const col = (a, k) => a.map((g) => (k === 'c1' ? Math.min(g.c1_dist_competitor, BASE_SETTINGS.c1Cap || Infinity) : g[k]));
  const corrRow = (a) => ['c1', 'c3_dist_road', 'c4_dist_crowd'].map((k) => spearman(col(a, 'c2_density'), col(a, k)));
  const [kk, kv] = [corrRow(fzK), corrRow(fz)];
  report.c2Correlation = { kecamatan: kk, kelurahan: kv };
  md.push('', '| C2 | ρ(C2, C1) | ρ(C2, C3) | ρ(C2, C4) |', '|---|---|---|---|');
  md.push(`| per kecamatan | ${kk.map((x) => f(x, 2)).join(' | ')} |`, `| per kelurahan | ${kv.map((x) => f(x, 2)).join(' | ')} |`, '');
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'hasil-validasi.md'), md.join('\n'));
fs.writeFileSync(path.join(OUT_DIR, 'hasil-validasi.json'), JSON.stringify(report, null, 2));
console.log(md.join('\n'));
console.log(`\nDitulis: ${path.relative(ROOT, OUT_DIR)}/hasil-validasi.{md,json}`);
