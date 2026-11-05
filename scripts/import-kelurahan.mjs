/**
 * Mengimpor 68 kelurahan Kota Bogor (batas + penduduk) ke tabel `villages`, lalu membangun ulang grid.
 * C2 (kepadatan penduduk) kemudian dihitung per kelurahan, bukan per kecamatan.
 *
 *  - Penduduk : Dataset/penduduk_kelurahan_simdata_2026s1.csv
 *               (SIMDATA Disdukcapil Kota Bogor, Semester I 2026; sudah dicocokkan 68/68 dengan API resmi)
 *  - Batas    : OpenStreetMap, relasi boundary=administrative admin_level=7 di dalam Kota Bogor
 *               (cache Dataset/kelurahan_osm_raw.json)
 *
 * Prasyarat: supabase/villages.sql sudah dijalankan.
 * Jalankan:  node --env-file=.env scripts/import-kelurahan.mjs [path-folder-Dataset] [--offline] [--dry-run] [--no-rebuild]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const OFFLINE = args.includes('--offline');
const DRY = args.includes('--dry-run');
const NO_REBUILD = args.includes('--no-rebuild');
const positional = args.filter((a) => !a.startsWith('--'));
const DATASET = path.resolve(positional[0] ?? path.join(__dirname, '..', '..', 'Dataset'));
const CSV = path.join(DATASET, 'penduduk_kelurahan_simdata_2026s1.csv');
const RAW = path.join(DATASET, 'kelurahan_osm_raw.json');

// Relasi OSM Kota Bogor (admin_level=5) -> area id = 3600000000 + id relasi
const QUERY = `[out:json][timeout:180];area(3614745927)->.city;
rel["boundary"="administrative"]["admin_level"="7"](area.city);out geom;`;
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  const [h, ...b] = rows;
  return b.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}

const norm = (s) => String(s).toUpperCase().replace(/[^A-Z]/g, '');

async function loadOsm() {
  if (OFFLINE) return JSON.parse(fs.readFileSync(RAW, 'utf8'));
  for (let attempt = 0; attempt < 4; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'kopispasial-bogor-thesis/1.0' },
        body: 'data=' + encodeURIComponent(QUERY),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const osm = await res.json();
      fs.writeFileSync(RAW, JSON.stringify(osm));
      return osm;
    } catch (err) {
      console.warn(`Overpass ${url} gagal (${err.message}), mencoba lagi...`);
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
  throw new Error('Overpass tidak dapat dihubungi; jalankan ulang nanti atau pakai --offline');
}

const pop = parseCsv(fs.readFileSync(CSV, 'utf8'));
const osm = await loadOsm();
const rels = osm.elements.filter((e) => e.type === 'relation' && e.tags?.admin_level === '7');
if (rels.some((r) => !r.members?.length)) throw new Error('Relasi OSM tanpa anggota (geometri); hapus cache kelurahan_osm_raw.json lalu jalankan tanpa --offline');
const byName = new Map(rels.map((r) => [norm(r.tags.name), r]));

const features = [];
const missing = [];
for (const p of pop) {
  const rel = byName.get(norm(p.kelurahan));
  if (!rel) { missing.push(p.kelurahan); continue; }
  const lines = (rel.members ?? [])
    .filter((m) => m.type === 'way' && (m.geometry?.length ?? 0) >= 2)
    .map((m) => m.geometry.map((g) => [g.lon, g.lat]));
  features.push({
    code: p.kode_wilayah,
    name: p.kelurahan,
    district: p.kecamatan,
    population: Number(p.jumlah_penduduk),
    male: Number(p.laki_laki),
    female: Number(p.perempuan),
    period: p.periode,
    source: p.sumber,
    official_area: p.luas_resmi_km2 ? Number(p.luas_resmi_km2) : null,
    osm_id: rel.id,
    geometry: JSON.stringify({ type: 'MultiLineString', coordinates: lines }),
  });
}
const unused = rels.filter((r) => !pop.some((p) => norm(p.kelurahan) === norm(r.tags.name))).map((r) => r.tags.name);
console.log(`Penduduk: ${pop.length} kelurahan | Relasi OSM: ${rels.length} | cocok: ${features.length}`);
if (missing.length) throw new Error(`Kelurahan tanpa batas OSM: ${missing.join(', ')}`);
if (unused.length) console.warn(`Relasi OSM tidak terpakai: ${unused.join(', ')}`);
if (DRY) process.exit(0);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env');
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: result, error } = await supabase.rpc('import_villages', { features });
if (error) throw new Error(`import_villages gagal (sudah menjalankan supabase/villages.sql?): ${error.message}`);
console.log('Impor kelurahan:', result);

if (!NO_REBUILD) {
  const { data: cell } = await supabase.from('app_settings').select('value').eq('key', 'cell_meters').maybeSingle();
  const cellM = Number(cell?.value ?? 300) || 300;
  const t0 = Date.now();
  const { data: n, error: rebErr } = await supabase.rpc('rebuild_grid_points', { cell_m: cellM });
  if (rebErr) throw new Error(`rebuild_grid_points gagal: ${rebErr.message}`);
  console.log(`grid_points dibangun ulang (sel ${cellM} m): ${n} titik, ${Date.now() - t0} ms.`);
}
