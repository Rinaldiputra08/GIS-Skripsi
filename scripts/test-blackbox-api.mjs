/**
 * Pengujian blackbox tingkat API (masukan -> keluaran, tanpa melihat kode di dalamnya).
 * Hanya permintaan baca & permintaan yang memang harus DITOLAK; tidak menulis data apa pun.
 *
 * Jalankan (server harus hidup):  npm run dev   lalu   node scripts/test-blackbox-api.mjs [base-url]
 * Hasil: ../Dokumen-Skripsi-KopiSpasial/03-pengujian/hasil-blackbox-api.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC_ROOT = process.env.SKRIPSI_DOCS || path.join(__dirname, '..', '..', 'Dokumen-Skripsi-KopiSpasial');
const OUT = path.join(DOC_ROOT, '03-pengujian', 'hasil-blackbox-api.md');
const OWNER = '00000000-0000-4000-8000-000000000000'; // id uji, tidak pernah dipakai menulis

const req = async (method, url, body, raw) => {
  const t0 = Date.now();
  const res = await fetch(BASE + url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  let json = null;
  try { json = await res.json(); } catch { /* bukan JSON */ }
  return { status: res.status, json, ms: Date.now() - t0 };
};

const balanced = { 'c1-c2': 1, 'c1-c3': 1, 'c1-c4': 1, 'c2-c3': 1, 'c2-c4': 1, 'c3-c4': 1 };
// Sengaja tidak konsisten: C1 > C2 (9), C2 > C3 (9), tetapi C3 > C1 (9)
const inconsistent = { 'c1-c2': 9, 'c1-c3': 1 / 9, 'c1-c4': 1, 'c2-c3': 9, 'c2-c4': 1, 'c3-c4': 1 };

const CASES = [
  // --- Perhitungan AHP-TOPSIS ---
  ['Perhitungan', 'Hitung rekomendasi dengan perbandingan berpasangan konsisten (semua 1)',
    () => req('POST', '/api/spatial/analyze', { pairs: balanced }),
    (r) => r.status === 200 && r.json?.success && r.json.totalCount > 1000 && r.json.top10?.length === 10,
    'HTTP 200, seluruh titik grid diperingkat, 10 teratas dikembalikan',
    (r) => `HTTP ${r.status}, ${r.json?.totalCount} titik, CR ${(r.json?.ahpResult?.cr ?? 0).toFixed(3)}, ${r.ms} ms`],
  ['Perhitungan', 'Bobot hasil AHP berjumlah 1',
    () => req('POST', '/api/spatial/analyze', { pairs: { ...balanced, 'c1-c4': 3, 'c2-c4': 2 } }),
    (r) => r.status === 200 && Math.abs(r.json.ahpResult.weightsArray.reduce((a, b) => a + b, 0) - 1) < 1e-6,
    'Jumlah bobot C1..C4 = 1',
    (r) => `bobot ${r.json?.ahpResult?.weightsArray?.map((w) => w.toFixed(3)).join(' + ')} = ${r.json?.ahpResult?.weightsArray?.reduce((a, b) => a + b, 0).toFixed(3)}`],
  ['Perhitungan', 'Perbandingan berpasangan tidak konsisten (CR > 0,1) ditolak',
    () => req('POST', '/api/spatial/analyze', { pairs: inconsistent }),
    (r) => r.status === 422 && r.json?.success === false && r.json.cr > 0.1,
    'HTTP 422, pesan rasio konsistensi melebihi 10%, peringkat tidak dihitung',
    (r) => `HTTP ${r.status}, CR ${(r.json?.cr ?? 0).toFixed(3)}: "${r.json?.message ?? ''}"`],
  ['Perhitungan', 'Titik zona terlarang tidak masuk peringkat',
    () => req('POST', '/api/spatial/analyze', { pairs: balanced }),
    (r) => r.json?.topsisResult?.candidates?.filter((c) => c.isRestricted).every((c) => !c.rank || c.rank === 0 || c.score === 0) ?? false,
    'Semua titik terlarang tanpa peringkat; 10 teratas tidak memuat titik terlarang',
    (r) => {
      const c = r.json?.topsisResult?.candidates ?? [];
      return `${c.filter((x) => x.isRestricted).length} titik terlarang, ${r.json?.top10?.filter((x) => x.isRestricted).length ?? '?'} di 10 teratas`;
    }],
  ['Perhitungan', 'Kelas potensi dibagi kuantil 15% / 35% / 50%',
    () => req('POST', '/api/spatial/analyze', { pairs: balanced }),
    (r) => {
      const c = (r.json?.topsisResult?.candidates ?? []).filter((x) => !x.isRestricted);
      const p = (k) => c.filter((x) => x.category === k).length / c.length;
      return Math.abs(p('high') - 0.15) < 0.01 && Math.abs(p('medium') - 0.35) < 0.01;
    },
    'Proporsi tinggi ≈ 15%, sedang ≈ 35%, rendah ≈ 50%',
    (r) => {
      const c = (r.json?.topsisResult?.candidates ?? []).filter((x) => !x.isRestricted);
      const p = (k) => ((c.filter((x) => x.category === k).length / c.length) * 100).toFixed(1) + '%';
      return `tinggi ${p('high')}, sedang ${p('medium')}, rendah ${p('low')}`;
    }],

  // --- Data peta ---
  ['Data peta', 'Memuat seluruh lapisan peta',
    () => req('GET', '/api/layers/overview'),
    (r) => r.status === 200 && r.json?.success && r.json.competitors?.length > 0 && r.json.crowdCenters?.length > 0 && r.json.grid?.length > 0,
    'HTTP 200 berisi kompetitor, pusat keramaian, jalan, zona, kecamatan, grid',
    (r) => `HTTP ${r.status}, sumber ${r.json?.source}: ${r.json?.competitors?.length} kompetitor, ${r.json?.crowdCenters?.length} keramaian, ${r.json?.exclusionZones?.length} zona, ${r.json?.grid?.length} titik grid`],

  // --- Survei titik ---
  ['Survei titik', 'Titik di dalam Kota Bogor (Tugu Kujang)',
    () => req('GET', '/api/spatial/point?lat=-6.6006&lng=106.8053'),
    (r) => r.status === 200 && r.json?.criteria?.inside === true && r.json.criteria.c1 >= 0 && r.json.criteria.density > 0,
    'HTTP 200, kriteria C1–C4 dan kelurahan terisi',
    (r) => { const c = r.json?.criteria ?? {}; return `Kel. ${c.village}, Kec. ${c.district}; C1 ${Math.round(c.c1)} m, C2 ${Math.round(c.density)}/km², C3 ${Math.round(c.c3)} m, C4 ${Math.round(c.c4)} m`; }],
  ['Survei titik', 'Titik di luar Kota Bogor (Cibinong)',
    () => req('GET', '/api/spatial/point?lat=-6.4817&lng=106.8540'),
    (r) => r.status === 200 && r.json?.criteria?.inside === false,
    'HTTP 200, titik dinyatakan di luar wilayah studi',
    (r) => `HTTP ${r.status}, inside = ${r.json?.criteria?.inside}`],
  ['Survei titik', 'Koordinat tidak valid (huruf)',
    () => req('GET', '/api/spatial/point?lat=abc&lng=106.8'),
    (r) => r.status === 400,
    'HTTP 400, koordinat ditolak',
    (r) => `HTTP ${r.status}: "${r.json?.error ?? ''}"`],
  ['Survei titik', 'Koordinat di luar jangkauan (lat 200)',
    () => req('GET', '/api/spatial/point?lat=200&lng=106.8'),
    (r) => r.status === 400,
    'HTTP 400, koordinat ditolak',
    (r) => `HTTP ${r.status}: "${r.json?.error ?? ''}"`],

  // --- Cari alamat ---
  ['Cari alamat', 'Mencari tempat terkenal ("Botani Square")',
    () => req('GET', '/api/geocode?q=' + encodeURIComponent('Botani Square')),
    (r) => r.status === 200 && r.json?.results?.length > 0 && r.json.results[0].lat < -6.5 && r.json.results[0].lat > -6.7,
    'HTTP 200, hasil berada di Kota Bogor',
    (r) => `HTTP ${r.status}, ${r.json?.results?.length} hasil; pertama: ${r.json?.results?.[0]?.name} (${r.json?.results?.[0]?.address})`],
  ['Cari alamat', 'Kata kunci terlalu pendek ("ab")',
    () => req('GET', '/api/geocode?q=ab'),
    (r) => r.status === 400,
    'HTTP 400, pesan "Ketik minimal 3 huruf"',
    (r) => `HTTP ${r.status}: "${r.json?.error ?? ''}"`],
  ['Cari alamat', 'Tempat yang tidak ada ("qwxzzkopi")',
    () => req('GET', '/api/geocode?q=qwxzzkopi'),
    (r) => r.status === 200 && r.json?.results?.length === 0,
    'HTTP 200, daftar hasil kosong (antarmuka menampilkan saran)',
    (r) => `HTTP ${r.status}, ${r.json?.results?.length} hasil`],

  // --- Simpan riwayat / skenario: validasi masukan ---
  ['Riwayat & skenario', 'Simpan survei dengan koordinat tidak valid',
    () => req('POST', '/api/survey-logs', { ownerId: OWNER, latitude: 'x', longitude: 106.8, score: 0.5 }),
    (r) => r.status === 400,
    'HTTP 400, data tidak disimpan',
    (r) => `HTTP ${r.status}: "${r.json?.error ?? ''}"`],
  ['Riwayat & skenario', 'Simpan skenario tanpa nama',
    () => req('POST', '/api/scenarios', { ownerId: OWNER, name: '', pairs: balanced }),
    (r) => r.status === 400,
    'HTTP 400, pesan "Nama skenario wajib diisi"',
    (r) => `HTTP ${r.status}: "${r.json?.error ?? ''}"`],
  ['Riwayat & skenario', 'Membaca riwayat dengan id perangkat tidak valid',
    () => req('GET', '/api/survey-logs?ownerId=bukan-id'),
    (r) => r.status === 400,
    'HTTP 400, data perangkat lain tidak bisa diakses',
    (r) => `HTTP ${r.status}: "${r.json?.error ?? ''}"`],

  // --- Admin: autentikasi & hak akses ---
  ['Admin', 'Login tanpa email dan kata sandi',
    () => req('POST', '/api/admin/login', { email: '', password: '' }),
    (r) => r.status === 400,
    'HTTP 400, pesan wajib diisi',
    (r) => `HTTP ${r.status}: "${r.json?.error ?? ''}"`],
  ['Admin', 'Login dengan kata sandi salah',
    () => req('POST', '/api/admin/login', { email: 'uji-blackbox@example.com', password: 'salah-123' }),
    (r) => r.status === 401,
    'HTTP 401, login ditolak',
    (r) => `HTTP ${r.status}: "${r.json?.error ?? ''}"`],
  ...[
    ['GET', '/api/admin/stats', 'Membuka statistik dasbor'],
    ['GET', '/api/admin/competitors', 'Membaca data kompetitor'],
    ['POST', '/api/admin/competitors', 'Menambah kompetitor', { name: 'Uji', lat: -6.6, lng: 106.8 }],
    ['DELETE', '/api/admin/competitors/1', 'Menghapus kompetitor'],
    ['PUT', '/api/admin/settings', 'Mengubah parameter sistem', { c1Cap: 100 }],
    ['PUT', '/api/admin/villages', 'Mengubah penduduk kelurahan', { period: 'Uji', values: {} }],
    ['POST', '/api/admin/apply', 'Membangun ulang grid'],
    ['GET', '/api/admin/history', 'Membaca riwayat perubahan'],
  ].map(([m, u, label, body]) => ['Admin', `${label} tanpa login`,
    () => req(m, u, body),
    (r) => r.status === 401,
    'HTTP 401, akses ditolak',
    (r) => `HTTP ${r.status}: "${r.json?.error ?? ''}"`]),
];

const rows = [];
let pass = 0;
for (const [group, name, run, check, expected, describe] of CASES) {
  let ok = false, actual;
  try {
    const r = await run();
    ok = !!check(r);
    actual = describe(r);
  } catch (err) {
    actual = `galat: ${err.message}`;
  }
  if (ok) pass++;
  rows.push({ group, name, expected, actual, ok });
  console.log(`${ok ? 'VALID  ' : 'GAGAL  '} [${group}] ${name}\n         ${actual}`);
}

const now = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
let md = `# Hasil Pengujian Blackbox — Tingkat API\n\nDijalankan ${now} terhadap \`${BASE}\` dengan \`node scripts/test-blackbox-api.mjs\`.\n\n`;
md += `**${pass} dari ${rows.length} kasus uji valid.**\n\n`;
md += '| No | Fitur | Skenario uji | Hasil yang diharapkan | Hasil pengujian | Kesimpulan |\n|---|---|---|---|---|---|\n';
rows.forEach((r, i) => {
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  md += `| ${i + 1} | ${r.group} | ${esc(r.name)} | ${esc(r.expected)} | ${esc(r.actual)} | ${r.ok ? 'Valid' : '**Tidak valid**'} |\n`;
});
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md);
console.log(`\n${pass}/${rows.length} valid -> ${path.relative(process.cwd(), OUT)}`);
process.exit(pass === rows.length ? 0 : 1);
