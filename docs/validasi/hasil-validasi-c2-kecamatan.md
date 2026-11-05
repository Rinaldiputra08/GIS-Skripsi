# Hasil Validasi & Analisis Sensitivitas Model AHP-TOPSIS

Dibuat otomatis oleh `scripts/validate-model.mjs` pada 5/11/2026, 13.55.55 WIB.

Data: 1249 titik grid (1165 layak, sel 300 m), 339 kedai kopi eksisting di Kota Bogor (328 terpetakan ke sel layak), pusat keramaian 62 titik (lama) / 125 titik (baru, + kampus, rumah sakit, perkantoran). Kelas: 15% teratas tinggi, 35% berikutnya sedang. Batas jenuh C1 800 m.

## A. Validasi sisi permintaan (C2–C4)

Kedai eksisting dipakai sebagai bukti lapangan adanya pasar. Bobot C1 dinolkan (C1 diukur dari kedai itu sendiri sehingga bias), bobot C2–C4 mengikuti preset lalu dinormalisasi. Harapan acak: 15% kedai di kelas tinggi, 35% di sedang. Lift = proporsi observasi ÷ harapan acak (> 1 berarti model lebih baik dari acak).

| Preset | Data C4 | Kedai di kelas tinggi | Lift tinggi | Kedai di tinggi+sedang | Lift tinggi+sedang | p (binomial) |
|---|---|---|---|---|---|---|
| Bobot Seimbang (Default) | lama | 148/328 (45.1%) | 3.01 | 304/328 (92.7%) | 1.85 | < 0,001 |
| Bobot Seimbang (Default) | baru | 201/328 (61.3%) | 4.09 | 316/328 (96.3%) | 1.93 | < 0,001 |
| Fokus Minim Kompetisi (Market Gap) | lama | 139/328 (42.4%) | 2.83 | 286/328 (87.2%) | 1.74 | < 0,001 |
| Fokus Minim Kompetisi (Market Gap) | baru | 188/328 (57.3%) | 3.82 | 314/328 (95.7%) | 1.91 | < 0,001 |
| Fokus Aksesibilitas & Keramaian | lama | 139/328 (42.4%) | 2.83 | 286/328 (87.2%) | 1.74 | < 0,001 |
| Fokus Aksesibilitas & Keramaian | baru | 191/328 (58.2%) | 3.88 | 314/328 (95.7%) | 1.91 | < 0,001 |
| Fokus Kepadatan Penduduk | lama | 133/328 (40.5%) | 2.70 | 288/328 (87.8%) | 1.76 | < 0,001 |
| Fokus Kepadatan Penduduk | baru | 181/328 (55.2%) | 3.68 | 296/328 (90.2%) | 1.80 | < 0,001 |

## B. Validasi popularitas (jumlah ulasan Google, data Kaggle)

Korelasi peringkat Spearman antara jumlah ulasan kedai dan V_i sisi permintaan pada sel kedai. Popularitas juga dipengaruhi faktor non-lokasi (harga, produk, promosi), sehingga korelasi lemah-sedang sudah wajar.

| Preset | n | ρ Spearman | p | Median ulasan: kelas tinggi | sedang | rendah |
|---|---|---|---|---|---|---|
| Bobot Seimbang (Default) | 83 | -0.011 | 0,922 | 340 (n=55) | 302 (n=24) | 469 (n=4) |
| Fokus Minim Kompetisi (Market Gap) | 83 | -0.077 | 0,491 | 310 (n=51) | 316 (n=29) | 597 (n=3) |
| Fokus Aksesibilitas & Keramaian | 83 | -0.074 | 0,504 | 288 (n=48) | 341 (n=31) | 422 (n=4) |
| Fokus Kepadatan Penduduk | 83 | -0.006 | 0,958 | 306 (n=50) | 383 (n=28) | 194 (n=5) |

## C. Perilaku model penuh (C1–C4): rekomendasi mengarah ke celah pasar

Dengan C1 aktif, model sengaja menurunkan nilai sel yang sudah padat kedai. Tabel ini menunjukkan seberapa banyak kedai eksisting yang selnya tetap berkelas tinggi, dan jarak rata-rata sel kelas tinggi ke kedai terdekat.

| Preset | Bobot C1/C2/C3/C4 | CR | Kedai di sel kelas tinggi | Median C1 sel kelas tinggi | Median C4 sel kelas tinggi | Median C1 semua sel |
|---|---|---|---|---|---|---|
| Bobot Seimbang (Default) | 0.250 / 0.250 / 0.250 / 0.250 | 0.00% | 0/328 (0.0%) | 643 m | 469 m | 643 m |
| Fokus Minim Kompetisi (Market Gap) | 0.455 / 0.141 / 0.141 / 0.263 | 0.38% | 0/328 (0.0%) | 889 m | 589 m | 643 m |
| Fokus Aksesibilitas & Keramaian | 0.096 / 0.161 / 0.277 / 0.466 | 1.15% | 152/328 (46.3%) | 196 m | 191 m | 643 m |
| Fokus Kepadatan Penduduk | 0.167 / 0.500 / 0.167 / 0.167 | 0.00% | 25/328 (7.6%) | 521 m | 378 m | 643 m |

## D. Analisis sensitivitas

### D1. Antar preset bobot

ρ = korelasi Spearman V_i seluruh sel layak; J = indeks Jaccard himpunan sel kelas tinggi (1 = identik).

| | balanced | gap_focus | traffic_focus | population_focus |
|---|---|---|---|---|
| balanced | – | ρ 0.63 / J 0.40 | ρ 0.83 / J 0.17 | ρ 0.92 / J 0.63 |
| gap_focus | ρ 0.63 / J 0.40 | – | ρ 0.29 / J 0.06 | ρ 0.51 / J 0.30 |
| traffic_focus | ρ 0.83 / J 0.17 | ρ 0.29 / J 0.06 | – | ρ 0.83 / J 0.25 |
| population_focus | ρ 0.92 / J 0.63 | ρ 0.51 / J 0.30 | ρ 0.83 / J 0.25 | – |

### D2. Perubahan bobot satu-per-satu (preset seimbang)

Bobot satu kriteria diubah, bobot lain disesuaikan proporsional agar total tetap 1. Dibandingkan dengan hasil dasar.

| Kriteria | Perubahan | Bobot baru | ρ Spearman | Jaccard kelas tinggi | 10 teratas tetap | Sel berganti kelas |
|---|---|---|---|---|---|---|
| C1 | -20% | 0.200 / 0.267 / 0.267 / 0.267 | 0.968 | 0.61 | 9/10 | 15.5% |
| C1 | -10% | 0.225 / 0.258 / 0.258 / 0.258 | 0.991 | 0.77 | 10/10 | 8.6% |
| C1 | +10% | 0.275 / 0.242 / 0.242 / 0.242 | 0.991 | 0.85 | 10/10 | 8.9% |
| C1 | +20% | 0.300 / 0.233 / 0.233 / 0.233 | 0.965 | 0.73 | 10/10 | 15.8% |
| C2 | -20% | 0.267 / 0.200 / 0.267 / 0.267 | 0.998 | 0.93 | 10/10 | 2.4% |
| C2 | -10% | 0.258 / 0.225 / 0.258 / 0.258 | 0.999 | 0.98 | 10/10 | 0.9% |
| C2 | +10% | 0.242 / 0.275 / 0.242 / 0.242 | 0.999 | 0.94 | 10/10 | 2.1% |
| C2 | +20% | 0.233 / 0.300 / 0.233 / 0.233 | 0.996 | 0.90 | 9/10 | 4.6% |
| C3 | -20% | 0.267 / 0.267 / 0.200 / 0.267 | 0.978 | 0.74 | 8/10 | 11.8% |
| C3 | -10% | 0.258 / 0.258 / 0.225 / 0.258 | 0.994 | 0.88 | 9/10 | 6.7% |
| C3 | +10% | 0.242 / 0.242 / 0.275 / 0.242 | 0.995 | 0.87 | 9/10 | 4.6% |
| C3 | +20% | 0.233 / 0.233 / 0.300 / 0.233 | 0.983 | 0.78 | 9/10 | 10.1% |
| C4 | -20% | 0.267 / 0.267 / 0.267 / 0.200 | 0.984 | 0.78 | 9/10 | 10.3% |
| C4 | -10% | 0.258 / 0.258 / 0.258 / 0.225 | 0.996 | 0.90 | 9/10 | 5.0% |
| C4 | +10% | 0.242 / 0.242 / 0.242 / 0.275 | 0.996 | 0.87 | 9/10 | 4.1% |
| C4 | +20% | 0.233 / 0.233 / 0.233 / 0.300 | 0.985 | 0.77 | 9/10 | 8.8% |

### D3. Batas jenuh C1 (preset seimbang)

Pembanding: batas jenuh 800 m (nilai dipakai).

| Batas jenuh C1 | ρ Spearman | Jaccard kelas tinggi | 10 teratas tetap | Sel berganti kelas | Median C1 sel kelas tinggi | Median C4 sel kelas tinggi |
|---|---|---|---|---|---|---|
| nonaktif | 0.773 | 0.38 | 2/10 | 28.2% | 1284 m | 794 m |
| 500 m | 0.976 | 0.58 | 3/10 | 13.7% | 438 m | 371 m |
| 800 m | 1.000 | 1.00 | 10/10 | 0.0% | 643 m | 469 m |
| 1200 m | 0.979 | 0.68 | 6/10 | 10.3% | 831 m | 574 m |
| 1600 m | 0.943 | 0.56 | 4/10 | 15.9% | 932 m | 641 m |
