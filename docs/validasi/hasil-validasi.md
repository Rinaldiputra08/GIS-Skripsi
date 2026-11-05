# Hasil Validasi & Analisis Sensitivitas Model AHP-TOPSIS

Dibuat otomatis oleh `scripts/validate-model.mjs` pada 5/11/2026, 15.38.15 WIB.

Data: 1249 titik grid (1165 layak, sel 300 m), 339 kedai kopi eksisting di Kota Bogor (328 terpetakan ke sel layak), pusat keramaian 62 titik (lama) / 125 titik (baru, + kampus, rumah sakit, perkantoran). Kelas: 15% teratas tinggi, 35% berikutnya sedang. Batas jenuh C1 800 m. C2: kepadatan per kelurahan (68 kelurahan, 68 nilai berbeda).

Konfigurasi data yang dibandingkan: **awal** = C4 tanpa kampus/RS/kantor + C2 per kecamatan; **C4 baru** = + kampus, rumah sakit, perkantoran; **C4 + C2 kelurahan** = konfigurasi akhir yang dipakai aplikasi.

## A. Validasi sisi permintaan (C2–C4)

Kedai eksisting dipakai sebagai bukti lapangan adanya pasar. Bobot C1 dinolkan (C1 diukur dari kedai itu sendiri sehingga bias), bobot C2–C4 mengikuti preset lalu dinormalisasi. Harapan acak: 15% kedai di kelas tinggi, 35% di sedang. Lift = proporsi observasi ÷ harapan acak (> 1 berarti model lebih baik dari acak).

| Preset | Data | Kedai di kelas tinggi | Lift tinggi | Kedai di tinggi+sedang | Lift tinggi+sedang | p (binomial) |
|---|---|---|---|---|---|---|
| Bobot Seimbang (Default) | awal | 148/328 (45.1%) | 3.01 | 304/328 (92.7%) | 1.85 | < 0,001 |
| Bobot Seimbang (Default) | C4 baru | 201/328 (61.3%) | 4.09 | 316/328 (96.3%) | 1.93 | < 0,001 |
| Bobot Seimbang (Default) | C4 + C2 kelurahan | 140/328 (42.7%) | 2.85 | 298/328 (90.9%) | 1.82 | < 0,001 |
| Fokus Minim Kompetisi (Market Gap) | awal | 139/328 (42.4%) | 2.83 | 286/328 (87.2%) | 1.74 | < 0,001 |
| Fokus Minim Kompetisi (Market Gap) | C4 baru | 188/328 (57.3%) | 3.82 | 314/328 (95.7%) | 1.91 | < 0,001 |
| Fokus Minim Kompetisi (Market Gap) | C4 + C2 kelurahan | 124/328 (37.8%) | 2.52 | 310/328 (94.5%) | 1.89 | < 0,001 |
| Fokus Aksesibilitas & Keramaian | awal | 139/328 (42.4%) | 2.83 | 286/328 (87.2%) | 1.74 | < 0,001 |
| Fokus Aksesibilitas & Keramaian | C4 baru | 191/328 (58.2%) | 3.88 | 314/328 (95.7%) | 1.91 | < 0,001 |
| Fokus Aksesibilitas & Keramaian | C4 + C2 kelurahan | 136/328 (41.5%) | 2.76 | 315/328 (96.0%) | 1.92 | < 0,001 |
| Fokus Kepadatan Penduduk | awal | 133/328 (40.5%) | 2.70 | 288/328 (87.8%) | 1.76 | < 0,001 |
| Fokus Kepadatan Penduduk | C4 baru | 181/328 (55.2%) | 3.68 | 296/328 (90.2%) | 1.80 | < 0,001 |
| Fokus Kepadatan Penduduk | C4 + C2 kelurahan | 119/328 (36.3%) | 2.42 | 264/328 (80.5%) | 1.61 | < 0,001 |

## B. Validasi popularitas (jumlah ulasan Google, data Kaggle)

Korelasi peringkat Spearman antara jumlah ulasan kedai dan V_i sisi permintaan pada sel kedai. Popularitas juga dipengaruhi faktor non-lokasi (harga, produk, promosi), sehingga korelasi lemah-sedang sudah wajar.

| Preset | n | ρ Spearman | p | Median ulasan: kelas tinggi | sedang | rendah |
|---|---|---|---|---|---|---|
| Bobot Seimbang (Default) | 83 | -0.057 | 0,607 | 256 (n=22) | 358 (n=46) | 499 (n=15) |
| Fokus Minim Kompetisi (Market Gap) | 83 | -0.107 | 0,336 | 245 (n=19) | 394 (n=58) | 430 (n=6) |
| Fokus Aksesibilitas & Keramaian | 83 | -0.115 | 0,300 | 288 (n=24) | 329 (n=56) | 597 (n=3) |
| Fokus Kepadatan Penduduk | 83 | -0.056 | 0,616 | 256 (n=18) | 374 (n=41) | 400 (n=24) |

## C. Perilaku model penuh (C1–C4): rekomendasi mengarah ke celah pasar

Dengan C1 aktif, model sengaja menurunkan nilai sel yang sudah padat kedai. Tabel ini menunjukkan seberapa banyak kedai eksisting yang selnya tetap berkelas tinggi, dan jarak rata-rata sel kelas tinggi ke kedai terdekat.

| Preset | Bobot C1/C2/C3/C4 | CR | Kedai di sel kelas tinggi | Median C1 sel kelas tinggi | Median C4 sel kelas tinggi | Median C1 semua sel |
|---|---|---|---|---|---|---|
| Bobot Seimbang (Default) | 0.250 / 0.250 / 0.250 / 0.250 | 0.00% | 85/328 (25.9%) | 313 m | 319 m | 643 m |
| Fokus Minim Kompetisi (Market Gap) | 0.455 / 0.141 / 0.141 / 0.263 | 0.38% | 0/328 (0.0%) | 864 m | 584 m | 643 m |
| Fokus Aksesibilitas & Keramaian | 0.096 / 0.161 / 0.277 / 0.466 | 1.15% | 119/328 (36.3%) | 229 m | 240 m | 643 m |
| Fokus Kepadatan Penduduk | 0.167 / 0.500 / 0.167 / 0.167 | 0.00% | 118/328 (36.0%) | 273 m | 350 m | 643 m |

## D. Analisis sensitivitas

### D1. Antar preset bobot

ρ = korelasi Spearman V_i seluruh sel layak; J = indeks Jaccard himpunan sel kelas tinggi (1 = identik).

| | balanced | gap_focus | traffic_focus | population_focus |
|---|---|---|---|---|
| balanced | – | ρ 0.57 / J 0.18 | ρ 0.93 / J 0.58 | ρ 0.96 / J 0.72 |
| gap_focus | ρ 0.57 / J 0.18 | – | ρ 0.42 / J 0.06 | ρ 0.50 / J 0.11 |
| traffic_focus | ρ 0.93 / J 0.58 | ρ 0.42 / J 0.06 | – | ρ 0.87 / J 0.50 |
| population_focus | ρ 0.96 / J 0.72 | ρ 0.50 / J 0.11 | ρ 0.87 / J 0.50 | – |

### D2. Perubahan bobot satu-per-satu (preset seimbang)

Bobot satu kriteria diubah, bobot lain disesuaikan proporsional agar total tetap 1. Dibandingkan dengan hasil dasar.

| Kriteria | Perubahan | Bobot baru | ρ Spearman | Jaccard kelas tinggi | 10 teratas tetap | Sel berganti kelas |
|---|---|---|---|---|---|---|
| C1 | -20% | 0.200 / 0.267 / 0.267 / 0.267 | 0.996 | 0.86 | 9/10 | 5.5% |
| C1 | -10% | 0.225 / 0.258 / 0.258 / 0.258 | 0.999 | 0.90 | 9/10 | 3.6% |
| C1 | +10% | 0.275 / 0.242 / 0.242 / 0.242 | 0.998 | 0.87 | 10/10 | 4.6% |
| C1 | +20% | 0.300 / 0.233 / 0.233 / 0.233 | 0.990 | 0.77 | 7/10 | 8.8% |
| C2 | -20% | 0.267 / 0.200 / 0.267 / 0.267 | 0.993 | 0.79 | 7/10 | 7.4% |
| C2 | -10% | 0.258 / 0.225 / 0.258 / 0.258 | 0.998 | 0.88 | 9/10 | 4.1% |
| C2 | +10% | 0.242 / 0.275 / 0.242 / 0.242 | 0.999 | 0.92 | 9/10 | 2.2% |
| C2 | +20% | 0.233 / 0.300 / 0.233 / 0.233 | 0.996 | 0.86 | 9/10 | 4.3% |
| C3 | -20% | 0.267 / 0.267 / 0.200 / 0.267 | 0.993 | 0.89 | 10/10 | 5.5% |
| C3 | -10% | 0.258 / 0.258 / 0.225 / 0.258 | 0.998 | 0.96 | 10/10 | 2.7% |
| C3 | +10% | 0.242 / 0.242 / 0.275 / 0.242 | 0.998 | 0.98 | 9/10 | 2.6% |
| C3 | +20% | 0.233 / 0.233 / 0.300 / 0.233 | 0.993 | 0.93 | 9/10 | 5.3% |
| C4 | -20% | 0.267 / 0.267 / 0.267 / 0.200 | 0.994 | 0.93 | 10/10 | 3.9% |
| C4 | -10% | 0.258 / 0.258 / 0.258 / 0.225 | 0.999 | 0.94 | 10/10 | 2.6% |
| C4 | +10% | 0.242 / 0.242 / 0.242 / 0.275 | 0.999 | 0.94 | 9/10 | 2.9% |
| C4 | +20% | 0.233 / 0.233 / 0.233 / 0.300 | 0.995 | 0.91 | 9/10 | 4.6% |

### D3. Batas jenuh C1 (preset seimbang)

Pembanding: batas jenuh 800 m (nilai dipakai).

| Batas jenuh C1 | ρ Spearman | Jaccard kelas tinggi | 10 teratas tetap | Sel berganti kelas | Median C1 sel kelas tinggi | Median C4 sel kelas tinggi |
|---|---|---|---|---|---|---|
| nonaktif | 0.912 | 0.58 | 0/10 | 17.4% | 467 m | 385 m |
| 500 m | 0.997 | 0.89 | 9/10 | 4.8% | 293 m | 312 m |
| 800 m | 1.000 | 1.00 | 10/10 | 0.0% | 313 m | 319 m |
| 1200 m | 0.996 | 0.88 | 9/10 | 5.0% | 340 m | 330 m |
| 1600 m | 0.989 | 0.81 | 7/10 | 7.4% | 359 m | 333 m |

### D4. Dampak C2 per kelurahan (dibanding C2 per kecamatan)

Data lain identik; hanya sumber C2 yang berbeda. Juga ditunjukkan korelasi Spearman C2 dengan kriteria lain pada sel layak (makin kecil makin independen).

| Preset | ρ Spearman | Jaccard kelas tinggi | 10 teratas tetap | Sel berganti kelas |
|---|---|---|---|---|
| Bobot Seimbang (Default) | 0.831 | 0.20 | 0/10 | 35.5% |
| Fokus Minim Kompetisi (Market Gap) | 0.969 | 0.66 | 4/10 | 13.4% |
| Fokus Aksesibilitas & Keramaian | 0.964 | 0.42 | 1/10 | 16.3% |
| Fokus Kepadatan Penduduk | 0.701 | 0.13 | 1/10 | 39.1% |

| C2 | ρ(C2, C1) | ρ(C2, C3) | ρ(C2, C4) |
|---|---|---|---|
| per kecamatan | -0.45 | -0.30 | -0.40 |
| per kelurahan | -0.44 | -0.50 | -0.52 |
