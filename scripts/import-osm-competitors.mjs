/**
 * Mengimpor kompetitor dari OpenStreetMap (competitors_osm_added.csv) ke tabel `competitors` di Supabase,
 * lalu membangun ulang grid_points lewat fungsi PostGIS rebuild_grid_points().
 *
 * Prasyarat: supabase/competitors_source.sql sudah dijalankan (kolom source/category/osm_id).
 * Jalankan:  node --env-file=.env scripts/import-osm-competitors.mjs [path-folder-Dataset]
 *
 * Idempotent: baris dengan source='osm' dihapus lebih dulu, lalu diisi ulang. Baris Kaggle tidak disentuh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET = path.resolve(process.argv[2] ?? path.join(__dirname, '..', '..', 'Dataset'));

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env');
const supabase = createClient(url, key, { auth: { persistSession: false } });

const rows = parseCsv(fs.readFileSync(path.join(DATASET, 'competitors_osm_added.csv'), 'utf8'));
const records = rows.map((r) => ({
  name: r.name,
  address: r.address || null,
  latitude: Number(r.latitude),
  longitude: Number(r.longitude),
  geom: `SRID=4326;POINT(${r.longitude} ${r.latitude})`, // EWKT: (lng lat)
  business_type: 'coffee_shop',
  source: 'osm',
  category: r.category,
  osm_id: r.osm_id,
}));

// Pengaman: kolom baru harus sudah ada
const probe = await supabase.from('competitors').select('source,category,osm_id').limit(1);
if (probe.error) throw new Error(`Kolom source/category/osm_id belum ada. Jalankan supabase/competitors_source.sql dulu. (${probe.error.message})`);

const del = await supabase.from('competitors').delete().eq('source', 'osm');
if (del.error) throw new Error(`Gagal membersihkan baris OSM lama: ${del.error.message}`);

for (let i = 0; i < records.length; i += 100) {
  const { error } = await supabase.from('competitors').insert(records.slice(i, i + 100));
  if (error) throw new Error(`Gagal insert batch ${i}: ${error.message}`);
}
console.log(`Diimpor ${records.length} kompetitor OSM.`);

const { data: n, error: rebErr } = await supabase.rpc('rebuild_grid_points', { cell_m: 300 });
if (rebErr) throw new Error(`rebuild_grid_points gagal: ${rebErr.message}`);
console.log(`grid_points dibangun ulang: ${n} titik.`);

const by = {};
const { data: all } = await supabase.from('competitors').select('source,business_type');
for (const r of all ?? []) by[`${r.source}/${r.business_type}`] = (by[`${r.source}/${r.business_type}`] ?? 0) + 1;
console.log('competitors di database:', by);
