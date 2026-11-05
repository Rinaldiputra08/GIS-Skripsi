/**
 * Menambahkan jalan nasional (OSM highway=trunk) ke tabel road_networks.
 *
 * Latar belakang: dataset jalan_utama_bogor.geojson hanya berisi primary/secondary/tertiary.
 * Di OpenStreetMap, jalan arteri terbesar Kota Bogor ditandai `trunk` (Jl. Raya Pajajaran,
 * Sholeh Iskandar, KH Abdullah bin Nuh, Jl. Raya Tajur, Jl. Raya Bogor, Jl. Raya Sukabumi, Dramaga),
 * sehingga sebelumnya tidak ikut dihitung pada C3 (jarak ke jalan utama).
 * Jalan tol (motorway) sengaja TIDAK dimasukkan: tidak dapat diakses langsung dari lahan usaha.
 *
 * Jalankan:  node --env-file=.env scripts/import-osm-trunk-roads.mjs [path-folder-Dataset] [--offline jalan_trunk_bogor.geojson]
 * Keluaran : Dataset/jalan_trunk_bogor.geojson (format sama dengan jalan_utama_bogor.geojson)
 * Idempotent: baris road_type='trunk' dihapus dulu, lalu diisi ulang.
 * Setelah itu: jalankan supabase/roads_trunk.sql (view v_main_roads) lalu bangun ulang grid.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const offIdx = args.indexOf('--offline');
const offlineFile = offIdx >= 0 ? args[offIdx + 1] : null;
const positional = args.filter((a, i) => !a.startsWith('--') && (offIdx < 0 || i !== offIdx + 1));
const DATASET = path.resolve(positional[0] ?? path.join(__dirname, '..', '..', 'Dataset'));
const OUT = path.join(DATASET, 'jalan_trunk_bogor.geojson');

const BBOX = '-6.6871,106.7335,-6.5204,106.8528'; // sama dengan cakupan dataset jalan utama
const QUERY = `[out:json][timeout:90];way["highway"="trunk"](${BBOX});out tags geom;`;

async function loadGeojson() {
  if (offlineFile) return JSON.parse(fs.readFileSync(path.resolve(offlineFile), 'utf8'));
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'kopispasial-bogor-thesis/1.0' },
    body: 'data=' + encodeURIComponent(QUERY),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const osm = await res.json();
  const fc = {
    type: 'FeatureCollection',
    features: osm.elements
      .filter((e) => e.type === 'way' && (e.geometry?.length ?? 0) >= 2)
      .map((e) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: e.geometry.map((p) => [p.lon, p.lat]) },
        properties: { osm_id: e.id, name: e.tags?.name ?? null, road_type: 'trunk' },
      })),
  };
  fs.writeFileSync(OUT, JSON.stringify(fc));
  return fc;
}

const fc = await loadGeojson();
console.log(`Jalan trunk OSM: ${fc.features.length} ruas -> ${OUT}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env');
const supabase = createClient(url, key, { auth: { persistSession: false } });

const del = await supabase.from('road_networks').delete().eq('road_type', 'trunk');
if (del.error) throw new Error(`Gagal menghapus trunk lama: ${del.error.message}`);

const rows = fc.features.map((f) => ({
  osm_id: f.properties.osm_id,
  name: f.properties.name,
  road_type: 'trunk',
  geom: `SRID=4326;LINESTRING(${f.geometry.coordinates.map(([x, y]) => `${x} ${y}`).join(',')})`,
}));
for (let i = 0; i < rows.length; i += 100) {
  const { error } = await supabase.from('road_networks').insert(rows.slice(i, i + 100));
  if (error) throw new Error(`Gagal insert batch ${i}: ${error.message}`);
}
const names = [...new Set(fc.features.map((f) => f.properties.name).filter(Boolean))].sort();
console.log(`Ditambahkan ${rows.length} ruas trunk ke road_networks. Nama jalan: ${names.join(', ')}`);
