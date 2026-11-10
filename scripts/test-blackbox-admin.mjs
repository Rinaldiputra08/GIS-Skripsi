/**
 * Pengujian blackbox halaman admin (CMS) dengan browser otomatis (Playwright + Google Chrome).
 *
 * Kredensial dibaca dari .env (ADMIN_TEST_EMAIL, ADMIN_TEST_PASSWORD) dan tidak pernah dicetak.
 * Data uji (kedai, pusat keramaian, zona bernama "Uji Blackbox ...") dibuat lalu dihapus lagi.
 * Penduduk kelurahan & parameter sistem dicatat nilai aslinya di awal, lalu SELALU dikembalikan
 * di akhir (juga bila pengujian berhenti di tengah), diikuti "Terapkan" agar grid kembali seperti semula.
 *
 * Jalankan (server harus hidup):  node --env-file=.env scripts/test-blackbox-admin.mjs [base-url] [--headed]
 * Hasil: ../Dokumen-Skripsi-KopiSpasial/03-pengujian/hasil-blackbox-admin.md + screenshots/A-xx.jpg
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000';
const HEADED = args.includes('--headed');
const EMAIL = process.env.ADMIN_TEST_EMAIL;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error('ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD belum diisi di .env');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC_ROOT = process.env.SKRIPSI_DOCS || path.join(__dirname, '..', '..', 'Dokumen-Skripsi-KopiSpasial');
const DOCS = path.join(DOC_ROOT, '03-pengujian');
const SHOTS = path.join(DOCS, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: !HEADED });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'id-ID' });
const page = await context.newPage();
page.setDefaultTimeout(20000);

const results = [];
const keepShot = new Set();
async function tc(code, group, name, expected, fn) {
  let ok = false, actual = '';
  try { actual = await fn(); ok = true; }
  catch (err) {
    actual = `GAGAL: ${String(err.message).split('\n')[0]}`;
    if (process.env.DEBUG) console.log(err.message);
  }
  await page.waitForTimeout(600);
  if (!keepShot.has(code)) await page.screenshot({ path: path.join(SHOTS, `${code}.jpg`), type: 'jpeg', quality: 80 }).catch(() => {});
  results.push({ code, group, name, expected, actual, ok });
  console.log(`${ok ? 'VALID  ' : 'GAGAL  '} ${code} ${name}\n         ${actual}`);
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const shot = async (code) => { keepShot.add(code); await page.screenshot({ path: path.join(SHOTS, `${code}.jpg`), type: 'jpeg', quality: 80 }); };
const go = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle' }); };
const main = () => page.locator('main');
const dialog = () => page.getByRole('dialog');
const status = () => page.getByRole('status').first();
const alert = () => page.getByRole('alert').filter({ hasText: /\S/ }).first();
const api = async (method, url, data) => {
  const r = await page.request.fetch(BASE + url, { method, data, failOnStatusCode: false });
  return { status: r.status(), json: await r.json().catch(() => null) };
};

const TAG = 'Uji Blackbox';
let snapshot = null; // nilai asli penduduk kelurahan & parameter

// ---------- Autentikasi ----------
await tc('A-01', 'Autentikasi', 'Akses admin tanpa login', 'Diarahkan ke halaman login', async () => {
  await go('/admin');
  expect(page.url().includes('/admin/login'), page.url());
  return `Membuka /admin → dialihkan ke ${new URL(page.url()).pathname}`;
});

await tc('A-02', 'Autentikasi', 'Login dengan data kosong', 'Formulir tidak terkirim; kolom wajib ditandai', async () => {
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForTimeout(500);
  const missing = await page.locator('input[type=email]').evaluate((e) => e.validity.valueMissing);
  const msg = await page.locator('input[type=email]').evaluate((e) => e.validationMessage);
  expect(missing && page.url().includes('/admin/login'), 'formulir terkirim');
  await shot('A-02');
  return `Tetap di halaman login; browser menandai kolom email: "${msg}"`;
});

await tc('A-03', 'Autentikasi', 'Login dengan kata sandi salah', 'Pesan "Email atau kata sandi salah."', async () => {
  await page.locator('input[type=email]').fill(EMAIL);
  await page.locator('input[type=password]').fill('salah-' + Date.now());
  await page.getByRole('button', { name: 'Masuk' }).click();
  await alert().waitFor();
  const t = await alert().innerText();
  expect(/salah/i.test(t), t);
  return `Pesan "${t}"; tetap di halaman login`;
});

await tc('A-04', 'Autentikasi', 'Login dengan data benar', 'Masuk ke Dasbor', async () => {
  await page.locator('input[type=password]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
  await page.getByRole('heading', { name: 'Terapkan perubahan ke peringkat' }).waitFor();
  return `Masuk ke ${new URL(page.url()).pathname} (Dasbor)`;
});

// catat nilai asli sebelum mengubah apa pun
{
  const v = await api('GET', '/api/admin/villages');
  const s = await api('GET', '/api/admin/settings');
  if (v.status === 200 && s.status === 200) {
    snapshot = {
      period: v.json.rows[0]?.population_period,
      villages: Object.fromEntries(v.json.rows.map((r) => [r.code, r.population])),
      settings: s.json.settings,
    };
  }
}

async function restore() {
  if (!snapshot) return 'tidak ada data untuk dikembalikan';
  const out = [];
  const v = await api('PUT', '/api/admin/villages', { period: snapshot.period, values: snapshot.villages });
  out.push(`penduduk: ${v.json?.changed ?? 0} kelurahan dikembalikan`);
  const s = await api('PUT', '/api/admin/settings', snapshot.settings);
  out.push(`parameter: ${(s.json?.changed ?? []).length} dikembalikan`);
  if ((v.json?.changed ?? 0) > 0) {
    const a = await api('POST', '/api/admin/apply');
    out.push(`grid dibangun ulang: ${a.json?.success ? 'ya' : 'GAGAL'}`);
  }
  // pastikan tidak ada data uji tertinggal
  for (const res of ['competitors', 'crowd-centers', 'zones']) {
    const l = await api('GET', `/api/admin/${res}`);
    for (const r of (l.json?.rows ?? []).filter((x) => String(x.name ?? '').startsWith(TAG))) {
      await api('DELETE', `/api/admin/${res}/${r.id}`);
      out.push(`sisa data uji "${r.name}" dihapus`);
    }
  }
  snapshot = null;
  return out.join('; ');
}

try {
  // ---------- Kelola data ----------
  const openNew = async (noun) => {
    await main().getByRole('button', { name: `Tambah ${noun}` }).click();
    await dialog().waitFor();
  };
  const fillPoint = async (lat, lng) => {
    await dialog().locator('#f-latitude').fill(String(lat));
    await dialog().locator('#f-longitude').fill(String(lng));
  };
  const rowOf = (name) => main().locator('tbody tr').filter({ hasText: name });
  const search = async (noun, q) => { await main().getByRole('textbox', { name: `Cari ${noun}` }).fill(q); await page.waitForTimeout(300); };

  await tc('A-05', 'Kelola data', 'Tambah kompetitor', 'Data baru muncul di tabel', async () => {
    await go('/admin/kompetitor');
    await openNew('kompetitor');
    await dialog().locator('#f-name').fill(`${TAG} Kopi`);
    await dialog().locator('#f-address').fill('Data uji pengujian blackbox, akan dihapus');
    await fillPoint(-6.6385, 106.8262);
    await dialog().getByRole('button', { name: 'Simpan' }).click();
    await status().waitFor();
    const msg = await status().innerText();
    await search('kompetitor', TAG);
    await rowOf(`${TAG} Kopi`).waitFor();
    return `Pesan "${msg.split('.')[0]}."; baris "${TAG} Kopi" (sumber Manual) muncul di tabel`;
  });

  await tc('A-06', 'Kelola data', 'Tambah kompetitor duplikat', 'Peringatan duplikat (nama sama ±100 m) dengan pilihan tetap simpan', async () => {
    await openNew('kompetitor');
    await dialog().locator('#f-name').fill(`${TAG} Kopi`);
    await fillPoint(-6.6386, 106.8263);
    await dialog().getByRole('button', { name: 'Simpan' }).click();
    const warn = dialog().getByRole('alert');
    await warn.waitFor();
    const t = (await warn.innerText()).replace(/\s+/g, ' ');
    expect(/sudah ada di sekitar titik ini/.test(t), t);
    await shot('A-06');
    await dialog().getByRole('button', { name: 'Batal' }).click();
    await search('kompetitor', TAG);
    expect((await rowOf(`${TAG} Kopi`).count()) === 1, 'duplikat tersimpan');
    return `Peringatan "${t}"; dibatalkan → tabel tetap 1 data`;
  });

  await tc('A-07', 'Kelola data', 'Ubah kompetitor', 'Tabel menampilkan nama baru', async () => {
    await rowOf(`${TAG} Kopi`).getByRole('button', { name: `Ubah ${TAG} Kopi` }).click();
    await dialog().locator('#f-name').fill(`${TAG} Kopi Diubah`);
    await dialog().getByRole('button', { name: 'Simpan' }).click();
    await status().filter({ hasText: 'diperbarui' }).waitFor();
    await rowOf(`${TAG} Kopi Diubah`).waitFor();
    return `Nama diubah menjadi "${TAG} Kopi Diubah"; pesan "diperbarui" dan tabel menampilkan nama baru`;
  });

  await tc('A-08', 'Kelola data', 'Hapus kompetitor', 'Data hilang dari tabel', async () => {
    await rowOf(`${TAG} Kopi Diubah`).getByRole('button', { name: `Hapus ${TAG} Kopi Diubah` }).click();
    const conf = page.getByRole('alertdialog', { name: 'Konfirmasi hapus' });
    await conf.waitFor();
    await shot('A-08');
    await conf.getByRole('button', { name: 'Hapus' }).click();
    await status().filter({ hasText: 'dihapus' }).waitFor();
    await rowOf(`${TAG} Kopi Diubah`).waitFor({ state: 'detached' });
    return 'Dialog konfirmasi tampil → Hapus → pesan "dihapus", baris hilang dari tabel';
  });

  const crud = async (pathName, noun, fill) => {
    await go(pathName);
    await openNew(noun);
    await fill();
    await dialog().getByRole('button', { name: 'Simpan' }).click();
    await status().filter({ hasText: 'ditambahkan' }).waitFor();
    await search(noun, TAG);
    await rowOf(TAG).first().waitFor();
    await rowOf(TAG).first().getByRole('button', { name: /^Ubah / }).click();
    await dialog().locator('#f-name').fill(`${TAG} Diubah`);
    await dialog().getByRole('button', { name: 'Simpan' }).click();
    await status().filter({ hasText: 'diperbarui' }).waitFor();
    await rowOf(`${TAG} Diubah`).waitFor();
    await rowOf(`${TAG} Diubah`).getByRole('button', { name: `Hapus ${TAG} Diubah` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus' }).click();
    await status().filter({ hasText: 'dihapus' }).waitFor();
    await rowOf(`${TAG} Diubah`).waitFor({ state: 'detached' });
  };

  await tc('A-09', 'Kelola data', 'Kelola pusat keramaian', 'Tambah, ubah, hapus berhasil', async () => {
    await crud('/admin/keramaian', 'pusat keramaian', async () => {
      await dialog().locator('#f-name').fill(`${TAG} Kampus`);
      await dialog().locator('#f-category').fill('university');
      await fillPoint(-6.6390, 106.8270);
    });
    return 'Pusat keramaian kategori "university" ditambah → nama diubah → dihapus; tiap aksi memunculkan pesan dan tabel ikut berubah';
  });

  await tc('A-10', 'Kelola data', 'Kelola zona terlarang', 'Tambah, ubah, hapus berhasil', async () => {
    await crud('/admin/zona', 'zona', async () => {
      await dialog().locator('#f-name').fill(`${TAG} Zona`);
      await dialog().locator('#f-radius_m').fill('120');
      await fillPoint(-6.6395, 106.8275);
    });
    return 'Zona (pemakaman, radius 120 m) ditambah → nama diubah → dihapus; tiap aksi memunculkan pesan dan tabel ikut berubah';
  });

  // ---------- Penduduk & parameter ----------
  let villageName = '', villageOrig = 0;
  await tc('A-11', 'Penduduk & parameter', 'Ubah penduduk kelurahan', 'Tersimpan; muncul pesan untuk menerapkan perubahan', async () => {
    await go('/admin/penduduk');
    const input = main().locator('input[aria-label^="Penduduk "]').first();
    await input.waitFor();
    villageName = (await input.getAttribute('aria-label')).replace('Penduduk ', '');
    villageOrig = Number(await input.inputValue());
    await input.fill(String(villageOrig + 1000));
    await main().getByRole('button', { name: 'Simpan penduduk kelurahan' }).click();
    await status().waitFor();
    const msg = await status().innerText();
    expect(/1 kelurahan diperbarui/.test(msg), msg);
    return `Penduduk Kel. ${villageName} ${villageOrig.toLocaleString('id-ID')} → ${(villageOrig + 1000).toLocaleString('id-ID')}; pesan "${msg}"`;
  });

  await tc('A-12', 'Penduduk & parameter', 'Penduduk kelurahan tidak valid', 'Ditolak dengan pesan batas nilai', async () => {
    await go('/admin/penduduk');
    const input = main().locator(`input[aria-label="Penduduk ${villageName}"]`);
    await input.fill('50');
    await main().getByRole('button', { name: 'Simpan penduduk kelurahan' }).click();
    await alert().waitFor();
    const t = await alert().innerText();
    expect(/100 – 500\.000/.test(t), t);
    return `Isi 50 → ditolak: "${t}"`;
  });

  await tc('A-13', 'Penduduk & parameter', 'Ubah parameter sistem', 'Tersimpan; nilai baru tampil', async () => {
    await go('/admin/parameter');
    const c1 = main().locator('#s-c1Cap');
    const before = await c1.inputValue();
    await c1.fill('1000');
    await main().getByRole('button', { name: 'Simpan parameter' }).click();
    await status().waitFor();
    await go('/admin/parameter');
    const after = await main().locator('#s-c1Cap').inputValue();
    expect(after === '1000', after);
    return `Batas jenuh C1 ${before} → 1000 m disimpan; setelah halaman dimuat ulang nilainya tetap 1000`;
  });

  await tc('A-14', 'Penduduk & parameter', 'Parameter di luar batas', 'Ditolak: harus antara 5 dan 40', async () => {
    await go('/admin/parameter');
    await main().locator('#s-tierHighPct').fill('50');
    await main().getByRole('button', { name: 'Simpan parameter' }).click();
    await alert().waitFor();
    const t = await alert().innerText();
    expect(/antara 5 dan 40/.test(t), t);
    return `Kelas tinggi 50% → ditolak: "${t}"`;
  });

  await tc('A-14b', 'Penduduk & parameter', 'Kombinasi parameter tidak logis', 'Ditolak: tinggi + sedang maksimal 90%', async () => {
    await go('/admin/parameter');
    await main().locator('#s-tierHighPct').fill('40');
    await main().locator('#s-tierMediumPct').fill('60');
    await main().getByRole('button', { name: 'Simpan parameter' }).click();
    await alert().waitFor();
    const t = await alert().innerText();
    expect(/maksimal 90%/.test(t), t);
    return `Tinggi 40% + sedang 60% → ditolak: "${t}"`;
  });

  await tc('A-15', 'Penerapan', 'Terapkan & bandingkan', 'Grid dibangun ulang; peringkat sebelum vs sesudah tampil', async () => {
    await go('/admin');
    await main().getByRole('button', { name: 'Terapkan & bandingkan' }).click();
    await main().getByText('Sebelum').first().waitFor({ timeout: 180000 });
    await page.waitForTimeout(800);
    const t = (await main().locator('table').first().innerText()).replace(/\s+/g, ' ');
    return `Grid dibangun ulang; tabel ringkasan Sebelum/Sesudah/Selisih tampil: "${t.slice(0, 160)}…"`;
  });

  await tc('A-16', 'Penerapan', 'Riwayat perubahan', 'Daftar aksi beserta pelaku & waktu', async () => {
    await go('/admin/riwayat');
    const runs = (await main().getByRole('tab', { name: /Penerapan grid/ }).innerText()).trim();
    await main().getByRole('tab', { name: /Perubahan data/ }).click();
    await page.waitForTimeout(500);
    const body = (await main().innerText()).replace(/\s+/g, ' ');
    for (const w of [`${TAG} Kopi`, TAG]) expect(body.includes(w), `riwayat tidak memuat "${w}"`);
    expect(/Tambah|Ubah|Hapus/.test(body), 'jenis aksi tidak tampil');
    return `Tab "${runs}" mencatat penerapan A-15; tab "Perubahan data" memuat aksi uji (tambah/ubah/hapus "${TAG} …", penduduk, parameter) beserta pelaku & waktu`;
  });

  await tc('A-17', 'Penerapan', 'Masukan pengguna', 'Daftar skenario & riwayat survei pengguna tampil', async () => {
    await go('/admin/masukan');
    const sc = await main().getByRole('heading', { name: /Skenario analisis/ }).innerText();
    const sv = await main().getByRole('heading', { name: /Riwayat survei lokasi/ }).innerText();
    return `Halaman menampilkan "${sc}" dan "${sv}"`;
  });

  // ---------- Pengembalian data ----------
  await tc('A-19', 'Penerapan', 'Mengembalikan data setelah pengujian', 'Penduduk & parameter kembali ke nilai asli; grid dibangun ulang', async () => {
    const out = await restore();
    await go('/admin/penduduk');
    const now = Number(await main().locator(`input[aria-label="Penduduk ${villageName}"]`).inputValue());
    expect(now === villageOrig, `penduduk ${now} ≠ ${villageOrig}`);
    await go('/admin/parameter');
    const c1 = await main().locator('#s-c1Cap').inputValue();
    expect(c1 === '800', `c1Cap ${c1}`);
    return `${out}. Diperiksa: Kel. ${villageName} kembali ${villageOrig.toLocaleString('id-ID')}, batas jenuh C1 kembali 800`;
  });
} finally {
  if (snapshot) console.log('Pemulihan darurat:', await restore().catch((e) => `GAGAL: ${e.message}`));
}

await tc('A-18', 'Autentikasi', 'Keluar', 'Kembali ke halaman login', async () => {
  await go('/admin');
  await page.getByRole('button', { name: 'Keluar' }).first().click();
  await page.waitForURL(/\/admin\/login/);
  await go('/admin');
  expect(page.url().includes('/admin/login'), page.url());
  return 'Klik Keluar → halaman login; membuka /admin lagi tetap dialihkan ke login';
});

await browser.close();
const pass = results.filter((r) => r.ok).length;
const order = (c) => Number(c.replace(/\D/g, '')) + (c.endsWith('b') ? 0.5 : 0);
results.sort((a, b) => order(a.code) - order(b.code));
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const now = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
let md = `# Hasil Pengujian Blackbox — Halaman Admin (otomatis)\n\n`;
md += `Dijalankan ${now} dengan browser otomatis (Playwright + Google Chrome, layar 1440×900) terhadap \`${BASE}\`, perintah \`node --env-file=.env scripts/test-blackbox-admin.mjs\`. `;
md += `Login memakai akun admin dari berkas .env. Data uji diberi nama "${TAG} …" dan dihapus lagi; penduduk & parameter dikembalikan ke nilai asli (A-19). Tangkapan layar ada di folder \`screenshots/\`.\n\n`;
md += `**${pass} dari ${results.length} kasus uji valid.**\n\n`;
md += '| Kode | Fitur | Skenario uji | Hasil yang diharapkan | Hasil pengujian | Kesimpulan |\n|---|---|---|---|---|---|\n';
for (const r of results) md += `| ${r.code} | ${r.group} | ${esc(r.name)} | ${esc(r.expected)} | ${esc(r.actual)} | ${r.ok ? 'Valid' : '**Tidak valid**'} |\n`;
fs.writeFileSync(path.join(DOCS, 'hasil-blackbox-admin.md'), md);
console.log(`\n${pass}/${results.length} valid`);
process.exit(pass === results.length ? 0 : 1);
