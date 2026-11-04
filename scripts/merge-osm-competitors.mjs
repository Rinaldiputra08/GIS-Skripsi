/**
 * Menambah data kompetitor (kedai kopi) dari OpenStreetMap ke dataset Kaggle yang sudah dibersihkan.
 *
 * Jalankan:  node scripts/merge-osm-competitors.mjs [path-folder-Dataset] [--offline osm_raw.json]
 *
 * Alur:
 *   1. Ambil amenity=cafe (node & way) di Kota Bogor dari Overpass API (atau pakai berkas cache).
 *   2. Klasifikasi: hanya yang bernama & BUKAN jenis usaha lain (teh boba, es krim, jus, bakery, mi,
 *      karaoke, dsb). Nama yang jelas menyebut kopi selalu masuk.
 *   3. Buang duplikat: terhadap Kaggle (<= 50 m, atau <= 200 m dengan nama setara) dan sesama OSM (<= 30 m).
 *   4. Tulis (di folder Dataset):
 *        competitors_merged.csv    Kaggle + OSM  (kolom `source`: kaggle | osm)
 *        competitors_osm_added.csv hanya yang ditambahkan dari OSM
 *        competitors_osm_excluded.csv  yang dibuang beserta alasannya (lampiran skripsi)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const offlineIdx = args.indexOf('--offline');
const offlineFile = offlineIdx >= 0 ? args[offlineIdx + 1] : null;
const positional = args.filter((a, i) => !a.startsWith('--') && i !== offlineIdx + 1);
const DATASET = path.resolve(positional[0] ?? path.join(__dirname, '..', '..', 'Dataset'));

const BBOX = '-6.6631,106.7335,-6.5204,106.8528'; // S,W,N,E sekitar Kota Bogor
// Duplikat = tempat yang sama, BUKAN sekadar berdekatan (di mal banyak kedai kopi berbeda bertetangga):
//   nama setara DAN jarak <= SAME_NAME_M (menangkap node & way untuk tempat yang sama, serta
//   perbedaan penulisan nama). Kedai berbeda dalam satu gedung/mal tetap dihitung terpisah.
const SAME_NAME_M = 200;

// ---------- util ----------
const toRad = (d) => (d * Math.PI) / 180;
function haversine(a, b, c, d) {
  const R = 6371000, p1 = toRad(a), p2 = toRad(c), dp = p2 - p1, dl = toRad(d - b);
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
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
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = (cols, rows) => [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';

// ---------- klasifikasi ----------
// Nama yang jelas menyebut kopi -> selalu masuk
const COFFEE = /(coffee|coffe|kofie|kopi|kupi|kopitiam|warkop|espresso|roast|brew|barista|caffe|java|ngopi|seduh|cangkir|janji jiwa|starbucks|tomoro|bean spot|fore\b|tuku|maxx|flip)/i;
// Jenis usaha lain (bukan kedai kopi)
const NEGATIVE = [
  [/(chatime|mixue|bingxue|xiboba|boba|bubble|share ?tea|holly ?tea|menantea|your ?tea|es ?teh|es•teh|teguk|haus!?$|we drink|teh)/i, 'minuman teh/boba'],
  [/(ice ?cream|es ?krim|es ?oyen|es ?kul|raja softi|gelato)/i, 'es krim'],
  [/(juice|jus\b|salad)/i, 'jus/salad'],
  [/(bakery|roti|donut|j\.?co|auntie anne|tous les jours|waffle|klappertaart|picnicroll|kue)/i, 'bakery/kue'],
  [/(mie |ramen|gacoan|bakso|sekoteng|wedang|surabi|sholawat)/i, 'makanan/minuman tradisional non-kopi'],
  [/(karaoke|billiard|movie|sisha|studio|boutique|beauty|karaoke|palace|\bbar\b)/i, 'hiburan/jasa lain'],
  [/(susu|milk)/i, 'susu'],
  [/(kopyor)/i, 'kelapa kopyor'],
];
const BAD_CUISINE = /(bubble_tea|ice_cream|juice|fruit|dessert|italian|filipino|ramen|noodle)/i;

function classify(tags) {
  const name = (tags.name ?? '').trim();
  if (!name) return { keep: false, reason: 'tanpa nama' };
  const cuisine = tags.cuisine ?? '';
  const coffeeByName = COFFEE.test(name);
  const coffeeByCuisine = /(coffee|kopi)/i.test(cuisine);
  if (coffeeByName || coffeeByCuisine) return { keep: true, category: 'Coffee shop', reason: coffeeByName ? 'nama menyebut kopi' : 'cuisine=coffee' };
  for (const [re, why] of NEGATIVE) if (re.test(name)) return { keep: false, reason: why };
  if (BAD_CUISINE.test(cuisine)) return { keep: false, reason: `cuisine=${cuisine}` };
  return { keep: true, category: 'Cafe', reason: 'kafe umum (amenity=cafe)' };
}

const norm = (s) => {
  const raw = s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '');
  const core = s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\b(coffee|coffe|kopi|cafe|kafe|bogor|the|kedai|warung|by|and)\b/g, '').replace(/\s+/g, '');
  return core.length >= 3 ? core : raw;
};
// nama setara: sama, atau yang satu memuat yang lain (minimal 4 huruf)
const sameName = (a, b) => !!a && !!b && (a === b || (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a))));

// ---------- ambil data OSM ----------
async function fetchOsm() {
  if (offlineFile) return JSON.parse(fs.readFileSync(path.resolve(offlineFile), 'utf8')).elements;
  const q = `[out:json][timeout:90];(node["amenity"="cafe"](${BBOX});way["amenity"="cafe"](${BBOX}););out center tags;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': 'UPH_GIS_Research_Student/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: q }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return (await res.json()).elements;
}

const kaggle = parseCsv(fs.readFileSync(path.join(DATASET, 'competitors_cleaned.csv'), 'utf8'));
const kaggleCat = new Map(
  parseCsv(fs.readFileSync(path.join(DATASET, 'list_coffee_shops_in_kota_bogor.csv'), 'utf8')).map((r) => [r.location_name.trim(), r.category.trim()])
);
const kg = kaggle.map((r) => ({ name: r.name.trim(), lat: +r.latitude, lng: +r.longitude, n: norm(r.name) }));

const elements = await fetchOsm();
const candidates = elements
  .map((e) => ({
    osm_id: `${e.type}/${e.id}`,
    tags: e.tags ?? {},
    lat: e.lat ?? e.center?.lat,
    lng: e.lon ?? e.center?.lon,
  }))
  .filter((e) => e.lat != null && e.lng != null);

const added = [];
const excluded = [];
for (const c of candidates) {
  const cl = classify(c.tags);
  const base = { osm_id: c.osm_id, name: c.tags.name ?? '', latitude: c.lat, longitude: c.lng };
  if (!cl.keep) { excluded.push({ ...base, reason: cl.reason }); continue; }

  const n = norm(c.tags.name);
  // duplikat terhadap Kaggle
  const dk = kg.find((k) => {
    const d = haversine(c.lat, c.lng, k.lat, k.lng);
    return d <= SAME_NAME_M && sameName(n, k.n);
  });
  if (dk) { excluded.push({ ...base, reason: `duplikat Kaggle (${dk.name})` }); continue; }

  // duplikat sesama OSM (node & way untuk tempat yang sama)
  const dd = added.find((a) => {
    const d = haversine(c.lat, c.lng, +a.latitude, +a.longitude);
    return d <= SAME_NAME_M && sameName(n, norm(a.name));
  });
  if (dd) { excluded.push({ ...base, reason: `duplikat OSM (${dd.name})` }); continue; }

  added.push({
    name: c.tags.name.trim(),
    address: [c.tags['addr:street'], c.tags['addr:housenumber'], c.tags['addr:city']].filter(Boolean).join(' '),
    latitude: c.lat,
    longitude: c.lng,
    rating: '',
    total_reviews: '',
    source: 'osm',
    category: cl.category,
    osm_id: c.osm_id,
  });
}

const merged = [
  ...kaggle.map((r) => ({
    name: r.name.trim(), address: r.address, latitude: r.latitude, longitude: r.longitude,
    rating: r.rating, total_reviews: r.total_reviews, source: 'kaggle', category: kaggleCat.get(r.name.trim()) ?? 'Coffee shop', osm_id: '',
  })),
  ...added,
];

const COLS = ['name', 'address', 'latitude', 'longitude', 'rating', 'total_reviews', 'source', 'category', 'osm_id'];
fs.writeFileSync(path.join(DATASET, 'competitors_merged.csv'), toCsv(COLS, merged));
fs.writeFileSync(path.join(DATASET, 'competitors_osm_added.csv'), toCsv(COLS, added));
fs.writeFileSync(path.join(DATASET, 'competitors_osm_excluded.csv'), toCsv(['osm_id', 'name', 'latitude', 'longitude', 'reason'], excluded));

const byReason = {};
for (const e of excluded) byReason[e.reason.replace(/\(.*\)/, '').trim()] = (byReason[e.reason.replace(/\(.*\)/, '').trim()] ?? 0) + 1;
console.log(`OSM amenity=cafe di bbox   : ${candidates.length}`);
console.log(`Ditambahkan (baru)         : ${added.length}  (Coffee shop: ${added.filter((a) => a.category === 'Coffee shop').length}, Cafe: ${added.filter((a) => a.category === 'Cafe').length})`);
console.log(`Dibuang                    : ${excluded.length}`);
for (const [k, v] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) console.log(`   - ${k}: ${v}`);
console.log(`Total kompetitor (merged)  : ${merged.length}  (Kaggle ${kaggle.length} + OSM ${added.length})`);
