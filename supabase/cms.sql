-- =====================================================================
-- CMS ADMIN  -  KopiSpasial Bogor
-- Jalankan SEKALI di Supabase SQL Editor (setelah pipeline.sql, pipeline_point.sql,
-- dan competitors_source.sql). Aman dijalankan berulang (idempotent).
--
-- Isi:
--   1. Trigger: kolom geom terisi otomatis dari latitude/longitude (CMS cukup mengirim lat/lng)
--   2. Tabel baru: restricted_zones, app_settings, audit_log, grid_runs, scenarios, survey_logs
--   3. rebuild_grid_points() dipercepat (tabel kerja berindeks) & membaca batas bawah dari app_settings
--   4. criteria_at_point() ikut membaca batas bawah dari app_settings
--
-- Semua tabel baru memakai RLS tanpa policy: hanya server aplikasi (service role) yang dapat
-- membaca/menulis. API publik (anon key) tidak punya akses.
-- =====================================================================
SET search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. geom otomatis dari latitude/longitude
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_point_geom() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_competitors_geom ON competitors;
CREATE TRIGGER trg_competitors_geom BEFORE INSERT OR UPDATE OF latitude, longitude ON competitors
  FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();

DROP TRIGGER IF EXISTS trg_crowd_centers_geom ON crowd_centers;
CREATE TRIGGER trg_crowd_centers_geom BEFORE INSERT OR UPDATE OF latitude, longitude ON crowd_centers
  FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();

-- Titik keramaian buatan admin tidak punya osm_id; tandai sumbernya
ALTER TABLE crowd_centers ALTER COLUMN osm_id DROP NOT NULL;
ALTER TABLE crowd_centers ADD COLUMN IF NOT EXISTS source text;
UPDATE crowd_centers SET source = 'osm' WHERE source IS NULL;
ALTER TABLE crowd_centers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE competitors   ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE VIEW v_crowd_centers AS
SELECT cc.id, cc.osm_id, cc.name, cc.category,
       cc.latitude, cc.longitude, d.name AS district_name, cc.geom, cc.source
FROM crowd_centers cc
JOIN v_districts d ON ST_Covers(d.geom, cc.geom);

-- ---------------------------------------------------------------------
-- 2. Tabel baru
-- ---------------------------------------------------------------------

-- 2a. Zona terlarang (sebelumnya hardcode di kode). Lingkaran: titik pusat + radius.
CREATE TABLE IF NOT EXISTS restricted_zones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE,
  name        text NOT NULL,
  zone_type   text NOT NULL CHECK (zone_type IN ('cemetery','military_police','palace_conservation','water_body')),
  type_label  text NOT NULL,
  description text,
  latitude    float8 NOT NULL,
  longitude   float8 NOT NULL,
  radius_m    integer NOT NULL CHECK (radius_m BETWEEN 20 AND 3000),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2b. Parameter sistem
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO app_settings (key, value) VALUES
  ('tier_high',       '0.62'::jsonb),   -- Vi >= ini  -> potensi tinggi
  ('tier_medium',     '0.45'::jsonb),   -- Vi >= ini  -> potensi sedang
  ('dense_threshold', '11000'::jsonb),  -- kepadatan (jiwa/km²) dianggap padat pada laporan survei
  ('cell_meters',     '300'::jsonb),    -- sisi sel grid (m)
  ('floor_c1',        '50'::jsonb),     -- batas bawah jarak C1 (m)
  ('floor_c3',        '30'::jsonb),     -- batas bawah jarak C3 (m)
  ('floor_c4',        '40'::jsonb)      -- batas bawah jarak C4 (m)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_setting_num(k text, d numeric) RETURNS numeric
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT (value #>> '{}')::numeric FROM app_settings WHERE key = k), d)
$$;

-- 2c. Riwayat perubahan data oleh admin
CREATE TABLE IF NOT EXISTS audit_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at           timestamptz NOT NULL DEFAULT now(),
  actor        text,
  action       text NOT NULL,          -- create | update | delete | apply
  entity       text NOT NULL,          -- competitors | crowd_centers | restricted_zones | population | settings | grid
  entity_id    text,
  label        text,
  before       jsonb,
  after        jsonb,
  affects_grid boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_audit_log_at ON audit_log (at DESC);

-- 2d. Riwayat penerapan perubahan (bangun ulang grid) beserta perbandingan ranking
CREATE TABLE IF NOT EXISTS grid_runs (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at            timestamptz NOT NULL DEFAULT now(),
  actor         text,
  cell_m        integer,
  duration_ms   integer,
  n_points      integer,
  n_competitors integer,
  before        jsonb,
  after         jsonb
);

-- 2e. Skenario analisis tersimpan (publik)
CREATE TABLE IF NOT EXISTS scenarios (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   text NOT NULL,            -- id anonim perangkat pengguna (tersimpan di browser)
  name       text NOT NULL,
  weights    jsonb NOT NULL,           -- [w1,w2,w3,w4]
  pairs      jsonb,
  cr         float8,
  summary    jsonb,                    -- ringkasan hasil: top 5, jumlah tiap kategori
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2f. Riwayat survei lokasi tersimpan (publik)
CREATE TABLE IF NOT EXISTS survey_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         text NOT NULL,
  name             text,
  note             text,
  latitude         float8 NOT NULL,
  longitude        float8 NOT NULL,
  district         text,
  score            float8,
  category         text,
  rank_estimate    integer,
  total_candidates integer,
  criteria         jsonb,
  weights          jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_owner   ON scenarios   (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_logs_owner ON survey_logs (owner_id, created_at DESC);

-- RLS aktif, tanpa policy: hanya service role (server aplikasi) yang dapat mengakses
ALTER TABLE restricted_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE grid_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_logs      ENABLE ROW LEVEL SECURITY;

-- Seed zona terlarang (dari daftar yang sebelumnya hardcode)
INSERT INTO restricted_zones (code, name, zone_type, type_label, description, latitude, longitude, radius_m) VALUES
  ('ex_tpu_blender', 'TPU Blender (Kebon Pedes)', 'cemetery', 'Pemakaman Umum (TPU)', 'Kompleks Tempat Pemakaman Umum Blender - Zona Terlarang Non-Komersial', -6.5615, 106.7865, 320),
  ('ex_tpu_dreded', 'TPU Dreded & Makam Pahlawan', 'cemetery', 'Pemakaman Umum (TPU)', 'Kawasan TPU Dreded dan Taman Makam Pahlawan - Zona Sakral Non-Usaha', -6.6185, 106.8012, 300),
  ('ex_tpu_gunung_gadung', 'TPU Gunung Gadung Cipaku', 'cemetery', 'Pemakaman Umum (TPU)', 'Kompleks Pemakaman Tionghoa Gunung Gadung seluas puluhan hektar', -6.6435, 106.8195, 480),
  ('ex_tpu_kayumanis', 'TPU Kayumanis', 'cemetery', 'Pemakaman Umum (TPU)', 'Lahan Tempat Pemakaman Umum Kayumanis Tanah Sareal', -6.5325, 106.7645, 280),
  ('ex_polresta_bogor', 'Mako Polresta Bogor Kota', 'military_police', 'Instansi Keamanan / Polisi', 'Markas Komando Kepolisian Resor Kota Bogor - Kawasan Otoritas Terbatas', -6.5938, 106.7885, 220),
  ('ex_korem_suryakancana', 'Korem 061/Suryakancana & Kodim 0606', 'military_police', 'Markas Militer / TNI', 'Komando Resor Militer dan Distrik Militer - Zona Pertahanan Terbatas', -6.5895, 106.7852, 220),
  ('ex_pusdikzi_tni', 'Pusdikzi TNI-AD Sudirman', 'military_police', 'Pusat Pendidikan Militer TNI', 'Pusat Pendidikan Zeni Angkatan Darat - Kompleks Militer Tertutup', -6.5845, 106.7942, 260),
  ('ex_brimob_sukasari', 'Mako Brimob & Satlantas Sukasari', 'military_police', 'Instansi Kepolisian Khusus', 'Kawasan Asrama dan Kantor Kepolisian Tertutup', -6.6192, 106.8135, 200),
  ('ex_istana_bogor', 'Istana Kepresidenan Bogor (Ring 1)', 'palace_conservation', 'Kawasan Khusus Kenegaraan (Ring 1)', 'Zona Otoritas Khusus Istana Kepresidenan RI - Dilarang Bangunan Komersial', -6.5945, 106.7972, 380),
  ('ex_sungai_ciliwung', 'Sempadan Rawan Sungai Ciliwung', 'water_body', 'Sempadan Aliran Sungai', 'Bantaran Sungai Ciliwung - Zona Hijau Perlindungan Air & Bebas Bangunan', -6.6065, 106.8045, 180)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. rebuild_grid_points(): lebih cepat + batas bawah dari app_settings
--    Penyebab lambat sebelumnya: pencarian tetangga terdekat dilakukan lewat view yang berisi JOIN
--    spasial, sehingga indeks GIST tidak terpakai. Kini data disalin dulu ke tabel kerja berindeks.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rb_districts   (name text, density int, geom geometry(Geometry, 4326));
CREATE TABLE IF NOT EXISTS rb_competitors (name text, geom geometry(Point, 4326));
CREATE TABLE IF NOT EXISTS rb_roads       (name text, geom geometry(Geometry, 4326));
CREATE TABLE IF NOT EXISTS rb_crowd       (name text, geom geometry(Point, 4326));
CREATE INDEX IF NOT EXISTS idx_rb_districts_geom   ON rb_districts   USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_rb_competitors_geom ON rb_competitors USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_rb_roads_geom       ON rb_roads       USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_rb_crowd_geom       ON rb_crowd       USING GIST (geom);
ALTER TABLE rb_districts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rb_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rb_roads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rb_crowd       ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rebuild_grid_points(cell_m integer DEFAULT 300)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_xmin double precision; v_xmax double precision;
  v_ymin double precision; v_ymax double precision;
  v_dlat double precision; v_dlng double precision;
  v_f1 numeric := get_setting_num('floor_c1', 50);
  v_f3 numeric := get_setting_num('floor_c3', 30);
  v_f4 numeric := get_setting_num('floor_c4', 40);
  v_n integer;
BEGIN
  -- 1. tabel kerja (disalin dari view bersih, lalu diindeks otomatis oleh GIST)
  TRUNCATE rb_districts, rb_competitors, rb_roads, rb_crowd;
  INSERT INTO rb_districts   SELECT name, density, geom FROM v_districts;
  INSERT INTO rb_competitors SELECT name, geom FROM v_competitors;
  INSERT INTO rb_roads       SELECT name, geom FROM v_main_roads;
  INSERT INTO rb_crowd       SELECT name, geom FROM v_crowd_centers;
  ANALYZE rb_districts; ANALYZE rb_competitors; ANALYZE rb_roads; ANALYZE rb_crowd;

  SELECT ST_XMin(e), ST_XMax(e), ST_YMin(e), ST_YMax(e)
    INTO v_xmin, v_xmax, v_ymin, v_ymax
  FROM (SELECT ST_Extent(geom)::box3d AS e FROM districts) t;

  v_dlat := cell_m / 111320.0;
  v_dlng := cell_m / (111320.0 * cos(radians((v_ymin + v_ymax) / 2.0)));

  -- 2. grid + kriteria. Dalam satu transaksi: bila gagal, grid lama tetap utuh.
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
  located AS (
    SELECT c.pt, d.name AS district, d.density
    FROM cells c
    JOIN rb_districts d ON ST_Covers(d.geom, c.pt)
  )
  SELECT
    l.pt, l.district, cell_m,
    GREATEST(v_f1, comp.dist), l.density, GREATEST(v_f3, road.dist), GREATEST(v_f4, crowd.dist),
    comp.name, road.name, crowd.name
  FROM located l
  CROSS JOIN LATERAL (
    SELECT x.name, round(ST_Distance(l.pt::geography, x.geom::geography))::float8 AS dist
    FROM (SELECT * FROM rb_competitors ORDER BY geom <-> l.pt LIMIT 5) x
    ORDER BY ST_Distance(l.pt::geography, x.geom::geography) LIMIT 1
  ) comp
  CROSS JOIN LATERAL (
    SELECT x.name, round(ST_Distance(l.pt::geography, x.geom::geography))::float8 AS dist
    FROM (SELECT * FROM rb_roads ORDER BY geom <-> l.pt LIMIT 8) x
    ORDER BY ST_Distance(l.pt::geography, x.geom::geography) LIMIT 1
  ) road
  CROSS JOIN LATERAL (
    SELECT x.name, round(ST_Distance(l.pt::geography, x.geom::geography))::float8 AS dist
    FROM (SELECT * FROM rb_crowd ORDER BY geom <-> l.pt LIMIT 5) x
    ORDER BY ST_Distance(l.pt::geography, x.geom::geography) LIMIT 1
  ) crowd;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rebuild_grid_points(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.rebuild_grid_points(integer) TO service_role;

-- ---------------------------------------------------------------------
-- 4. criteria_at_point(): batas bawah dari app_settings (aturan sama dengan grid)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criteria_at_point(p_lat double precision, p_lng double precision)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  pt    geometry := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  d     record;
  comp  record;
  road  record;
  crowd record;
  v_f1 numeric := get_setting_num('floor_c1', 50);
  v_f3 numeric := get_setting_num('floor_c3', 30);
  v_f4 numeric := get_setting_num('floor_c4', 40);
BEGIN
  SELECT name, density INTO d FROM v_districts WHERE ST_Covers(geom, pt) LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('inside', false);
  END IF;

  SELECT x.name, round(ST_Distance(pt::geography, x.geom::geography)) AS dist INTO comp
  FROM (SELECT * FROM v_competitors ORDER BY geom <-> pt LIMIT 5) x
  ORDER BY ST_Distance(pt::geography, x.geom::geography) LIMIT 1;

  SELECT x.name, round(ST_Distance(pt::geography, x.geom::geography)) AS dist INTO road
  FROM (SELECT * FROM v_main_roads ORDER BY geom <-> pt LIMIT 8) x
  ORDER BY ST_Distance(pt::geography, x.geom::geography) LIMIT 1;

  SELECT x.name, round(ST_Distance(pt::geography, x.geom::geography)) AS dist INTO crowd
  FROM (SELECT * FROM v_crowd_centers ORDER BY geom <-> pt LIMIT 5) x
  ORDER BY ST_Distance(pt::geography, x.geom::geography) LIMIT 1;

  RETURN jsonb_build_object(
    'inside',   true,
    'district', d.name,
    'density',  d.density,
    'c1',       GREATEST(v_f1, comp.dist),   'c1Name', comp.name,
    'c3',       GREATEST(v_f3, road.dist),   'c3Name', road.name,
    'c4',       GREATEST(v_f4, crowd.dist),  'c4Name', crowd.name
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criteria_at_point(double precision, double precision) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.criteria_at_point(double precision, double precision) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 5. Pengecekan
-- ---------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM restricted_zones) AS zona_terlarang,   -- diharapkan 10
  (SELECT count(*) FROM app_settings)     AS parameter,        -- diharapkan 7
  (SELECT count(*) FROM v_competitors)    AS kompetitor_dalam_kota,
  (SELECT count(*) FROM v_crowd_centers)  AS keramaian_dalam_kota;

-- Uji kecepatan pembangunan grid (jalankan terpisah bila ingin diukur):
--   EXPLAIN ANALYZE SELECT public.rebuild_grid_points(300);
