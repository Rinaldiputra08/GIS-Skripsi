/**
 * Parameter sistem yang dapat diubah admin (tabel app_settings di Supabase).
 *
 * Modul ini dipakai di server DAN klien. Nilai aktif disimpan di variabel modul:
 *  - server: diisi dari database sebelum menghitung (lihat loadSettings di lib/settings-db.ts)
 *  - klien : diisi dari respons /api/layers/overview saat halaman dimuat
 * Bila database belum siap, DEFAULT_SETTINGS (nilai yang dipakai pada skripsi) berlaku.
 */
export interface AppSettings {
  tierHighPct: number;     // % titik layak teratas (menurut peringkat Vi) -> potensi tinggi
  tierMediumPct: number;   // % berikutnya -> potensi sedang; sisanya rendah
  denseThreshold: number;  // kepadatan (jiwa/km²) dianggap padat pada laporan survei
  cellMeters: number;      // sisi sel grid (m)
  floorC1: number;         // batas bawah jarak C1 (m)
  floorC3: number;         // batas bawah jarak C3 (m)
  floorC4: number;         // batas bawah jarak C4 (m)
  c1Cap: number;           // batas jenuh C1 (m); 0 = nonaktif
}

export const DEFAULT_SETTINGS: AppSettings = {
  tierHighPct: 15,
  tierMediumPct: 35,
  denseThreshold: 11000,
  cellMeters: 300,
  floorC1: 50,
  floorC3: 30,
  floorC4: 40,
  c1Cap: 800,
};

/**
 * Nilai C1 yang dipakai TOPSIS. Jarak di atas batas jenuh dianggap sama baiknya: lokasi sudah di
 * luar jangkauan persaingan langsung (±10 menit jalan kaki), sehingga menjauh lagi dari kompetitor
 * tidak menambah nilai, dan justru biasanya berarti menjauh dari pasar. Jarak asli tetap ditampilkan.
 */
export function c1Effective(distance: number): number {
  const cap = current.c1Cap;
  return cap > 0 ? Math.min(distance, cap) : distance;
}

/** Kunci di tabel app_settings -> properti AppSettings */
export const SETTING_KEYS: Record<string, keyof AppSettings> = {
  tier_high_pct: 'tierHighPct',
  tier_medium_pct: 'tierMediumPct',
  dense_threshold: 'denseThreshold',
  cell_meters: 'cellMeters',
  floor_c1: 'floorC1',
  floor_c3: 'floorC3',
  floor_c4: 'floorC4',
  c1_cap: 'c1Cap',
};

/** Parameter yang memengaruhi isi grid_points (perlu "Terapkan" agar berlaku) */
export const GRID_AFFECTING: (keyof AppSettings)[] = ['cellMeters', 'floorC1', 'floorC3', 'floorC4'];

export interface SettingMeta {
  key: keyof AppSettings;
  label: string;
  hint: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  affectsGrid: boolean;
}

export const SETTING_META: SettingMeta[] = [
  { key: 'tierHighPct', label: 'Kelas potensi tinggi', hint: 'Persentase titik layak dengan peringkat Vi teratas yang dikategorikan potensi tinggi. Skor Vi bersifat relatif, sehingga kelas ditentukan dari peringkat (kuantil), bukan angka Vi tetap.', unit: '% teratas', min: 5, max: 40, step: 1, affectsGrid: false },
  { key: 'tierMediumPct', label: 'Kelas potensi sedang', hint: 'Persentase titik berikutnya (setelah kelas tinggi) yang dikategorikan potensi sedang. Sisanya potensi rendah.', unit: '% berikutnya', min: 10, max: 60, step: 1, affectsGrid: false },
  { key: 'denseThreshold', label: 'Ambang wilayah padat', hint: 'Kepadatan kelurahan (atau kecamatan bila data kelurahan belum ada) yang dianggap padat pada narasi laporan survei lokasi.', unit: 'jiwa/km²', min: 1000, max: 50000, step: 500, affectsGrid: false },
  { key: 'cellMeters', label: 'Ukuran sel grid', hint: 'Sisi sel persegi pada Spatial Grid Sampling. Makin kecil makin detail, makin banyak titik.', unit: 'meter', min: 150, max: 1000, step: 50, affectsGrid: true },
  { key: 'floorC1', label: 'Batas bawah jarak C1', hint: 'Jarak ke kompetitor lebih kecil dari ini dibulatkan ke nilai ini (menghindari nilai 0).', unit: 'meter', min: 10, max: 500, step: 5, affectsGrid: true },
  { key: 'floorC3', label: 'Batas bawah jarak C3', hint: 'Jarak ke jalan utama lebih kecil dari ini dibulatkan ke nilai ini.', unit: 'meter', min: 10, max: 500, step: 5, affectsGrid: true },
  { key: 'floorC4', label: 'Batas bawah jarak C4', hint: 'Jarak ke simpul keramaian lebih kecil dari ini dibulatkan ke nilai ini.', unit: 'meter', min: 10, max: 500, step: 5, affectsGrid: true },
  { key: 'c1Cap', label: 'Batas jenuh jarak C1', hint: 'Jarak ke kompetitor di atas nilai ini dianggap sama baiknya (sudah di luar jangkauan persaingan, ±10 menit jalan kaki). Mencegah sistem mengutamakan area sepi yang jauh dari pasar. Isi 0 untuk menonaktifkan.', unit: 'meter', min: 0, max: 5000, step: 50, affectsGrid: false },
];

let current: AppSettings = { ...DEFAULT_SETTINGS };

export function getSettings(): AppSettings {
  return current;
}

export function applySettings(s: Partial<AppSettings> | null | undefined): AppSettings {
  current = { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  return current;
}

export type Tier = 'high' | 'medium' | 'low';

/**
 * Kategori potensi dari PERINGKAT (klasifikasi kuantil). index = posisi 0-based di antara n titik layak
 * yang sudah diurutkan menurut Vi. Dipakai karena Vi relatif: sebarannya berubah mengikuti bobot dan
 * data, sehingga ambang Vi tetap akan memberi jumlah "tinggi" yang tidak konsisten.
 */
export function tierOfRank(index: number, n: number): Tier {
  const high = Math.ceil((n * current.tierHighPct) / 100);
  const medium = Math.ceil((n * (current.tierHighPct + current.tierMediumPct)) / 100);
  if (index < high) return 'high';
  if (index < medium) return 'medium';
  return 'low';
}

/** Validasi + normalisasi parameter dari input admin. Mengembalikan pesan galat berbahasa Indonesia. */
export function validateSettings(input: Record<string, unknown>, base: AppSettings): { ok: true; value: AppSettings } | { ok: false; error: string } {
  const next: AppSettings = { ...base };
  for (const m of SETTING_META) {
    if (input[m.key] === undefined) continue;
    const n = Number(input[m.key]);
    if (!Number.isFinite(n) || n < m.min || n > m.max) {
      return { ok: false, error: `${m.label} harus berada di antara ${m.min} dan ${m.max}.` };
    }
    next[m.key] = n;
  }
  if (next.c1Cap > 0 && next.c1Cap <= next.floorC1) {
    return { ok: false, error: 'Batas jenuh C1 harus lebih besar dari batas bawah C1 (atau 0 untuk nonaktif).' };
  }
  if (next.tierHighPct + next.tierMediumPct > 90) {
    return { ok: false, error: 'Jumlah kelas tinggi + sedang maksimal 90% agar tetap ada kelas rendah.' };
  }
  return { ok: true, value: next };
}
