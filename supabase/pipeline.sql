-- =====================================================================
-- PIPELINE SPASIAL DI DATABASE (PostGIS)  -  Web-GIS Coffee Shop Kota Bogor
--
-- Menjadikan database sebagai SUMBER DATA TERPUSAT:
--   tabel mentah (competitors, road_networks, crowd_centers, districts, population_data)
--     -> view bersih (dipotong sesuai batas kota, hanya coffee shop)
--     -> fungsi rebuild_grid_points(): Spatial Grid Sampling + hitung C1..C4 dengan PostGIS
--     -> tabel grid_points  -> dibaca aplikasi -> AHP-TOPSIS
--
-- Cara pakai: Supabase Dashboard -> SQL Editor -> tempel seluruh file -> Run.
-- Aman dijalankan berulang (idempotent). Tidak menghapus/menimpa tabel mentah.
-- =====================================================================

SET search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. Kolom tambahan pada grid_points (kolom lama c1..c4 tetap dipakai)
-- ---------------------------------------------------------------------
ALTER TABLE grid_points ADD COLUMN IF NOT EXISTS district_name      text;
ALTER TABLE grid_points ADD COLUMN IF NOT EXISTS nearest_competitor text;
ALTER TABLE grid_points ADD COLUMN IF NOT EXISTS nearest_road       text;
ALTER TABLE grid_points ADD COLUMN IF NOT EXISTS nearest_crowd      text;
ALTER TABLE grid_points ADD COLUMN IF NOT EXISTS cell_meters        integer;
ALTER TABLE grid_points ADD COLUMN IF NOT EXISTS latitude  double precision GENERATED ALWAYS AS (ST_Y(geom)) STORED;
ALTER TABLE grid_points ADD COLUMN IF NOT EXISTS longitude double precision GENERATED ALWAYS AS (ST_X(geom)) STORED;

CREATE INDEX IF NOT EXISTS idx_grid_points_geom ON grid_points USING GIST (geom);

-- ---------------------------------------------------------------------
-- 2. View bersih
-- ---------------------------------------------------------------------

-- Kecamatan: penduduk BPS tahun terbaru, luas dari poligon (geography, m²), kepadatan (jiwa/km²)
-- Ejaan "SEREAL" (file batas wilayah) disamakan dengan "SAREAL" (BPS).
CREATE OR REPLACE VIEW v_districts AS
SELECT
  d.id,
  initcap(replace(upper(d.district_name), 'SEREAL', 'SAREAL'))             AS name,
  p.jumlah_penduduk                                                          AS population,
  round((ST_Area(d.geom::geography) / 1e6)::numeric, 2)::float8              AS area_km2,
  round(p.jumlah_penduduk / (ST_Area(d.geom::geography) / 1e6))::int         AS density,
  p.tahun                                                                    AS population_year,
  d.geom
FROM districts d
JOIN population_data p
  ON replace(upper(p.bps_nama_kecamatan), 'SEREAL', 'SAREAL')
   = replace(upper(d.district_name),      'SEREAL', 'SAREAL')
 AND p.tahun = (SELECT max(tahun) FROM population_data);

-- Kompetitor = HANYA coffee shop yang berada di dalam batas Kota Bogor
CREATE OR REPLACE VIEW v_competitors AS
SELECT c.id, c.name, c.address, c.rating, c.total_reviews,
       c.latitude, c.longitude, d.name AS district_name, c.geom
FROM competitors c
JOIN v_districts d ON ST_Covers(d.geom, c.geom)
WHERE c.business_type = 'coffee_shop';

-- Simpul keramaian di dalam batas Kota Bogor
CREATE OR REPLACE VIEW v_crowd_centers AS
SELECT cc.id, cc.osm_id, cc.name, cc.category,
       cc.latitude, cc.longitude, d.name AS district_name, cc.geom
FROM crowd_centers cc
JOIN v_districts d ON ST_Covers(d.geom, cc.geom);

-- Jalan UTAMA untuk kriteria C3: primary (arteri) dan secondary (kolektor).
-- Jalan tersier tidak dipakai di C3 (hampir menjangkau seluruh kota sehingga tidak membedakan lokasi).
CREATE OR REPLACE VIEW v_main_roads AS
SELECT id, osm_id, COALESCE(name, 'Jalan tanpa nama') AS name, road_type, geom
FROM road_networks
WHERE road_type IN ('primary', 'secondary');

-- Seluruh jaringan jalan untuk tampilan peta (garis disederhanakan ~4 m agar ringan)
CREATE OR REPLACE VIEW v_roads_display AS
SELECT id, osm_id, COALESCE(name, 'Jalan tanpa nama') AS name, road_type,
       ST_SimplifyPreserveTopology(geom, 0.00004) AS geom
FROM road_networks;

-- ---------------------------------------------------------------------
-- 3. Spatial Grid Sampling + perhitungan C1..C4
--    Kota dibagi sel persegi berukuran seragam (cell_m meter). Titik pusat tiap sel menjadi
--    kandidat; hanya sel yang pusatnya di dalam poligon kecamatan yang dipakai.
--      C1 jarak ke coffee shop terdekat (m)        batas bawah 50 m   (Benefit)
--      C2 kepadatan penduduk kecamatan (jiwa/km²)                      (Benefit)
--      C3 jarak ke jalan utama terdekat (m)        batas bawah 30 m   (Cost)
--      C4 jarak ke simpul keramaian terdekat (m)   batas bawah 40 m   (Cost)
--    Jarak dihitung pada geography (meter di permukaan bumi). Batas bawah menghindari nilai 0
--    pada normalisasi TOPSIS.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_grid_points(cell_m integer DEFAULT 300)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_xmin double precision; v_xmax double precision;
  v_ymin double precision; v_ymax double precision;
  v_dlat double precision; v_dlng double precision;
  v_n integer;
BEGIN
  SELECT ST_XMin(e), ST_XMax(e), ST_YMin(e), ST_YMax(e)
    INTO v_xmin, v_xmax, v_ymin, v_ymax
  FROM (SELECT ST_Extent(geom)::box3d AS e FROM districts) t;

  -- meter -> derajat; lebar sel (bujur) disesuaikan dengan lintang kota agar sel tetap persegi
  v_dlat := cell_m / 111320.0;
  v_dlng := cell_m / (111320.0 * cos(radians((v_ymin + v_ymax) / 2.0)));

  TRUNCATE grid_points;

  INSERT INTO grid_points (
    geom, district_name, cell_meters,
    c1_distance_competitor, c2_population_density, c3_distance_road, c4_distance_crowd,
    nearest_competitor, nearest_road, nearest_crowd
  )
  WITH cells AS (
    SELECT ST_SnapToGrid(
             ST_SetSRID(ST_MakePoint(v_xmin + v_dlng / 2 + j * v_dlng,
                                     v_ymin + v_dlat / 2 + i * v_dlat), 4326),
             0.000001) AS pt
    FROM generate_series(0, floor((v_ymax - v_ymin - v_dlat / 2) / v_dlat)::int) AS i
    CROSS JOIN generate_series(0, floor((v_xmax - v_xmin - v_dlng / 2) / v_dlng)::int) AS j
  ),
  located AS (            -- clipping: buang sel yang pusatnya di luar batas Kota Bogor
    SELECT c.pt, d.name AS district, d.density
    FROM cells c
    JOIN v_districts d ON ST_Covers(d.geom, c.pt)
  )
  SELECT
    l.pt, l.district, cell_m,
    GREATEST(50, comp.dist), l.density, GREATEST(30, road.dist), GREATEST(40, crowd.dist),
    comp.name, road.name, crowd.name
  FROM located l
  CROSS JOIN LATERAL (
    SELECT x.name, round(ST_Distance(l.pt::geography, x.geom::geography))::float8 AS dist
    FROM (SELECT * FROM v_competitors ORDER BY geom <-> l.pt LIMIT 5) x
    ORDER BY ST_Distance(l.pt::geography, x.geom::geography) LIMIT 1
  ) comp
  CROSS JOIN LATERAL (
    SELECT x.name, round(ST_Distance(l.pt::geography, x.geom::geography))::float8 AS dist
    FROM (SELECT * FROM v_main_roads ORDER BY geom <-> l.pt LIMIT 8) x
    ORDER BY ST_Distance(l.pt::geography, x.geom::geography) LIMIT 1
  ) road
  CROSS JOIN LATERAL (
    SELECT x.name, round(ST_Distance(l.pt::geography, x.geom::geography))::float8 AS dist
    FROM (SELECT * FROM v_crowd_centers ORDER BY geom <-> l.pt LIMIT 5) x
    ORDER BY ST_Distance(l.pt::geography, x.geom::geography) LIMIT 1
  ) crowd;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- Fungsi ini mengosongkan grid_points: JANGAN bisa dipanggil lewat API publik.
REVOKE EXECUTE ON FUNCTION public.rebuild_grid_points(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.rebuild_grid_points(integer) TO service_role;

-- ---------------------------------------------------------------------
-- 4. Jalankan pipeline (sel 300 m)
-- ---------------------------------------------------------------------
SELECT public.rebuild_grid_points(300) AS jumlah_titik_grid;

-- Muat ulang cache skema API agar view & kolom baru langsung terbaca aplikasi
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 5. Ringkasan hasil (untuk pengecekan)
-- ---------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM v_competitors)   AS coffee_shop_dalam_kota,   -- diharapkan 86
  (SELECT count(*) FROM v_crowd_centers) AS keramaian_dalam_kota,     -- diharapkan 62
  (SELECT count(*) FROM v_main_roads)    AS segmen_jalan_utama,       -- diharapkan 430
  (SELECT count(*) FROM grid_points)     AS titik_grid;

SELECT name, population, area_km2, density FROM v_districts ORDER BY name;
