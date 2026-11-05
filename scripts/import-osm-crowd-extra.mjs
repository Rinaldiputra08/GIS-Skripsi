/**
 * Menambah kategori pusat keramaian (C4) dari OpenStreetMap: kampus, rumah sakit, dan perkantoran instansi.
 *
 * Latar belakang: dataset pusat_keramaian_bogor.geojson hanya berisi mal, supermarket, pasar, taman,
 * atraksi, terminal, dan stasiun (62 titik dalam kota). Sumber pembeli kedai kopi yang besar, yaitu
 * mahasiswa dan pekerja kantor, belum terwakili.
 *
 * Aturan seleksi (agar dapat dipertanggungjawabkan, bukan semua POI):
 *  - university : amenity=university|college. Laboratorium, lapangan, gerbang, dan balai penelitian dibuang.
 *  - hospital   : amenity=hospital yang bernama RS / RSU / RSUD / RSIA / Rumah Sakit / Hospital.
 *                 Puskesmas, klinik, dan praktik dokter dibuang (skala pengunjung kecil).
 *  - office     : kantor instansi tingkat kota/provinsi/pusat dan BUMN besar (Balai Kota, DPRD, Dinas,
 *                 Badan, Kementerian, Pengadilan, Kejaksaan, Imigrasi, KPP, BPJS, Samsat, balai/pusat
 *                 penelitian, PLN, Telkom). Kantor kelurahan/desa/kecamatan/RW dibuang.
 *  - Sekolah TIDAK dimasukkan: ±1.300 titik (mayoritas SD/TK) akan membuat C4 hampir seragam di seluruh kota.
 *  - Objek sekategori yang berjarak < 300 m digabung menjadi satu titik (mis. beberapa gedung satu kampus).
 *  - Titik di luar Kota Bogor tetap disimpan, tetapi otomatis tidak dipakai (view v_crowd_centers).
 *
 * Jalankan:  node --env-file=.env scripts/import-osm-crowd-extra.mjs [path-folder-Dataset] [--offline] [--dry-run]
 *   --offline : pakai cache Dataset/pusat_keramaian_tambahan_raw.json (tanpa Overpass)
 *   --dry-run : hanya tampilkan hasil seleksi, tidak menulis ke database
 * Keluaran   : Dataset/pusat_keramaian_tambahan.geojson (format sama dengan pusat_keramaian_bogor.geojson)
 * Idempotent : baris source='osm' dengan kategori university/hospital/office dihapus dulu, lalu diisi ulang.
 *              Titik buatan admin (source='manual') tidak disentuh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const OFFLINE = args.includes('--offline');
const DRY = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));
const DATASET = path.resolve(positional[0] ?? path.join(__dirname, '..', '..', 'Dataset'));
const RAW = path.join(DATASET, 'pusat_keramaian_tambahan_raw.json');
const OUT = path.join(DATASET, 'pusat_keramaian_tambahan.geojson');

const BBOX = '-6.6871,106.7335,-6.5204,106.8528';
const QUERY = `[out:json][timeout:120];(
  nwr["amenity"~"^(university|college|hospital|townhall|courthouse)$"](${BBOX});
  nwr["office"~"^(government|company)$"](${BBOX});
);out center tags;`;

export const CATEGORIES = ['university', 'hospital', 'office'];
const MERGE_M = 300;

async function loadRaw() {
  if (OFFLINE) return JSON.parse(fs.readFileSync(RAW, 'utf8'));
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'kopispasial-bogor-thesis/1.0' },
    body: 'data=' + encodeURIComponent(QUERY),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const osm = await res.json();
  fs.writeFileSync(RAW, JSON.stringify(osm));
  return osm;
}

const UNI_EXCLUDE = /(pintu|gerbang|lapangan|\blab\b|balai besar penelitian|^sma|^smk)/i;
const HOSP_INCLUDE = /^(rs|rsu|rsud|rsia|rskia|rsau|rumah sakit)\b|hospital/i;
const HOSP_EXCLUDE = /(pintu|igd)/i;
const OFFICE_INCLUDE = /(balai kota|dprd|dinas|badan|direktorat|kement|kejaksaan|pengadilan|imigrasi|\bkpp\b|kpknl|pelelangan|bpjs|samsat|pamong praja|bpbd|kesatuan bangsa|psda|pusdiklat|pusat penelitian|balai (besar|penelitian|riset|latihan|pengujian|pengelola)|\bpln\b|telkom)/i;
const OFFICE_EXCLUDE = /(kelurahan|desa|kecamatan|\brw\b|rumah dinas|posyandu|puskesmas|pos polisi|istana|\bkua\b|ciawi|kab\.?\s?bogor|kabupaten)/i;

function classify(t) {
  const name = (t.name ?? '').trim();
  if (!name) return null;
  if (t.amenity === 'university' || t.amenity === 'college') return UNI_EXCLUDE.test(name) ? null : 'university';
  if (t.amenity === 'hospital') return HOSP_INCLUDE.test(name) && !HOSP_EXCLUDE.test(name) ? 'hospital' : null;
  if (t.office === 'government' || t.office === 'company' || t.amenity === 'townhall' || t.amenity === 'courthouse') {
    if (t.amenity === 'courthouse' && /pengadilan/i.test(name)) return 'office';
    return OFFICE_INCLUDE.test(name) && !OFFICE_EXCLUDE.test(name) ? 'office' : null;
  }
  return null;
}

function haversine(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const osm = await loadRaw();
const picked = [];
for (const e of osm.elements) {
  const t = e.tags ?? {};
  const category = classify(t);
  if (!category) continue;
  const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
  if (lat == null || lng == null) continue;
  // Poligon (way/relation) diutamakan sebagai wakil kelompok: titik tengahnya mewakili seluruh kompleks
  picked.push({ osm_id: e.id, osm_type: e.type, name: t.name.trim(), category, lat, lng, area: e.type !== 'node' });
}
picked.sort((a, b) => Number(b.area) - Number(a.area));

// Gabungkan objek sekategori yang berdekatan (< MERGE_M)
const kept = [];
for (const p of picked) {
  const dup = kept.find((k) => k.category === p.category && haversine(k, p) < MERGE_M);
  if (dup) { dup.merged.push(p.name); continue; }
  kept.push({ ...p, merged: [] });
}

const count = Object.fromEntries(CATEGORIES.map((c) => [c, kept.filter((k) => k.category === c).length]));
console.log(`Kandidat OSM: ${picked.length} objek -> ${kept.length} titik setelah penggabungan`, count);
for (const c of CATEGORIES) {
  console.log(`\n== ${c}`);
  for (const k of kept.filter((x) => x.category === c)) {
    console.log(`  ${k.name}${k.merged.length ? `  (+ ${k.merged.join(' | ')})` : ''}`);
  }
}

fs.writeFileSync(OUT, JSON.stringify({
  type: 'FeatureCollection',
  features: kept.map((k) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [k.lng, k.lat] },
    properties: { osm_id: k.osm_id, osm_type: k.osm_type, name: k.name, category: k.category },
  })),
}));
console.log(`\nDitulis: ${OUT}`);
if (DRY) process.exit(0);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env');
const supabase = createClient(url, key, { auth: { persistSession: false } });

const del = await supabase.from('crowd_centers').delete().eq('source', 'osm').in('category', CATEGORIES);
if (del.error) throw new Error(`Gagal menghapus data lama: ${del.error.message}`);

const rows = kept.map((k) => ({
  osm_id: k.osm_id, name: k.name, category: k.category, latitude: k.lat, longitude: k.lng, source: 'osm',
}));
for (let i = 0; i < rows.length; i += 100) {
  const { error } = await supabase.from('crowd_centers').insert(rows.slice(i, i + 100));
  if (error) throw new Error(`Gagal insert batch ${i}: ${error.message}`);
}
console.log(`Ditambahkan ${rows.length} titik ke crowd_centers.`);

const { data: cell } = await supabase.from('app_settings').select('value').eq('key', 'cell_meters').maybeSingle();
const cellM = Number(cell?.value ?? 300) || 300;
const { data: n, error: rebErr } = await supabase.rpc('rebuild_grid_points', { cell_m: cellM });
if (rebErr) throw new Error(`rebuild_grid_points gagal: ${rebErr.message}`);
console.log(`grid_points dibangun ulang (sel ${cellM} m): ${n} titik.`);
