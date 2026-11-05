/**
 * Mengisi zona terlarang (restricted_zones) dari OpenStreetMap.
 *
 * Prasyarat: supabase/zones_osm.sql sudah dijalankan.
 * Jalankan:  node --env-file=.env scripts/import-osm-zones.mjs [path-folder-Dataset] [--offline zones_osm_raw.json]
 *
 * Alur:
 *   1. Ambil objek OSM di sekitar Kota Bogor lewat Overpass API (atau berkas cache --offline):
 *        pemakaman      landuse=cemetery, amenity=grave_yard                (area)
 *        keamanan       landuse=military, military=*, amenity=police        (area kompleks)
 *        kenegaraan     Istana Bogor (government=presidency) & Kebun Raya Bogor (kawasan konservasi)
 *        sempadan       waterway=river -> koridor di kiri-kanan garis tengah sungai
 *        badan air      natural=water (danau, situ, kolam, alur sungai berbentuk area)
 *      Objek titik (node) dilewati karena tidak punya luas.
 *   2. Kirim ke fungsi PostGIS import_osm_zones(): geometri digabung per objek/sungai, dipotong batas
 *      Kota Bogor, disederhanakan, lalu menggantikan zona OSM lama + 10 zona contoh lama.
 *      Zona buatan admin (source = manual) tidak disentuh.
 *   3. Tulis cadangan lokal data/generated/zones.json (dipakai bila database tidak terjangkau)
 *      dan simpan respons mentah OSM ke Dataset/zones_osm_raw.json (bukti sumber data).
 *
 * Lebar koridor sempadan dari GARIS TENGAH sungai (Permen PUPR No. 28/2015, sungai tidak bertanggul
 * di kawasan perkotaan: sempadan 10–30 m dari tepi; ditambah perkiraan setengah lebar badan sungai):
 *   Ciliwung & Cisadane (sungai besar)  30 m      sungai lain  15 m
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const offIdx = args.indexOf('--offline');
const offlineFile = offIdx >= 0 ? args[offIdx + 1] : null;
const positional = args.filter((a, i) => !a.startsWith('--') && (offIdx < 0 || i !== offIdx + 1));
const DATASET = path.resolve(positional[0] ?? path.join(ROOT, '..', 'Dataset'));
const RAW_FILE = path.join(DATASET, 'zones_osm_raw.json');

const BBOX = '-6.6631,106.7335,-6.5204,106.8528'; // S,W,N,E sekitar Kota Bogor (dipotong poligon kota di database)
const BIG_RIVERS = new Set(['ciliwung', 'cisadane']);
const BUFFER_BIG = 30;
const BUFFER_SMALL = 15;

const QUERY = `[out:json][timeout:180];
(
  nwr["landuse"="cemetery"](${BBOX});
  nwr["amenity"="grave_yard"](${BBOX});
  nwr["landuse"="military"](${BBOX});
  nwr["military"](${BBOX});
  nwr["amenity"="police"](${BBOX});
  nwr["government"="presidency"](${BBOX});
  nwr["name"="Kebun Raya Bogor"](${BBOX});
  way["waterway"="river"](${BBOX});
  nwr["natural"="water"](${BBOX});
);
out geom;`;

async function fetchOsm() {
  if (offlineFile) return JSON.parse(fs.readFileSync(path.resolve(offlineFile), 'utf8'));
  const mirrors = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (const url of mirrors) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'kopispasial-bogor-thesis/1.0' },
        body: 'data=' + encodeURIComponent(QUERY),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      fs.writeFileSync(RAW_FILE, JSON.stringify(json));
      return json;
    } catch (err) {
      console.warn(`Overpass ${url} gagal: ${err.message}`);
    }
  }
  throw new Error('Semua server Overpass gagal. Coba lagi nanti atau pakai --offline <berkas>.');
}

// "Sungai Ci Liwung" / "Ciliwung" / "Ci Liwung" -> "ciliwung"
const riverKey = (name) => name.toLowerCase().replace(/^(sungai|kali)\s+/, '').replace(/[^a-z0-9]/g, '');
const prettyRiver = (name) => name.replace(/^Sungai\s+/i, '').replace(/^Ci\s+(\w)/, (_, c) => 'Ci' + c.toLowerCase());

const lineOf = (geom) => geom.map((p) => [p.lon, p.lat]);
const isClosed = (g) => g.length >= 4 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;

function classify(e) {
  const t = e.tags ?? {};
  const name = t.name?.trim() || null;
  if (t.government === 'presidency' || /^Istana (Kepresidenan )?Bogor$/i.test(name ?? '')) {
    return { zone_type: 'palace_conservation', grp: 'istana_bogor', name: 'Istana Kepresidenan Bogor', desc: 'Kawasan Istana Kepresidenan (objek vital nasional). Sumber: OpenStreetMap.' };
  }
  if (name === 'Kebun Raya Bogor') {
    return { zone_type: 'palace_conservation', grp: 'kebun_raya_bogor', name, desc: 'Kawasan konservasi tumbuhan (kebun raya). Bukan lahan usaha komersial. Sumber: OpenStreetMap.' };
  }
  if (t.landuse === 'cemetery' || t.amenity === 'grave_yard') {
    return { zone_type: 'cemetery', grp: `${e.type}_${e.id}`, name, desc: `Area pemakaman (${t.landuse === 'cemetery' ? 'landuse=cemetery' : 'amenity=grave_yard'}). Sumber: OpenStreetMap.` };
  }
  if (t.landuse === 'military' || t.military) {
    return { zone_type: 'military_police', grp: `${e.type}_${e.id}`, name, desc: 'Kompleks militer (landuse=military). Sumber: OpenStreetMap.' };
  }
  if (t.amenity === 'police') {
    return { zone_type: 'military_police', grp: `${e.type}_${e.id}`, name, desc: 'Kompleks kantor kepolisian (amenity=police). Sumber: OpenStreetMap.' };
  }
  if (t.waterway === 'river') {
    const key = name ? riverKey(name) : '_';
    const buffer = BIG_RIVERS.has(key) ? BUFFER_BIG : BUFFER_SMALL;
    return {
      zone_type: 'water_body', grp: `sungai_${key}`, line: true, buffer,
      name: name ? `Sempadan Sungai ${prettyRiver(name)}` : 'Sempadan sungai lain (tanpa nama)',
      desc: `Koridor sempadan ${buffer} m dari garis tengah sungai (Permen PUPR No. 28/2015). Sumber: OpenStreetMap (waterway=river).`,
    };
  }
  if (t.natural === 'water') {
    // Alur sungai yang dipetakan sebagai area digabung dengan sempadan sungai yang sama
    if (t.water === 'river' && name) {
      const key = riverKey(name);
      return { zone_type: 'water_body', grp: `sungai_${key}`, name: `Sempadan Sungai ${prettyRiver(name)}`, desc: null };
    }
    return name
      ? { zone_type: 'water_body', grp: `air_${riverKey(name)}`, name, desc: `Badan air (${t.water ?? 'natural=water'}). Sumber: OpenStreetMap.` }
      : { zone_type: 'water_body', grp: 'air_lain', name: 'Badan air lain (kolam, situ, alur sungai)', desc: 'Kumpulan badan air tanpa nama (natural=water). Sumber: OpenStreetMap.' };
  }
  return null;
}

const raw = await fetchOsm();
const features = [];
const skipped = { node: 0, open: 0, other: 0 };
for (const e of raw.elements ?? []) {
  const c = classify(e);
  if (!c) { skipped.other++; continue; }
  if (e.type === 'node') { skipped.node++; continue; }
  const ref = `${e.type}/${e.id}`;
  const base = { grp: c.grp, name: c.name, zone_type: c.zone_type, ref, desc: c.desc };
  if (e.type === 'way') {
    if (c.line) {
      if ((e.geometry?.length ?? 0) < 2) continue;
      features.push({ ...base, kind: 'line', buffer_m: c.buffer, geometry: JSON.stringify({ type: 'LineString', coordinates: lineOf(e.geometry) }) });
    } else if (isClosed(e.geometry ?? [])) {
      features.push({ ...base, kind: 'area', geometry: JSON.stringify({ type: 'Polygon', coordinates: [lineOf(e.geometry)] }) });
    } else skipped.open++;
  } else if (e.type === 'relation') {
    const lines = (e.members ?? []).filter((m) => m.type === 'way' && (m.geometry?.length ?? 0) >= 2).map((m) => lineOf(m.geometry));
    if (lines.length) features.push({ ...base, kind: 'rel', geometry: JSON.stringify({ type: 'MultiLineString', coordinates: lines }) });
  }
}
// Deskripsi grup diambil dari anggota pertama yang punya deskripsi
const descOf = new Map();
for (const f of features) if (f.desc && !descOf.has(f.grp)) descOf.set(f.grp, f.desc);
for (const f of features) f.desc = descOf.get(f.grp) ?? f.desc;

console.log(`OSM: ${raw.elements?.length ?? 0} objek -> ${features.length} geometri (dilewati: ${skipped.node} titik, ${skipped.open} garis tak tertutup, ${skipped.other} lain)`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env');
const supabase = createClient(url, key, { auth: { persistSession: false } });

const probe = await supabase.from('restricted_zones').select('geom,source,osm_ref').limit(1);
if (probe.error) throw new Error(`Kolom geom/source/osm_ref belum ada. Jalankan supabase/zones_osm.sql dulu. (${probe.error.message})`);

const { data: result, error } = await supabase.rpc('import_osm_zones', { features });
if (error) throw new Error(`import_osm_zones gagal: ${error.message}`);
console.log(`Zona lama dihapus: ${result.removed}, zona OSM ditambahkan: ${result.added}`);

// Cadangan lokal (format sama dengan lib/spatial-db.ts -> zoneFromRow)
const r6 = (n) => Math.round(n * 1e6) / 1e6;
const rows = [];
for (let from = 0; ; from += 500) {
  const { data, error: e2 } = await supabase.from('restricted_zones').select('*').order('name').range(from, from + 499);
  if (e2) throw new Error(e2.message);
  rows.push(...data);
  if (data.length < 500) break;
}
const zones = rows.map((z) => {
  const radius = z.radius_m == null ? null : Number(z.radius_m);
  const polys = !radius && z.geom ? (z.geom.type === 'MultiPolygon' ? z.geom.coordinates : [z.geom.coordinates]) : null;
  return {
    id: z.id, name: z.name, type: z.zone_type, typeLabel: z.type_label, description: z.description ?? '',
    center: [Number(z.latitude), Number(z.longitude)], radiusMeters: radius,
    ...(polys ? { shape: polys.map((p) => p.map((ring) => ring.map(([x, y]) => [r6(y), r6(x)]))) } : {}),
    source: z.source ?? 'manual', osmRef: z.osm_ref ?? null,
  };
});
const out = path.join(ROOT, 'data', 'generated', 'zones.json');
fs.writeFileSync(out, JSON.stringify(zones));

const byType = {};
for (const z of zones) byType[z.type] = (byType[z.type] ?? 0) + 1;
const vertices = zones.reduce((s, z) => s + (z.shape ?? []).reduce((a, p) => a + p.reduce((b, r) => b + r.length, 0), 0), 0);
console.log('Zona per jenis:', byType);
console.log(`data/generated/zones.json: ${zones.length} zona, ${vertices} titik sudut, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
