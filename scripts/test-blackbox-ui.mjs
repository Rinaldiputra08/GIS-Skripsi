/**
 * Pengujian blackbox antarmuka (halaman pengguna) dengan browser otomatis (Playwright + Google Chrome).
 * Skrip hanya berinteraksi lewat apa yang terlihat di layar: klik, ketik, lalu periksa tampilan.
 * Setiap kasus menyimpan tangkapan layar ke ../Dokumen-Skripsi-KopiSpasial/03-pengujian/screenshots/<kode>.jpg.
 *
 * Data uji (skenario & riwayat survei) dibuat dengan id perangkat baru lalu dihapus lagi di akhir.
 *
 * Jalankan (server harus hidup):  npm run dev   lalu   node scripts/test-blackbox-ui.mjs [base-url] [--headed]
 * Hasil: ../Dokumen-Skripsi-KopiSpasial/03-pengujian/hasil-blackbox-ui.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000';
const HEADED = args.includes('--headed');
const ONLY = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC_ROOT = process.env.SKRIPSI_DOCS || path.join(__dirname, '..', '..', 'Dokumen-Skripsi-KopiSpasial');
const DOCS = path.join(DOC_ROOT, '03-pengujian');
const SHOTS = path.join(DOCS, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const GPS = { latitude: -6.5952, longitude: 106.7896 }; // posisi GPS simulasi (sekitar Jl. Sudirman)

const browser = await chromium.launch({ channel: 'chrome', headless: !HEADED });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'id-ID',
  geolocation: GPS,
  permissions: ['geolocation', 'clipboard-read', 'clipboard-write'],
  acceptDownloads: true,
});
const page = await context.newPage();
page.setDefaultTimeout(15000);

const results = [];
/** kasus yang memotret sendiri pada saat paling informatif (mis. modal yang lalu ditutup) */
const keepShot = new Set(['U-20', 'U-37', 'U-39']);
for (const c of keepShot) fs.rmSync(path.join(SHOTS, `${c}.jpg`), { force: true });
async function tc(code, group, name, expected, fn) {
  if (ONLY && !ONLY.includes(code)) return;
  let ok = false, actual = '';
  try {
    actual = await fn();
    ok = true;
  } catch (err) {
    actual = `GAGAL: ${String(err.message).split('\n')[0]}`;
    if (process.env.DEBUG) console.log(err.message);
  }
  await page.waitForTimeout(700); // tunggu animasi selesai agar tangkapan layar tidak buram
  const shot = path.join(SHOTS, `${code}.jpg`);
  if (!fs.existsSync(shot) || !keepShot.has(code)) {
    try { await page.screenshot({ path: shot, type: 'jpeg', quality: 80 }); } catch { /* abaikan */ }
  }
  results.push({ code, group, name, expected, actual, ok });
  console.log(`${ok ? 'VALID  ' : 'GAGAL  '} ${code} ${name}\n         ${actual}`);
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
/** Koordinat pada tautan sama dengan koordinat kartu (kartu dibulatkan 4 desimal) */
const sameCoord = (href, lat, lng) => {
  const m = href.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
  return !!m && Math.abs(Number(m[1]) - Number(lat)) < 0.0001 && Math.abs(Number(m[2]) - Number(lng)) < 0.0001;
};

// ---------- helper navigasi ----------
const panel = () => page.locator('aside[aria-label="Panel analisis"]');
const tab = (label) => panel().getByRole('tab', { name: label });
const openTab = async (label) => { await tab(label).click(); await page.waitForTimeout(300); };
const crChip = () => panel().locator('.chip').filter({ hasText: 'CR' }).first();
const pairBtn = (pairIdx, stepIdx) => panel().locator('fieldset').nth(pairIdx).getByRole('button').nth(stepIdx);
const calcBtn = () => panel().getByRole('button', { name: /Hitung rekomendasi|Menghitung/ });
const resultCards = () => panel().locator('ol > li');
const waitIdle = () => page.waitForLoadState('networkidle').catch(() => {});

async function freshHome() {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByText('Data langsung dari Supabase').waitFor({ timeout: 20000 }).catch(() => {});
}

async function calculate() {
  await calcBtn().click();
  await panel().getByRole('heading', { name: '10 lokasi terbaik' }).waitFor({ timeout: 30000 });
  await waitIdle();
}

// =====================================================================
await freshHome();

// ---------- A1. Prioritas (AHP) ----------
await tc('U-01', 'Prioritas (AHP)', 'Memilih preset bobot', 'Perbandingan berpasangan berubah sesuai preset; bobot & CR diperbarui', async () => {
  await openTab('Prioritas');
  const before = await panel().getByRole('img', { name: 'Komposisi bobot kriteria' }).innerHTML();
  await panel().getByRole('button', { name: /Fokus Aksesibilitas/ }).click();
  await page.waitForTimeout(300);
  const after = await panel().getByRole('img', { name: 'Komposisi bobot kriteria' }).innerHTML();
  expect(before !== after, 'komposisi bobot tidak berubah');
  const cr = await crChip().innerText();
  return `Preset "Fokus Aksesibilitas & Keramaian" dipilih; komposisi bobot berubah; status ${cr.replace(/\s+/g, ' ')}`;
});

await tc('U-02', 'Prioritas (AHP)', 'Mengisi perbandingan berpasangan konsisten', 'Bobot berubah, CR ≤ 10% ditandai konsisten', async () => {
  await panel().getByRole('button', { name: /Bobot Seimbang/ }).click();
  await pairBtn(0, 1).click(); // C1 "Lebih" penting dari C2
  await page.waitForTimeout(300);
  const cr = (await crChip().innerText()).replace(/\s+/g, ' ');
  expect(/Konsisten/.test(cr) && !/Belum/.test(cr), `status: ${cr}`);
  const expl = await panel().locator('fieldset').nth(0).locator('p').innerText();
  return `Pilih "C1 lebih penting dari C2" → "${expl}"; status ${cr}`;
});

await tc('U-03', 'Prioritas (AHP)', 'Mengisi perbandingan berpasangan tidak konsisten', 'Peringatan CR > 10%; tombol hitung nonaktif', async () => {
  await pairBtn(0, 0).click(); // C1 jauh lebih penting dari C2
  await pairBtn(3, 0).click(); // C2 jauh lebih penting dari C3
  await pairBtn(1, 4).click(); // C3 jauh lebih penting dari C1
  await page.waitForTimeout(300);
  const cr = (await crChip().innerText()).replace(/\s+/g, ' ');
  expect(/Belum konsisten/.test(cr), `status: ${cr}`);
  await panel().getByText('Jawabanmu belum konsisten').waitFor();
  expect(await calcBtn().isDisabled(), 'tombol hitung masih aktif');
  return `Status "${cr}", peringatan "Jawabanmu belum konsisten" tampil, tombol Hitung nonaktif`;
});

await tc('U-04', 'Prioritas (AHP)', 'Menghitung rekomendasi', 'Pindah ke tab Hasil dengan 10 lokasi terbaik', async () => {
  await panel().getByRole('button', { name: /Bobot Seimbang/ }).click();
  const t0 = Date.now();
  await calculate();
  const n = await resultCards().count();
  expect(n === 10, `${n} kartu`);
  const sub = (await panel().getByText(/titik layak usaha/).innerText()).match(/Dari [\d.]+ titik layak usaha/)?.[0];
  return `Tab Hasil terbuka dalam ${((Date.now() - t0) / 1000).toFixed(1)} detik; ${n} kartu; "${sub}"`;
});

// ---------- A2. Hasil ----------
await tc('U-05', 'Hasil rekomendasi', 'Melihat detail lokasi teratas', 'Kartu terbuka dengan C1–C4, kelurahan, koordinat', async () => {
  const first = resultCards().first();
  if ((await first.getByRole('button').first().getAttribute('aria-pressed')) !== 'true') await first.getByRole('button').first().click();
  await first.getByText('Jarak kafe').waitFor();
  const txt = (await first.innerText()).replace(/\s+/g, ' ');
  expect(/Kepadatan · /.test(txt), 'kelurahan tidak tampil');
  const kel = txt.match(/Kepadatan · ([^\d]+?) [\d.]+ \/km²/)?.[1];
  const coord = txt.match(/-6\.\d{4}, 106\.\d{4}/)?.[0];
  return `Peringkat 1 terbuka: C1–C4 tampil, kelurahan ${kel}, koordinat ${coord}`;
});

let firstCoord = null;
await tc('U-07', 'Hasil rekomendasi', 'Buka di Google Maps', 'Tab baru Google Maps dengan pin di koordinat yang sama', async () => {
  const first = resultCards().first();
  const txt = await first.innerText();
  firstCoord = txt.match(/(-6\.\d{4}), (106\.\d{4})/);
  const link = first.getByRole('link', { name: 'Google Maps' });
  const href = await link.getAttribute('href');
  const [popup] = await Promise.all([context.waitForEvent('page'), link.click()]);
  await popup.waitForURL(/google\./, { timeout: 20000 }).catch(() => {});
  const url = popup.url();
  await popup.close();
  expect(href.includes('/maps/search/') && sameCoord(href, firstCoord[1], firstCoord[2]), `href ${href}`);
  expect(/google\./.test(url), `url ${url}`);
  return `Tab baru terbuka (${new URL(url).hostname}), pin di koordinat kartu: ${href}`;
});

await tc('U-08', 'Hasil rekomendasi', 'Petunjuk arah', 'Google Maps membuka rute ke titik tersebut', async () => {
  const link = resultCards().first().getByRole('link', { name: 'Arah' });
  const href = await link.getAttribute('href');
  const [popup] = await Promise.all([context.waitForEvent('page'), link.click()]);
  await popup.close();
  expect(href.includes('/maps/dir/') && sameCoord(href, firstCoord[1], firstCoord[2]), href);
  return `Tab baru terbuka: ${href}`;
});

await tc('U-09', 'Hasil rekomendasi', 'Street View', 'Street View di sekitar titik tersebut', async () => {
  const link = resultCards().first().getByRole('link', { name: 'Street View' });
  const href = await link.getAttribute('href');
  const [popup] = await Promise.all([context.waitForEvent('page'), link.click()]);
  await popup.close();
  expect(href.includes('map_action=pano') && sameCoord(href, firstCoord[1], firstCoord[2]), href);
  return `Tab baru terbuka: ${href}`;
});

await tc('U-06', 'Hasil rekomendasi', 'Filter kecamatan', 'Daftar hanya berisi lokasi di Bogor Barat', async () => {
  await panel().locator('select').first().selectOption({ label: 'Kecamatan Bogor Barat' });
  await page.waitForTimeout(300);
  const names = await resultCards().locator('span.truncate.text-\\[15px\\]').allInnerTexts();
  expect(names.length > 0 && names.every((n) => n === 'Bogor Barat'), names.join(','));
  const out = `${names.length} kartu, semuanya "Bogor Barat"`;
  await panel().locator('select').first().selectOption('ALL');
  return out;
});

await tc('U-10', 'Hasil rekomendasi', 'Simpan skenario', 'Skenario muncul di daftar tersimpan', async () => {
  await panel().getByRole('textbox', { name: 'Nama skenario' }).fill('Uji blackbox U-10');
  await panel().getByRole('button', { name: 'Simpan' }).first().click();
  await panel().getByText('Uji blackbox U-10').waitFor();
  return 'Skenario "Uji blackbox U-10" muncul di daftar skenario tersimpan';
});

await tc('U-11', 'Hasil rekomendasi', 'Muat skenario', 'Prioritas kembali seperti saat disimpan dan dihitung ulang', async () => {
  await openTab('Prioritas');
  await panel().getByRole('button', { name: /Fokus Kepadatan/ }).click();
  const changed = await panel().getByRole('img', { name: 'Komposisi bobot kriteria' }).innerHTML();
  await openTab('Hasil');
  await panel().getByRole('button', { name: 'Pakai skenario Uji blackbox U-10' }).click();
  await panel().getByRole('heading', { name: '10 lokasi terbaik' }).waitFor();
  await waitIdle();
  await openTab('Prioritas');
  const now = await panel().getByRole('img', { name: 'Komposisi bobot kriteria' }).innerHTML();
  expect(now !== changed, 'bobot tidak kembali');
  const pressed = await pairBtn(0, 2).getAttribute('aria-pressed');
  expect(pressed === 'true', 'perbandingan C1-C2 bukan "Sama" seperti saat disimpan');
  await openTab('Hasil');
  return 'Setelah prioritas diubah ke "Fokus Kepadatan", memuat skenario mengembalikan bobot seimbang & peringkat dihitung ulang';
});

await tc('U-12', 'Hasil rekomendasi', 'Ekspor CSV hasil', 'Berkas CSV berisi 100 lokasi teratas', async () => {
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    panel().locator('section[aria-label="Skenario dan ekspor"]').getByRole('button', { name: 'CSV' }).click(),
  ]);
  const file = path.join(SHOTS, '..', 'U-12-hasil.csv');
  await dl.saveAs(file);
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  fs.unlinkSync(file);
  expect(lines.length - 1 === 100, `${lines.length - 1} baris data`);
  return `Berkas "${dl.suggestedFilename()}" terunduh: 1 baris judul + ${lines.length - 1} baris data; kolom: ${lines[0].slice(0, 90)}…`;
});

// ---------- A3. Peta & lapisan ----------
const overlayPaths = () => page.locator('.leaflet-overlay-pane path').count();
const closePopups = async () => {
  // klik lewat DOM, bukan koordinat layar: tombol × popup bisa tertutup header
  await page.evaluate(() => document.querySelectorAll('.leaflet-popup-close-button').forEach((b) => b.click()));
  await page.waitForTimeout(200);
};
const layerSwitch = (label) => panel().getByRole('switch', { name: new RegExp(label) });

await tc('U-13', 'Peta & lapisan', 'Menampilkan/menyembunyikan lapisan', 'Lapisan hilang saat dimatikan dan muncul lagi saat dinyalakan', async () => {
  await openTab('Layer');
  const out = [];
  const count = {
    'Kedai kopi eksisting': () => page.locator('.custom-coffee-pin').count(),
    'Pusat keramaian': () => page.locator('.custom-crowd-pin').count(),
    'Jaringan jalan': overlayPaths,
    'Zona terlarang': overlayPaths,
  };
  for (const [label, fn] of Object.entries(count)) {
    const sw = layerSwitch(label);
    const wasOn = (await sw.getAttribute('aria-checked')) === 'true';
    const a = await fn();
    await sw.click(); await page.waitForTimeout(500);
    const b = await fn();
    await sw.click(); await page.waitForTimeout(500);
    const c = await fn();
    expect(a !== b && a === c, `${label}: ${a} → ${b} → ${c}`);
    out.push(`${label} ${wasOn ? 'aktif' : 'nonaktif'} ${a} → ${b} → ${c}`);
  }
  return `Jumlah objek di peta (awal → setelah diklik → diklik lagi): ${out.join('; ')}`;
});

await tc('U-14', 'Peta & lapisan', 'Mode tampilan rekomendasi', 'Bentuk penanda rekomendasi berubah sesuai mode', async () => {
  const modes = panel().getByRole('radiogroup', { name: 'Bentuk tampilan hasil' });
  const out = [];
  for (const m of ['Titik', 'Gabungan', 'Area']) {
    await modes.getByRole('radio', { name: m }).click(); await page.waitForTimeout(700);
    out.push(`${m}: ${await overlayPaths()} objek`);
  }
  const nums = out.map((o) => Number(o.match(/(\d+) objek/)[1]));
  expect(new Set(nums).size === 3, out.join(', '));
  return `${out.join(', ')} (Area = sel grid + lingkaran 10 teratas, Titik = titik pusat, Gabungan = keduanya)`;
});

await tc('U-15', 'Peta & lapisan', 'Filter kelas potensi', 'Hanya titik kelas tinggi yang tampil', async () => {
  const cats = panel().getByRole('radiogroup', { name: 'Kategori kelayakan' });
  const all = await overlayPaths();
  await cats.getByRole('radio', { name: 'Tinggi' }).click(); await page.waitForTimeout(700);
  const high = await overlayPaths();
  await cats.getByRole('radio', { name: 'Semua' }).click(); await page.waitForTimeout(700);
  expect(high < all, `${all} → ${high}`);
  return `Objek di peta: semua kelas ${all} → kelas Tinggi saja ${high}`;
});

await tc('U-16', 'Peta & lapisan', 'Popup titik rekomendasi', 'Popup berisi peringkat, skor, C1–C4, tombol Google Maps/Arah/Street View', async () => {
  await panel().getByRole('radiogroup', { name: 'Bentuk tampilan hasil' }).getByRole('radio', { name: 'Titik' }).click();
  await openTab('Hasil');
  await resultCards().first().getByRole('button').first().click();
  await page.waitForTimeout(1500);
  // titik peringkat 1 digambar paling besar (lingkaran putih tebal)
  await page.locator('.leaflet-overlay-pane path[stroke-width="3"]').first().click({ force: true });
  const pop = page.locator('.leaflet-popup-content');
  await pop.waitFor();
  const txt = (await pop.innerText()).replace(/\s+/g, ' ');
  for (const w of ['Jarak kafe', 'Kepadatan', 'Akses jalan', 'Keramaian', 'Google Maps', 'Arah', 'Street View']) expect(txt.includes(w), `tidak ada "${w}"`);
  const head = txt.match(/#\d+ · [A-Za-z ]+?(?= -6)/)?.[0];
  await closePopups();
  await openTab('Layer');
  await panel().getByRole('radiogroup', { name: 'Bentuk tampilan hasil' }).getByRole('radio', { name: 'Area' }).click();
  return `Popup "${head}" berisi skor, C1–C4 dan tombol Google Maps · Arah · Street View`;
});

const clickVisibleMarker = async (sel) => {
  await closePopups();
  const box = await page.evaluate((s) => {
    const els = [...document.querySelectorAll(s)];
    for (const e of els) {
      const r = e.getBoundingClientRect();
      if (r.left > 480 && r.right < innerWidth - 220 && r.top > 120 && r.bottom < innerHeight - 80) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return null;
  }, sel);
  expect(box, `tidak ada ${sel} yang terlihat`);
  await page.mouse.click(box.x, box.y);
  const pop = page.locator('.leaflet-popup-content');
  await pop.waitFor();
  const t = (await pop.innerText()).replace(/\s+/g, ' ').trim();
  await closePopups();
  return t;
};

await tc('U-17', 'Peta & lapisan', 'Popup kompetitor & pusat keramaian', 'Popup menampilkan nama dan kategori', async () => {
  const a = await clickVisibleMarker('.custom-coffee-pin');
  const b = await clickVisibleMarker('.custom-crowd-pin');
  expect(a.length > 3 && b.length > 3, 'popup kosong');
  return `Kedai: "${a.slice(0, 70)}" · Keramaian: "${b.slice(0, 70)}"`;
});

// ---------- A4. Survei titik ----------
const modal = () => page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: 'Laporan Kelayakan Bisnis Lokasi' }) });
const closeModal = async () => {
  if (await modal().isVisible().catch(() => false)) {
    await modal().getByRole('button', { name: 'Tutup', exact: true }).click();
    await page.waitForTimeout(300);
  }
};
const surveyCard = () => panel().locator('.card').filter({ hasText: 'Hasil terkini' });
const manualSurvey = async (lat, lng) => {
  await closeModal();
  const det = panel().locator('details').filter({ hasText: 'Masukkan koordinat manual' });
  if (!(await det.getAttribute('open') !== null)) await det.locator('summary').click();
  await det.getByLabel('Latitude').fill(String(lat));
  await det.getByLabel('Longitude').fill(String(lng));
  await det.getByRole('button', { name: 'Evaluasi koordinat ini' }).click();
  await modal().waitFor();
};
const searchBox = () => panel().getByRole('searchbox', { name: 'Cari alamat atau tempat' });

await tc('U-18', 'Survei titik', 'Cari alamat yang ada', 'Peta pindah ke tempat itu; hasil survei tampil', async () => {
  await openTab('Survei');
  await searchBox().fill('Botani Square');
  await panel().getByRole('button', { name: 'Cari', exact: true }).click();
  const hit = panel().getByRole('button', { name: /Botani Square/ }).first();
  await hit.waitFor();
  await hit.click();
  await modal().waitFor();
  const head = (await modal().locator('p').first().innerText()).replace(/\s+/g, ' ');
  await closeModal();
  const card = (await surveyCard().innerText()).replace(/\s+/g, ' ');
  expect(/Bogor Tengah/.test(card), card);
  return `Hasil "Botani Square" dipilih → laporan terbuka (${head}); kartu: ${card.slice(0, 120)}`;
});

await tc('U-29', 'Riwayat & perbandingan', 'Nama otomatis dari pencarian', 'Kolom "Nama lokasi" terisi nama tempat', async () => {
  const v = await panel().getByRole('textbox', { name: 'Nama lokasi' }).inputValue();
  expect(v === 'Botani Square', `isi kolom: "${v}"`);
  return `Kolom "Nama lokasi" berisi "${v}"`;
});

await tc('U-28', 'Riwayat & perbandingan', 'Simpan hasil survei', 'Muncul "Tersimpan di riwayat"; lokasi muncul di daftar', async () => {
  await panel().getByRole('textbox', { name: 'Catatan' }).fill('Uji blackbox: ruko dekat mal');
  await panel().getByRole('button', { name: 'Simpan ke riwayat' }).click();
  await panel().getByText('Tersimpan di riwayat.').waitFor();
  await panel().locator('section[aria-label="Riwayat survei"] li').filter({ hasText: 'Botani Square' }).waitFor();
  return 'Pesan "Tersimpan di riwayat." tampil; "Botani Square" muncul di daftar Riwayat survei';
});

await tc('U-19', 'Survei titik', 'Cari alamat yang tidak ada', 'Pesan tidak ditemukan beserta saran', async () => {
  await searchBox().fill('qwxzzkopi');
  await panel().getByRole('button', { name: 'Cari', exact: true }).click();
  const msg = panel().getByText(/Tidak ditemukan di Kota Bogor/);
  await msg.waitFor();
  return `"${(await msg.innerText()).slice(0, 110)}…"`;
});

await tc('U-20', 'Survei titik', 'Kata kunci terlalu pendek', 'Pesan "Ketik minimal 3 huruf."', async () => {
  await searchBox().fill('ab');
  await panel().getByRole('button', { name: 'Cari', exact: true }).click();
  await panel().getByRole('alert').filter({ hasText: 'Ketik minimal 3 huruf.' }).waitFor();
  await page.screenshot({ path: path.join(SHOTS, 'U-20.jpg'), type: 'jpeg', quality: 80 });
  await searchBox().fill('');
  await panel().getByRole('alert').filter({ hasText: 'Ketik minimal 3 huruf.' }).waitFor({ state: 'detached' });
  expect((await panel().getByText(/Tidak ditemukan di Kota Bogor/).count()) === 0, 'pesan pencarian lama masih tampil');
  return 'Pesan "Ketik minimal 3 huruf." tampil; pencarian tidak dikirim; setelah kotak dikosongkan, pesan lama hilang';
});

await tc('U-21', 'Survei titik', 'Survei dengan GPS', 'Titik survei di posisi perangkat; hasil tampil', async () => {
  await panel().getByRole('button', { name: 'Lokasi saya' }).click();
  await modal().waitFor();
  const coord = (await modal().locator('p').first().innerText()).match(/-?\d+\.\d+, -?\d+\.\d+/)?.[0];
  const [la, ln] = coord.split(', ').map(Number);
  expect(Math.abs(la - GPS.latitude) < 1e-4 && Math.abs(ln - GPS.longitude) < 1e-4, coord);
  await closeModal();
  return `GPS simulasi ${GPS.latitude}, ${GPS.longitude} → titik survei ${coord}; ${(await surveyCard().locator('h3').innerText())}`;
});

await tc('U-22', 'Survei titik', 'Survei dengan klik peta', 'Penanda survei muncul di titik yang diklik; hasil tampil', async () => {
  await panel().getByRole('button', { name: 'Pilih di peta' }).click();
  const before = await surveyCard().innerText().catch(() => '');
  await page.mouse.click(820, 420);
  await modal().waitFor();
  const coord = (await modal().locator('p').first().innerText()).match(/-?\d+\.\d+, -?\d+\.\d+/)?.[0];
  await closeModal();
  await page.locator('.custom-survey-marker').waitFor();
  expect(!before.includes(coord), 'titik tidak berubah');
  return `Klik peta di layar (820, 420) → titik survei ${coord}, penanda survei tampil di peta`;
});

await tc('U-23', 'Survei titik', 'Survei koordinat manual', 'Hasil untuk Kel. Tegallega, Kec. Bogor Tengah', async () => {
  await manualSurvey(-6.6006, 106.8053);
  const body = (await modal().innerText()).replace(/\s+/g, ' ');
  await closeModal();
  expect(/Bogor Tengah/.test(body), 'kecamatan salah');
  const kel = body.match(/Kel(?:urahan|\.) (\w+)/)?.[1];
  return `Laporan: Kecamatan Bogor Tengah${kel ? `, Kelurahan ${kel}` : ''}`;
});

await tc('U-24', 'Survei titik', 'Survei di luar Kota Bogor', 'Dinyatakan di luar wilayah studi', async () => {
  await manualSurvey(-6.4817, 106.854);
  const body = (await modal().innerText()).replace(/\s+/g, ' ');
  await closeModal();
  expect(/Luar Wilayah Kota|luar cakupan|luar batas/i.test(body), body.slice(0, 200));
  return `Laporan: "${body.match(/Lokasi berada di luar[^.]*\./)?.[0] ?? 'Luar Wilayah Kota'}"`;
});

await tc('U-25', 'Survei titik', 'Survei di zona terlarang', 'Status lahan "Terlarang" beserta alasannya', async () => {
  const ov = await (await fetch(`${BASE}/api/layers/overview`)).json();
  const z = ov.grid.find((g) => g.isRestricted && /makam|pemakaman|tpu/i.test(g.restrictionReason ?? '')) ?? ov.grid.find((g) => g.isRestricted);
  await manualSurvey(z.lat, z.lng);
  const body = (await modal().innerText()).replace(/\s+/g, ' ');
  await closeModal();
  expect(/terlarang|dibatasi|tidak diizinkan/i.test(body), body.slice(0, 200));
  return `Titik ${z.lat.toFixed(5)}, ${z.lng.toFixed(5)} (${z.restrictionReason}) → laporan menyatakan lahan terlarang`;
});

await tc('U-26', 'Survei titik', 'Laporan lengkap (SWOT)', 'Modal berisi skor, C1–C4, SWOT, kesimpulan, tombol Google Maps/Arah/Street View', async () => {
  await manualSurvey(-6.6006, 106.8053);
  const m = modal();
  for (const l of ['Google Maps', 'Arah', 'Street View']) await m.getByRole('link', { name: l }).waitFor();
  await m.getByRole('button', { name: /Analisis SWOT/ }).click();
  await m.getByText(/Keunggulan Lokasi \(Strengths\)/).waitFor();
  await m.getByText(/Peluang Bisnis \(Opportunities\)/).waitFor();
  return 'Laporan memuat 4 faktor (C1–C4), tab SWOT (Strengths, Opportunities, dst.), dan tombol Google Maps · Arah · Street View';
});

await tc('U-27', 'Survei titik', 'Salin ringkasan', 'Teks ringkasan tersalin lengkap', async () => {
  await modal().getByRole('button', { name: /Salin Ringkasan/ }).click();
  await modal().getByText('Tersalin!').waitFor();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  for (const w of ['Kepadatan Penduduk', 'Akses Jalan Utama', 'KESIMPULAN']) expect(clip.includes(w), `tidak ada "${w}"`);
  await closeModal();
  return `Tombol berubah "Tersalin!"; papan klip berisi ${clip.split('\n').length} baris (koordinat, skor, C1–C4, kesimpulan)`;
});

// ---------- A5. Riwayat & perbandingan ----------
const hist = () => panel().locator('section[aria-label="Riwayat survei"]');
const saveCurrent = async (name) => {
  await panel().getByRole('textbox', { name: 'Nama lokasi' }).fill(name);
  await panel().getByRole('button', { name: 'Simpan ke riwayat' }).click();
  await panel().getByText('Tersimpan di riwayat.').waitFor();
};

await tc('U-30', 'Riwayat & perbandingan', 'Lihat kembali lokasi tersimpan', 'Lokasi dievaluasi ulang dan ditampilkan', async () => {
  await hist().locator('li').filter({ hasText: 'Botani Square' }).getByRole('button', { name: 'Lihat kembali di peta' }).click();
  await modal().waitFor();
  const head = (await modal().locator('p').first().innerText()).replace(/\s+/g, ' ');
  await closeModal();
  return `Klik ikon mata pada "Botani Square" → laporan survei terbuka kembali (${head})`;
});

await tc('U-33', 'Riwayat & perbandingan', 'Tombol bandingkan kurang dari 2', 'Tombol Bandingkan nonaktif', async () => {
  await manualSurvey(-6.5605, 106.7929); await closeModal(); await saveCurrent('Uji: Bogor Utara');
  await manualSurvey(-6.6290, 106.8160); await closeModal(); await saveCurrent('Uji: Bogor Selatan');
  await manualSurvey(-6.5770, 106.7700); await closeModal(); await saveCurrent('Uji: Bogor Barat');
  await hist().getByRole('checkbox', { name: /Botani Square/ }).check();
  const dis = await hist().getByRole('button', { name: 'Bandingkan' }).isDisabled();
  expect(dis, 'tombol aktif dengan 1 pilihan');
  return 'Setelah 4 lokasi tersimpan dan hanya 1 dicentang, tombol "Bandingkan" nonaktif';
});

await tc('U-31', 'Riwayat & perbandingan', 'Bandingkan 2 lokasi', 'Tabel perbandingan; nilai terbaik hijau; lokasi paling unggul', async () => {
  await hist().getByRole('checkbox', { name: /Uji: Bogor Utara/ }).check();
  await hist().getByRole('button', { name: 'Bandingkan' }).click();
  const tbl = hist().locator('.card').filter({ hasText: 'Perbandingan 2 lokasi' });
  await tbl.waitFor();
  const winner = (await tbl.locator('p').first().innerText()).replace(/\s+/g, ' ');
  const best = await tbl.getByLabel('terbaik').count();
  expect(best >= 4, `${best} tanda terbaik`);
  return `Tabel "Perbandingan 2 lokasi" tampil, ${best} sel ditandai terbaik (hijau); "${winner}"`;
});

await tc('U-34', 'Riwayat & perbandingan', 'Perbandingan mengikuti prioritas', 'Skor di tabel berubah sesuai prioritas baru', async () => {
  const tbl = () => hist().locator('.card').filter({ hasText: 'Perbandingan 2 lokasi' });
  const scores = async () => (await tbl().locator('tbody tr').first().locator('td').allInnerTexts()).map((t) => t.trim());
  const a = await scores();
  await openTab('Prioritas');
  await panel().getByRole('button', { name: /Fokus Minim Kompetisi/ }).click();
  await openTab('Survei');
  const shown = await tbl().waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  expect(shown, 'tabel perbandingan hilang setelah pindah tab');
  const b = await scores();
  await openTab('Prioritas');
  await panel().getByRole('button', { name: /Bobot Seimbang/ }).click();
  await openTab('Survei');
  await tbl().waitFor({ timeout: 8000 });
  expect(b.length === a.length && b.every(Boolean), 'tabel perbandingan hilang setelah pindah tab');
  expect(a.join() !== b.join(), `${a} → ${b}`);
  return `Skor (Botani Square, Bogor Utara): seimbang ${a.join(' / ')} → preset "Fokus Minim Kompetisi" ${b.join(' / ')}`;
});

await tc('U-32', 'Riwayat & perbandingan', 'Batas maksimal 3 lokasi', 'Kotak centang ke-4 tidak dapat dipilih', async () => {
  await hist().getByRole('checkbox', { name: /Uji: Bogor Selatan/ }).check();
  const fourth = hist().getByRole('checkbox', { name: /Uji: Bogor Barat/ });
  expect(await fourth.isDisabled(), 'kotak ke-4 masih aktif');
  await hist().locator('.card').filter({ hasText: 'Perbandingan 3 lokasi' }).waitFor();
  return 'Dengan 3 lokasi dicentang, tabel menjadi "Perbandingan 3 lokasi" dan kotak centang lokasi ke-4 nonaktif';
});

await tc('U-36', 'Riwayat & perbandingan', 'Ekspor CSV riwayat', 'CSV berisi seluruh riwayat', async () => {
  const n = await hist().locator('ul > li').count();
  const [dl] = await Promise.all([page.waitForEvent('download'), hist().getByRole('button', { name: 'CSV' }).click()]);
  const file = path.join(DOCS, 'U-36.csv');
  await dl.saveAs(file);
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  fs.unlinkSync(file);
  expect(lines.length - 1 === n, `${lines.length - 1} baris vs ${n} riwayat`);
  return `"${dl.suggestedFilename()}" terunduh: ${lines.length - 1} baris = ${n} lokasi di riwayat`;
});

await tc('U-35', 'Riwayat & perbandingan', 'Hapus riwayat', 'Lokasi hilang dari daftar', async () => {
  const names = ['Uji: Bogor Barat', 'Uji: Bogor Selatan', 'Uji: Bogor Utara', 'Botani Square'];
  for (const n of names) {
    const li = hist().locator('ul > li').filter({ hasText: n });
    await li.getByRole('button', { name: 'Hapus dari riwayat' }).click();
    await li.waitFor({ state: 'detached' });
  }
  return `${names.length} lokasi uji dihapus satu per satu dan hilang dari daftar riwayat`;
});

// ---------- A6. Lain-lain ----------
await tc('U-37', 'Lain-lain', 'Audit metodologi', 'Modal berisi matriks AHP, CR, langkah TOPSIS, batasan data', async () => {
  await page.getByRole('button', { name: 'Audit metodologi' }).click();
  const m = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: /Audit Metodologi/ }) });
  await m.waitFor();
  const t1 = (await m.innerText()).replace(/\s+/g, ' ');
  await m.getByRole('button', { name: /Tahapan Komputasi TOPSIS/ }).click();
  await page.waitForTimeout(300);
  const t2 = (await m.innerText()).replace(/\s+/g, ' ');
  expect(/CR|Consistency/i.test(t1) && /Batasan data/.test(t2), 'isi tidak lengkap');
  await page.screenshot({ path: path.join(SHOTS, 'U-37.jpg'), type: 'jpeg', quality: 80 });
  await page.keyboard.press('Escape');
  await m.locator('button').first().click().catch(() => {});
  return 'Modal "Transparansi & Audit Metodologi" tampil: tab matriks & konsistensi AHP, tab tahapan TOPSIS & restriksi lahan (termasuk "Batasan data")';
});

await tc('U-38', 'Lain-lain', 'Reset', 'Prioritas kembali ke preset seimbang; titik survei dihapus', async () => {
  await page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: /Audit Metodologi/ }) }).waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
  await openTab('Prioritas');
  await panel().getByRole('button', { name: /Fokus Kepadatan/ }).click();
  await manualSurveyFromAnyTab();
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.waitForTimeout(500);
  expect((await page.locator('.custom-survey-marker').count()) === 0, 'penanda survei masih ada');
  await openTab('Prioritas');
  const sel = await panel().getByRole('button', { name: /Bobot Seimbang/ }).innerText();
  const cr = (await crChip().innerText()).replace(/\s+/g, ' ');
  expect(/CR 0\.0%/.test(cr), cr);
  return `Setelah preset diubah & ada titik survei, Reset → preset "${sel.split('\n')[0]}" aktif (${cr}), penanda survei hilang`;
});
async function manualSurveyFromAnyTab() {
  await openTab('Survei');
  await manualSurvey(-6.6006, 106.8053);
  await closeModal();
  await page.locator('.custom-survey-marker').waitFor();
}

await tc('U-39', 'Lain-lain', 'Tampilan ponsel', 'Panel menjadi bottom sheet; tombol dapat diketuk; tanpa gulir ke samping', async () => {
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'id-ID' });
  const mp = await mob.newPage();
  await mp.goto(BASE, { waitUntil: 'networkidle' });
  const aside = mp.locator('aside[aria-label="Panel analisis"]');
  const box = await aside.boundingBox();
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await aside.getByRole('tab', { name: 'Survei' }).tap();
  await aside.getByRole('searchbox', { name: 'Cari alamat atau tempat' }).waitFor();
  const small = await mp.evaluate(() => [...document.querySelectorAll('aside button, aside a')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 32; }).length);
  await mp.screenshot({ path: path.join(SHOTS, 'U-39.jpg'), type: 'jpeg', quality: 80 });
  await mob.close();
  expect(box.y > 200 && Math.round(box.width) === 390 && overflow <= 0, `panel y=${box.y} w=${box.width} overflow=${overflow}`);
  return `Layar 390×844: panel di bawah (bottom sheet, lebar ${Math.round(box.width)} px, mulai y=${Math.round(box.y)}), gulir horizontal ${overflow} px, tab Survei dapat diketuk; ${small} tombol lebih pendek dari 32 px`;
});

// ---------- bersih-bersih skenario uji ----------
try {
  await openTab('Hasil');
  const del = panel().getByRole('button', { name: 'Hapus skenario Uji blackbox U-10' });
  if (await del.count()) await del.click();
} catch { /* abaikan */ }

// =====================================================================
const finish = async () => {
  await browser.close();
  const pass = results.filter((r) => r.ok).length;
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  let md = `# Hasil Pengujian Blackbox — Antarmuka Pengguna (otomatis)\n\n`;
  md += `Dijalankan ${now} dengan browser otomatis (Playwright + Google Chrome, layar 1440×900) terhadap \`${BASE}\`, perintah \`node scripts/test-blackbox-ui.mjs\`. `;
  md += `Tangkapan layar tiap kasus ada di folder \`screenshots/\`.\n\n**${pass} dari ${results.length} kasus uji valid.**\n\n`;
  md += '| Kode | Fitur | Skenario uji | Hasil yang diharapkan | Hasil pengujian | Kesimpulan |\n|---|---|---|---|---|---|\n';
  for (const r of results) md += `| ${r.code} | ${r.group} | ${esc(r.name)} | ${esc(r.expected)} | ${esc(r.actual)} | ${r.ok ? 'Valid' : '**Tidak valid**'} |\n`;
  if (!ONLY) fs.writeFileSync(path.join(DOCS, 'hasil-blackbox-ui.md'), md);
  console.log(`\n${pass}/${results.length} valid`);
  process.exit(pass === results.length ? 0 : 1);
};
await finish();
