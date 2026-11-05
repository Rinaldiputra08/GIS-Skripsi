-- =====================================================================
-- C2 tingkat KELURAHAN
--
-- Sebelumnya C2 (kepadatan penduduk) diambil per kecamatan (BPS), sehingga seluruh grid hanya
-- memiliki 6 nilai C2. File ini menambahkan 68 kelurahan:
--   - penduduk : SIMDATA Disdukcapil Kota Bogor, Semester I 2026 (Dataset/penduduk_kelurahan_simdata_2026s1.csv)
--   - batas    : OpenStreetMap, boundary=administrative admin_level=7 (scripts/import-kelurahan.mjs)
--   - kepadatan = penduduk / luas poligon kelurahan (geography, km²), sama seperti cara C2 kecamatan.
-- Titik grid yang tidak tertutup poligon kelurahan mana pun (selisih kecil batas OSM vs batas
-- kecamatan) memakai kelurahan TERDEKAT. Bila tabel kelurahan kosong, C2 kembali ke kecamatan.
-- Idempotent: aman dijalankan ulang.
-- =====================================================================

-- 1. Tabel kelurahan
CREATE TABLE IF NOT EXISTS villages (
  id                serial PRIMARY KEY,
  code              text UNIQUE NOT NULL,          -- kode wilayah, mis. 3271050003
  name              text NOT NULL,
  district_name     text NOT NULL,
  population        integer CHECK (population IS NULL OR population >= 0),
  population_male   integer,
  population_female integer,
  population_period text,
  population_source text,
  official_area_km2 numeric,                       -- luas resmi SIMDATA (pembanding)
  osm_id            bigint,
  geom              geometry(MultiPolygon, 4326),
  updated_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_villages_geom ON villages USING GIST (geom);
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;   -- hanya service role (server)

CREATE OR REPLACE VIEW v_villages AS
SELECT v.id, v.code, v.name, v.district_name, v.population, v.population_period,
       round((ST_Area(v.geom::geography) / 1e6)::numeric, 3)::float8 AS area_km2,
       v.official_area_km2::float8 AS official_area_km2,
       round(v.population / (ST_Area(v.geom::geography) / 1e6))::integer AS density,
       v.geom
FROM villages v
WHERE v.geom IS NOT NULL AND v.population IS NOT NULL AND ST_Area(v.geom::geography) > 0;

-- 2. Impor kelurahan (dipanggil scripts/import-kelurahan.mjs)
--    features = [{ code, name, district, population, male, female, period, source, official_area, osm_id,
--                  geometry: GeoJSON MultiLineString (way anggota relasi OSM, lng lat) }]
CREATE OR REPLACE FUNCTION public.import_villages(features jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE
  v_added integer;
BEGIN
  DELETE FROM villages WHERE true;   -- WHERE wajib (pg_safeupdate di Supabase)
  INSERT INTO villages (code, name, district_name, population, population_male, population_female,
                        population_period, population_source, official_area_km2, osm_id, geom)
  SELECT x->>'code', x->>'name', x->>'district',
         (x->>'population')::int, (x->>'male')::int, (x->>'female')::int,
         x->>'period', x->>'source', (x->>'official_area')::numeric, (x->>'osm_id')::bigint,
         ST_Multi(ST_CollectionExtract(ST_MakeValid(
           ST_BuildArea(ST_UnaryUnion(ST_SetSRID(ST_GeomFromGeoJSON(x->>'geometry'), 4326)))), 3))
  FROM jsonb_array_elements(features) x;
  GET DIAGNOSTICS v_added = ROW_COUNT;
  RETURN jsonb_build_object(
    'added', v_added,
    'without_geom', (SELECT count(*) FROM villages WHERE geom IS NULL OR ST_IsEmpty(geom))
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.import_villages(jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.import_villages(jsonb) TO service_role;

-- 3. Grid: simpan nama kelurahan tiap titik
ALTER TABLE grid_points ADD COLUMN IF NOT EXISTS village_name text;

CREATE TABLE IF NOT EXISTS rb_villages (name text, density int, geom geometry(Geometry, 4326));
CREATE INDEX IF NOT EXISTS idx_rb_villages_geom ON rb_villages USING GIST (geom);
ALTER TABLE rb_villages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rebuild_grid_points(cell_m integer DEFAULT 300)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
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
  TRUNCATE rb_districts, rb_villages, rb_competitors, rb_roads, rb_crowd;
  INSERT INTO rb_districts   SELECT name, density, geom FROM v_districts;
  INSERT INTO rb_villages    SELECT name, density, geom FROM v_villages;
  INSERT INTO rb_competitors SELECT name, geom FROM v_competitors;
  INSERT INTO rb_roads       SELECT name, geom FROM v_main_roads;
  INSERT INTO rb_crowd       SELECT name, geom FROM v_crowd_centers;
  ANALYZE rb_districts; ANALYZE rb_villages; ANALYZE rb_competitors; ANALYZE rb_roads; ANALYZE rb_crowd;

  SELECT ST_XMin(e), ST_XMax(e), ST_YMin(e), ST_YMax(e)
    INTO v_xmin, v_xmax, v_ymin, v_ymax
  FROM (SELECT ST_Extent(geom)::box3d AS e FROM districts) t;

  v_dlat := cell_m / 111320.0;
  v_dlng := cell_m / (111320.0 * cos(radians((v_ymin + v_ymax) / 2.0)));

  -- 2. grid + kriteria. Dalam satu transaksi: bila gagal, grid lama tetap utuh.
  TRUNCATE grid_points;

  INSERT INTO grid_points (
    geom, district_name, village_name, cell_meters,
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
    -- batas kota = poligon kecamatan; C2 = kepadatan kelurahan yang memuat titik (atau terdekat)
    SELECT c.pt, d.name AS district, vil.name AS village, COALESCE(vil.density, d.density) AS density
    FROM cells c
    JOIN rb_districts d ON ST_Covers(d.geom, c.pt)
    LEFT JOIN LATERAL (
      SELECT v.name, v.density
      FROM rb_villages v
      ORDER BY (NOT ST_Covers(v.geom, c.pt)), v.geom <-> c.pt
      LIMIT 1
    ) vil ON true
  )
  SELECT
    l.pt, l.district, l.village, cell_m,
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
$function$;
REVOKE EXECUTE ON FUNCTION public.rebuild_grid_points(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.rebuild_grid_points(integer) TO service_role;

-- 4. Kriteria satu titik survei: C2 dari kelurahan
CREATE OR REPLACE FUNCTION public.criteria_at_point(p_lat double precision, p_lng double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  pt    geometry := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  d     record;
  vil   record;
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

  SELECT v.name, v.density INTO vil
  FROM v_villages v
  ORDER BY (NOT ST_Covers(v.geom, pt)), v.geom <-> pt
  LIMIT 1;

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
    'village',  vil.name,
    'density',  COALESCE(vil.density, d.density),
    'c1',       GREATEST(v_f1, comp.dist),   'c1Name', comp.name,
    'c3',       GREATEST(v_f3, road.dist),   'c3Name', road.name,
    'c4',       GREATEST(v_f4, crowd.dist),  'c4Name', crowd.name
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.criteria_at_point(double precision, double precision) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.criteria_at_point(double precision, double precision) TO service_role;

NOTIFY pgrst, 'reload schema';
