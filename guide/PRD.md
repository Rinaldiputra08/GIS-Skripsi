# Product Requirements Document (PRD)

## 1. Overview
Sistem Informasi Geografis (SIG) berbasis web untuk menganalisis celah pasar (*market gap/blank spot*) lokasi kedai kopi (*coffee shop*) baru di wilayah administratif Kota Bogor. Sistem ini menerapkan integrasi metode *Analytic Hierarchy Process* (AHP) untuk pembobotan preferensi kriteria dan *Technique for Order Preference by Similarity to Ideal Solution* (TOPSIS) untuk perangkingan kandidat lokasi berbasis *Spatial Grid Sampling*.

## 2. Tujuan & Sasaran
- Mengeliminasi bias intuisi dalam penentuan lokasi bisnis dengan pendekatan kuantitatif keruangan.
- Memberikan rekomendasi lokasi alternatif terbaik secara transparan berdasarkan 4 kriteria spasial.
- Membantu calon pelaku UMKM kopi dan investor mengidentifikasi area strategis berpotensi tinggi dengan tingkat kompetisi rendah di Kota Bogor.

## 3. Ruang Lingkup Sistem
- **Wilayah Cakupan:** Batas administratif 6 kecamatan Kota Bogor (Bogor Barat, Bogor Tengah, Bogor Selatan, Bogor Timur, Bogor Utara, Tanah Sareal).
- **Entitas Bisnis:** Kedai kopi (*coffee shop*).
- **Kriteria Spasial:**
  1. Jarak ke Kompetitor Terdekat (C1 - *Benefit*)
  2. Kepadatan / Jumlah Penduduk Kecamatan (C2 - *Benefit*)
  3. Jarak ke Jaringan Jalan Utama Terdekat (C3 - *Cost*)
  4. Jarak ke Simpul Keramaian Terdekat (C4 - *Cost*)
- **Batasan Masalah:**
  - Tidak mencakup evaluasi kriteria non-spasial (harga sewa properti, daya beli riil individu, izin usaha mikro, rating rasa).
  - Target platform berupa aplikasi web responsif (desktop & mobile browser).

## 4. Fitur Utama
1. **Interactive Spatial Map Canvas:**
   - Visualisasi peta Kota Bogor menggunakan Leaflet.js / React-Leaflet.
   - *Layer toggle* untuk menampilkan titik kompetitor eksisting, jalan utama, pusat keramaian, dan poligon kecamatan.
   - *Heatmap / Clustered Layer* titik kandidat hasil rekomendasi.
2. **Dynamic AHP Preference Form:**
   - Antarmuka formulir interaktif perbandingan berpasangan antarkriteria (Skala Saaty 1–9).
   - Validasi otomatis rasio konsistensi (*Consistency Ratio* / CR <= 0.1). Jika tidak konsisten, sistem meminta penyesuaian bobot sebelum kalkulasi dijalankan.
3. **TOPSIS Ranking Engine:**
   - Normalisasi matriks keputusan dari ribuan titik grid kandidat.
   - Kalkulasi solusi ideal positif (A⁺) dan negatif (A⁻).
   - Perhitungan jarak Euclidean serta penentuan nilai preferensi (Vi ∈ [0, 1]).
4. **Gradasi Warna & Detail Rekomendasi:**
   - Titik grid diwarnai berdasarkan kuantil nilai Vi (Hijau: Sangat Direkomendasikan, Kuning: Netral, Merah: Kurang Direkomendasikan).
   - *Popup inspection* saat titik diklik: menampilkan koordinat, kecamatan, jarak ke kompetitor terdekat, jarak ke jalan utama, jarak ke keramaian, dan estimasi populasi.
5. **Ringkasan Top-N Rekomendasi:**
   - Panel samping yang menyajikan daftar peringkat 10 titik koordinat terbaik beserta skor preferensinya.

## 5. Alur Pengguna (User Journey)
1. Pengguna mengakses aplikasi web yang di-deploy di Vercel.
2. Pengguna melihat peta awal Kota Bogor berisi sebaran kompetitor eksisting dan batas kecamatan.
3. Pengguna membuka panel analisis dan menentukan tingkat kepentingan antarkriteria pada matriks berpasangan AHP.
4. Pengguna menekan tombol **"Hitung Rekomendasi"**.
5. Client-side memvalidasi CR <= 0.1. Jika valid, bobot dikirim ke Next.js Server (API Route / Server Action).
6. Next.js Server menjalankan algoritma TOPSIS terhadap matriks `grid_points` yang ditarik dari Supabase.
7. Server merespons daftar titik grid beserta skor Vi kembali ke antarmuka.
8. Peta merender layer gradasi warna dan menyajikan tabel Top 10 lokasi celah pasar.