-- =====================================================================
-- ZONA TERLARANG DARI OPENSTREETMAP + PARAMETER BATAS JENUH C1
-- Jalankan SEKALI di Supabase SQL Editor (setelah cms.sql). Aman dijalankan berulang.
--
-- Isi:
--   1. restricted_zones mendukung POLIGON (kolom geom). Zona lingkaran buatan admin tetap bisa:
--      geom-nya dibuat otomatis dari titik pusat + radius oleh trigger.
--   2. Fungsi import_osm_zones(features): dipanggil scripts/import-osm-zones.mjs untuk mengisi zona
--      dari OSM (pemakaman, militer, kantor polisi, Istana & Kebun Raya, sempadan sungai, badan air).
--      Geometri digabung per objek, dipotong batas Kota Bogor, dan disederhanakan (±2 m).
--   3. Parameter c1_cap (batas jenuh jarak kompetitor, default 800 m).
-- =====================================================================
SET search_path = public, extensions;

-- 1. Kolom poligon & sumber
ALTER TABLE restricted_zones ADD COLUMN IF NOT EXISTS geom    geometry(MultiPolygon, 4326);
ALTER TABLE restricted_zones ADD COLUMN IF NOT EXISTS source  text NOT NULL DEFAULT 'manual'; -- 'osm' | 'manual'
ALTER TABLE restricted_zones ADD COLUMN IF NOT EXISTS osm_ref text;                             -- mis. 'way/123,way/456'
ALTER TABLE restricted_zones ALTER COLUMN radius_m DROP NOT NULL;                               -- NULL = poligon
CREATE INDEX IF NOT EXISTS idx_restricted_zones_geom ON restricted_zones USING GIST (geom);

-- Zona lingkaran: geom = lingkaran geodesik dari titik pusat + radius (meter)
CREATE OR REPLACE FUNCTION public.sync_zone_geom() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  IF NEW.radius_m IS NOT NULL THEN
    NEW.geom := ST_Multi(ST_Buffer(
      ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography,
      NEW.radius_m, 'quad_segs=16')::geometry);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_restricted_zones_geom ON restricted_zones;
CREATE TRIGGER trg_restricted_zones_geom BEFORE INSERT OR UPDATE ON restricted_zones
  FOR EACH ROW EXECUTE FUNCTION public.sync_zone_geom();

UPDATE restricted_zones SET radius_m = radius_m WHERE geom IS NULL AND radius_m IS NOT NULL; -- isi geom baris lama

-- 2. Impor zona OSM
--    features = [{ grp, name, zone_type, kind: 'area'|'line'|'rel', ref, buffer_m, desc, geometry (GeoJSON, lng lat) }]
--    Semua baris source='osm' dan 10 zona contoh lama (code 'ex_...') diganti. Zona buatan admin tidak disentuh.
CREATE OR REPLACE FUNCTION public.import_osm_zones(features jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE
  v_city    geometry;
  v_removed integer;
  v_added   integer;
BEGIN
  SELECT ST_Union(geom) INTO v_city FROM v_districts;

  DELETE FROM restricted_zones WHERE source = 'osm' OR code LIKE 'ex\_%';
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  WITH f AS (
    SELECT x->>'grp' AS grp, x->>'name' AS nm, x->>'zone_type' AS zt, x->>'ref' AS ref,
           x->>'kind' AS kind, x->>'desc' AS dsc, COALESCE((x->>'buffer_m')::float8, 0) AS buf,
           ST_SetSRID(ST_GeomFromGeoJSON(x->>'geometry'), 4326) AS g
    FROM jsonb_array_elements(features) x
  ),
  shaped AS (
    SELECT grp, nm, zt, ref, dsc,
           CASE kind
             WHEN 'line' THEN ST_Buffer(g::geography, buf, 'quad_segs=4')::geometry  -- koridor sempadan sungai
             WHEN 'rel'  THEN ST_BuildArea(ST_UnaryUnion(g))                           -- multipolygon OSM
             ELSE ST_MakeValid(g)
           END AS g
    FROM f
  ),
  grouped AS (
    SELECT grp, min(nm) AS nm, min(zt) AS zt, min(dsc) AS dsc,
           left(string_agg(DISTINCT ref, ','), 1000) AS refs,
           ST_UnaryUnion(ST_Collect(ST_MakeValid(g))) AS g
    FROM shaped
    WHERE g IS NOT NULL AND NOT ST_IsEmpty(g)
    GROUP BY grp
  ),
  clipped AS (
    SELECT grp, nm, zt, dsc, refs,
           ST_Multi(ST_CollectionExtract(ST_MakeValid(
             ST_SimplifyPreserveTopology(ST_Intersection(g, v_city), 0.00002)), 3)) AS g
    FROM grouped
    WHERE ST_Intersects(g, v_city)
  ),
  final AS (
    SELECT c.*, ST_PointOnSurface(c.g) AS p
    FROM clipped c
    WHERE NOT ST_IsEmpty(c.g) AND ST_Area(c.g::geography) >= 200   -- buang serpihan < 200 m²
  )
  INSERT INTO restricted_zones (code, name, zone_type, type_label, description, latitude, longitude, radius_m, geom, source, osm_ref)
  SELECT
    'osm:' || fi.grp,
    COALESCE(fi.nm,
      CASE fi.zt WHEN 'cemetery' THEN 'Pemakaman' WHEN 'military_police' THEN 'Instansi keamanan'
                 WHEN 'water_body' THEN 'Badan air' ELSE 'Kawasan khusus' END
      || ' tanpa nama' || COALESCE(' · ' || (SELECT d.name FROM v_districts d WHERE ST_Covers(d.geom, fi.p) LIMIT 1), '')),
    fi.zt,
    CASE fi.zt WHEN 'cemetery' THEN 'Pemakaman Umum (TPU)' WHEN 'military_police' THEN 'Instansi Keamanan / Militer'
               WHEN 'palace_conservation' THEN 'Kawasan Istana & Konservasi' ELSE 'Sempadan Sungai / Badan Air' END,
    fi.dsc,
    round(ST_Y(fi.p)::numeric, 6), round(ST_X(fi.p)::numeric, 6),
    NULL, fi.g, 'osm', fi.refs
  FROM final fi;
  GET DIAGNOSTICS v_added = ROW_COUNT;

  RETURN jsonb_build_object('removed', v_removed, 'added', v_added);
END $$;

REVOKE EXECUTE ON FUNCTION public.import_osm_zones(jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.import_osm_zones(jsonb) TO service_role;

-- 3. Batas jenuh C1: jarak ke kompetitor di atas nilai ini dianggap sama baiknya
--    (di luar jangkauan pejalan kaki ±10 menit). 0 = nonaktif.
INSERT INTO app_settings (key, value) VALUES ('c1_cap', '800'::jsonb) ON CONFLICT (key) DO NOTHING;

-- 4. Kelas potensi berbasis PERINGKAT (kuantil), menggantikan ambang Vi tetap (tier_high/tier_medium).
--    Vi bersifat relatif (sebarannya berubah mengikuti bobot & data), sehingga kelas ditentukan dari
--    posisi peringkat: 15% titik layak teratas = tinggi, 35% berikutnya = sedang, sisanya = rendah.
INSERT INTO app_settings (key, value) VALUES
  ('tier_high_pct',   '15'::jsonb),
  ('tier_medium_pct', '35'::jsonb)
ON CONFLICT (key) DO NOTHING;
-- Kunci lama tier_high / tier_medium dibiarkan (sudah tidak dibaca aplikasi); boleh dihapus manual nanti.

NOTIFY pgrst, 'reload schema';

-- Pengecekan: kolom baru ada & parameter c1_cap terisi
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'restricted_zones' AND column_name IN ('geom','source','osm_ref')) AS kolom_baru, -- diharapkan 3
  (SELECT value FROM app_settings WHERE key = 'c1_cap') AS c1_cap,                                                                                   -- diharapkan 800
  (SELECT value FROM app_settings WHERE key = 'tier_high_pct') AS kelas_tinggi_pct;                                                                  -- diharapkan 15
