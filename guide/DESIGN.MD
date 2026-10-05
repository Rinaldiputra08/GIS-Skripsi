# System Design Document

## 1. Arsitektur Sistem
Sistem dibangun menggunakan arsitektur **Fullstack Monorepo** berbasis Next.js:
- **Client (Frontend):** React Components (Next.js App Router) bertugas merender antarmuka pengguna, form AHP, state management, dan Web-GIS interaktif (Leaflet.js).
- **Server (Backend API):** Next.js API Routes / Server Actions bertindak sebagai mesin komputasi (menjalankan validasi matriks AHP dan algoritma TOPSIS) serta menjembatani komunikasi ke database.
- **Data & Spatial Layer (Database):** Supabase (PostgreSQL 15+ dengan ekstensi PostGIS). Bertanggung jawab menyimpan data relasional dan mengeksekusi komputasi spasial persisten (seperti `ST_Distance`).

+-------------------------------------------------+
|               Next.js (Vercel)                  |
|                                                 |
|  +-------------------+   +-------------------+  |
|  |   Client / UI     |   |   Server Actions  |  |
|  |  (React/Leaflet)  |<->|   (AHP & TOPSIS)  |  |
|  +-------------------+   +---------+---------+  |
+------------------------------------|------------+
                                     | @supabase/supabase-js
                                     v
+-------------------------------------------------+
|          Supabase Database (PostGIS)            |
|            (5 Core Tables + Spatial)            |
+-------------------------------------------------+

## 2. Rincian Tech Stack
- **Fullstack Framework:** Next.js (App Router), TypeScript.
- **Styling:** Tailwind CSS, shadcn/ui (Opsional untuk komponen UI).
- **Map Library:** React-Leaflet (Leaflet.js).
- **Database Client:** `@supabase/supabase-js` (ORM/Query Builder).
- **Deployment:** Vercel (Hosting Frontend + Serverless Functions).
- **Spatial Reference System:** EPSG:4326 (WGS 84 Lon/Lat).

## 3. Skema Basis Data (Supabase)

### A. Tabel Eksisting
1. **`competitors`** (Kriteria C1)
   - `id` (UUID, PK)
   - `name` (VARCHAR), `latitude` (FLOAT8), `longitude` (FLOAT8)
   - `geom` (geometry(Point, 4326))
2. **`population_data`** (Kriteria C2 Sumber Data)
   - `id` (INT, PK), `bps_nama_kecamatan` (VARCHAR), `jumlah_penduduk` (INT)
3. **`districts`** (Batas Wilayah Polygon Administrasi)
   - `id` (UUID, PK), `district_name` (VARCHAR)
   - `geom` (geometry(MultiPolygon, 4326))
4. **`road_networks`** (Kriteria C3)
   - `id` (UUID, PK), `osm_id` (BIGINT), `name` (VARCHAR), `road_type` (VARCHAR)
   - `geom` (geometry(Geometry, 4326))
5. **`crowd_centers`** (Kriteria C4)
   - `id` (UUID, PK), `category` (VARCHAR), `latitude` (FLOAT8), `longitude` (FLOAT8)
   - `geom` (geometry(Point, 4326))

### B. Tabel Analisis (Pre-computed Grid Matrix)
6. **`grid_points`**
   - `id` (UUID, PK), `geom` (geometry(Point, 4326))
   - `latitude` (FLOAT8), `longitude` (FLOAT8)
   - `district_name` (VARCHAR)
   - `c1_dist_competitor` (FLOAT8) -- Satuan meter (Benefit)
   - `c2_population` (FLOAT8)      -- Jumlah jiwa (Benefit)
   - `c3_dist_road` (FLOAT8)        -- Satuan meter (Cost)
   - `c4_dist_crowd` (FLOAT8)       -- Satuan meter (Cost)

## 4. Pipeline Komputasi Keruangan & Algoritma

### Tahap 1: Spatial Pre-computation (Standalone Node.js Script)
Untuk menghindari *timeout* Vercel Serverless Functions (maks. 10-15 detik di versi gratis), kalkulasi jarak spasial dilakukan di luar *runtime* aplikasi web utama. Sebuah script Node.js lokal (`scripts/generate-grid.ts`) dijalankan sekali untuk:
1. Melakukan *looping* Bounding Box Kota Bogor untuk men-generate titik grid berjarak seragam.
2. Memanggil RPC (Remote Procedure Call) atau Raw SQL PostGIS di Supabase untuk menghitung jarak:
   - C1: Jarak terdekat ke `competitors` (`ST_Distance`).
   - C2: Penduduk kecamatan tempat titik berada (`ST_Contains`).
   - C3: Jarak terdekat ke `road_networks` (`ST_Distance`).
   - C4: Jarak terdekat ke `crowd_centers` (`ST_Distance`).
3. Menyimpan hasil matriks utuh ini ke tabel `grid_points`.

### Tahap 2: Runtime Engine (AHP & TOPSIS via Next.js API)
Saat pengguna melakukan klik "Hitung":
1. **AHP Calculation:**
   - Normalisasi matriks perbandingan, hitung bobot kriteria (W = [w1, w2, w3, w4]).
   - Hitung Consistency Ratio (CR).
2. **TOPSIS Calculation:**
   - Next.js melakukan fetch data `grid_points` via Supabase Client.
   - Normalisasi Matriks $\rightarrow$ Matriks Ternormalisasi Terbobot $\rightarrow$ Solusi Ideal Positif/Negatif $\rightarrow$ Jarak Euclidean $\rightarrow$ Skor Preferensi (Vi).
   - Pengurutan skor Vi dan mereturn *JSON array* ke komponen antarmuka peta.

## 5. Next.js Server API / Server Actions

- **`GET /api/layers/overview`**
  Mengambil poligon kecamatan dan titik kompetitor eksisting dari Supabase untuk *initial load* Leaflet.
- **`POST /api/spatial/analyze` (atau via Server Action `calculateMarketGap()`)**
  Menerima *payload* matriks AHP 4x4.
  - **Validasi Gagal:** Return `{ "error": "CR > 0.1", "cr": 0.18 }`
  - **Sukses:** Return *Top Recommendations* dan nilai *Vi* untuk keperluan pewarnaan peta (*Heatmap*).

## 6. Deployment & Environment
- **Hosting Platform:** Vercel.
- **Environment Variables (Vercel Dashboard):**
  - `NEXT_PUBLIC_SUPABASE_URL` (URL REST API Supabase).
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Kunci publik untuk operasi *read-only* dari klien).
  - `SUPABASE_SERVICE_ROLE_KEY` (Kunci rahasia untuk skrip internal bypass RLS).