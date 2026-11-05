/**
 * Membangun data spasial aplikasi dari dataset penelitian (folder SKRIPSI/Dataset).
 *
 * Jalankan:  node scripts/build-spatial-data.mjs [path-ke-folder-Dataset]
 * Default path: ../Dataset  (relatif terhadap root project)
 *
 * Output (di-commit agar aplikasi tidak bergantung pada folder Dataset saat runtime):
 *   data/generated/districts.json    -> batas 6 kecamatan (poligon) + penduduk BPS + luas + kepadatan
 *   data/generated/competitors.json  -> kedai kopi eksisting (dataset kompetitor 2025)
 *   data/generated/roads.json        -> jaringan jalan utama OSM (disederhanakan)
 *   data/generated/crowd.json        -> pusat keramaian OSM
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATASET = path.resolve(process.argv[2] ?? path.join(ROOT, '..', 'Dataset'));
const OUT = path.join(ROOT, 'data', 'generated');

const POPULATION_YEAR = 2025; // tahun data BPS terbaru pada dataset
const ROAD_SIMPLIFY_METERS = 4; // toleransi penyederhanaan garis jalan
const r6 = (n) => Math.round(n * 1e6) / 1e6;

// ---------- util CSV (mendukung field ber-quote & multiline) ----------
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const readCsv = (f) => parseCsv(fs.readFileSync(path.join(DATASET, f), 'utf8'));
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(DATASET, f), 'utf8'));

// ---------- geometri ----------
const M_PER_DEG_LAT = 111320;
function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lng) !== (yj > lng) && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function ringAreaKm2(ring) {
  const lat0 = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const kx = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [la1, ln1] = ring[j], [la2, ln2] = ring[i];
    a += ln1 * kx * (la2 * M_PER_DEG_LAT) - ln2 * kx * (la1 * M_PER_DEG_LAT);
  }
  return Math.abs(a) / 2 / 1e6;
}
function ringCentroid(ring) {
  return [r6(ring.reduce((s, p) => s + p[0], 0) / ring.length), r6(ring.reduce((s, p) => s + p[1], 0) / ring.length)];
}
// Douglas-Peucker pada koordinat [lat,lng] dengan toleransi meter
function simplify(pts, tolM) {
  if (pts.length <= 2) return pts;
  const lat0 = pts[0][0];
  const kx = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const P = pts.map(([la, ln]) => [ln * kx, la * M_PER_DEG_LAT]);
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0, idx = -1;
    const [x1, y1] = P[s], [x2, y2] = P[e];
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
    for (let i = s + 1; i < e; i++) {
      let t = len2 ? ((P[i][0] - x1) * dx + (P[i][1] - y1) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(P[i][0] - (x1 + t * dx), P[i][1] - (y1 + t * dy));
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tolM && idx > 0) { keep[idx] = true; stack.push([s, idx], [idx, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// ---------- 1. Kecamatan: poligon + BPS ----------
const DISTRICT_META = {
  'BOGOR TENGAH': { id: 'bogor_tengah', name: 'Bogor Tengah', color: '#3B82F6' },
  'BOGOR TIMUR': { id: 'bogor_timur', name: 'Bogor Timur', color: '#10B981' },
  'BOGOR UTARA': { id: 'bogor_utara', name: 'Bogor Utara', color: '#8B5CF6' },
  'BOGOR SELATAN': { id: 'bogor_selatan', name: 'Bogor Selatan', color: '#F59E0B' },
  'BOGOR BARAT': { id: 'bogor_barat', name: 'Bogor Barat', color: '#EC4899' },
  'TANAH SAREAL': { id: 'tanah_sareal', name: 'Tanah Sareal', color: '#06B6D4' },
};
const popRows = readCsv(path.join('jumlah_penduduk_di_kota_bogor_2', 'jumlah_penduduk_di_kota_bogor_2.csv'));
const population = {};
for (const r of popRows) {
  if (Number(r.tahun) === POPULATION_YEAR) population[r.bps_nama_kecamatan.trim().toUpperCase()] = Number(r.jumlah_penduduk);
}
function parseWktRings(wkt) {
  // MULTIPOLYGON (((lat lng, lat lng, ...)),((...))) -> daftar ring luar [lat,lng][]
  const polys = wkt.match(/\(\(\([^)]*\)\)/g) ?? [];
  return polys.map((p) =>
    p.replace(/\(/g, '').replace(/\)/g, '').split(',').map((pair) => {
      const [a, b] = pair.trim().split(/\s+/).map(Number);
      return [a, b];
    })
  );
}
const districts = [];
for (const r of readCsv('ADMINISTRASI_KOTABOGOR_KECAMATAN.csv')) {
  // File batas wilayah mengeja "Tanah Sereal", BPS & aplikasi memakai "Tanah Sareal"
  const key = r.NAME_3.trim().toUpperCase().replace('SEREAL', 'SAREAL');
  const meta = DISTRICT_META[key];
  if (!meta) throw new Error(`Kecamatan tidak dikenal: ${r.NAME_3}`);
  const rings = parseWktRings(r.geom);
  if (rings.length !== 1) throw new Error(`${r.NAME_3}: diharapkan 1 poligon, ditemukan ${rings.length}`);
  // WKT dataset berurutan (lat lng). Pastikan benar-benar berada di sekitar Bogor.
  const ring = simplify(rings[0], 2).map(([a, b]) => [r6(a), r6(b)]);
  if (Math.abs(ring[0][0] + 6.6) > 0.5 || Math.abs(ring[0][1] - 106.8) > 0.5) throw new Error(`${r.NAME_3}: urutan koordinat tidak sesuai`);
  const pop = population[key];
  if (!pop) throw new Error(`Penduduk ${POPULATION_YEAR} untuk ${key} tidak ditemukan`);
  const area = ringAreaKm2(ring);
  districts.push({
    ...meta,
    population: pop,
    areaKm2: Math.round(area * 100) / 100,
    density: Math.round(pop / area),
    center: ringCentroid(ring),
    coordinates: [ring],
  });
}
const order = Object.values(DISTRICT_META).map((m) => m.id);
districts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
const districtOf = (lat, lng) => districts.find((d) => pointInRing(lat, lng, d.coordinates[0]))?.name ?? null;

// ---------- 2. Kompetitor (kedai kopi) ----------
// Kompetitor = Kaggle (dibersihkan) + OSM, digabung oleh scripts/merge-osm-competitors.mjs.
// Bila berkas gabungan belum ada, pakai dataset Kaggle saja.
const MERGED = fs.existsSync(path.join(DATASET, 'competitors_merged.csv'));
const catByName = new Map(readCsv('list_coffee_shops_in_kota_bogor.csv').map((r) => [r.location_name.trim(), r.category.trim()]));
const competitors = [];
let droppedComp = 0;
for (const r of readCsv(MERGED ? 'competitors_merged.csv' : 'competitors_cleaned.csv')) {
  const lat = Number(r.latitude), lng = Number(r.longitude);
  const district = districtOf(lat, lng);
  if (!district) { droppedComp++; continue; } // di luar batas Kota Bogor
  competitors.push({
    id: `comp_${competitors.length + 1}`,
    name: r.name.trim(),
    lat: r6(lat),
    lng: r6(lng),
    district,
    address: r.address.trim(),
    category: r.category || catByName.get(r.name.trim()) || 'Coffee shop',
    source: r.source || 'kaggle',
  });
}

// ---------- 3. Jalan utama OSM ----------
// trunk = jalan nasional (Pajajaran, Sholeh Iskandar, Tajur, ...), dari scripts/import-osm-trunk-roads.mjs
const ROAD_TYPE = { trunk: 'arterial', primary: 'arterial', secondary: 'collector', tertiary: 'secondary' };
const roads = [];
const roadFeatures = [
  ...readJson('jalan_utama_bogor.geojson').features,
  ...(fs.existsSync(path.join(DATASET, 'jalan_trunk_bogor.geojson')) ? readJson('jalan_trunk_bogor.geojson').features : []),
];
for (const f of roadFeatures) {
  const type = ROAD_TYPE[f.properties.road_type];
  if (!type) continue;
  const pts = f.geometry.coordinates.map(([lng, lat]) => [lat, lng]); // GeoJSON [lng,lat] -> [lat,lng]
  const s = simplify(pts, ROAD_SIMPLIFY_METERS).map(([a, b]) => [r6(a), r6(b)]);
  roads.push({ id: `road_${f.properties.osm_id}`, name: f.properties.name || 'Jalan tanpa nama', type, coordinates: s });
}

// ---------- 4. Pusat keramaian OSM ----------
const crowd = [];
const crowdFeatures = [
  ...readJson('pusat_keramaian_bogor.geojson').features,
  // kampus, rumah sakit, perkantoran instansi (scripts/import-osm-crowd-extra.mjs)
  ...(fs.existsSync(path.join(DATASET, 'pusat_keramaian_tambahan.geojson')) ? readJson('pusat_keramaian_tambahan.geojson').features : []),
];
for (const f of crowdFeatures) {
  const [lng, lat] = f.geometry.coordinates;
  const district = districtOf(lat, lng);
  if (!district) continue;
  crowd.push({
    id: `crowd_${f.properties.osm_id}`,
    name: f.properties.name || `${f.properties.category} (tanpa nama)`,
    category: f.properties.category,
    lat: r6(lat),
    lng: r6(lng),
    district,
  });
}

fs.mkdirSync(OUT, { recursive: true });
const write = (n, d) => fs.writeFileSync(path.join(OUT, n), JSON.stringify(d));
write('districts.json', districts);
write('competitors.json', competitors);
write('roads.json', roads);
write('crowd.json', crowd);

const kb = (n) => (fs.statSync(path.join(OUT, n)).size / 1024).toFixed(0) + ' KB';
console.log(`Kecamatan   : ${districts.length}`);
for (const d of districts) console.log(`   ${d.name.padEnd(14)} ${String(d.population).padStart(7)} jiwa  ${String(d.areaKm2).padStart(6)} km²  ${String(d.density).padStart(6)} jiwa/km²`);
console.log(`Kompetitor  : ${competitors.length} (kaggle ${competitors.filter((c) => c.source === 'kaggle').length} + osm ${competitors.filter((c) => c.source === 'osm').length}; dibuang di luar kota: ${droppedComp})  ${kb('competitors.json')}`);
console.log(`Jalan       : ${roads.length} segmen, ${roads.reduce((s, r) => s + r.coordinates.length, 0)} titik  ${kb('roads.json')}`);
console.log(`Keramaian   : ${crowd.length}  ${kb('crowd.json')}`);
