-- =====================================================================
-- KRITERIA UNTUK SATU TITIK (survei lokasi: klik peta / GPS / pencarian koordinat)
-- Lanjutan dari supabase/pipeline.sql (jalankan pipeline.sql lebih dulu).
--
-- Menghitung C1..C4 sebuah titik dengan aturan yang SAMA seperti rebuild_grid_points(),
-- sehingga titik survei dan titik grid dinilai dari sumber data & rumus yang identik.
-- Hanya membaca data (STABLE), tidak mengubah tabel apa pun.
-- Aman dijalankan berulang.
-- =====================================================================

SET search_path = public, extensions;

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
BEGIN
  -- Di dalam batas 6 kecamatan Kota Bogor?
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
    'c1',       GREATEST(50, comp.dist),   'c1Name', comp.name,
    'c3',       GREATEST(30, road.dist),   'c3Name', road.name,
    'c4',       GREATEST(40, crowd.dist),  'c4Name', crowd.name
  );
END;
$$;

-- Hanya dipanggil dari server aplikasi (service role), bukan dari API publik
REVOKE EXECUTE ON FUNCTION public.criteria_at_point(double precision, double precision) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.criteria_at_point(double precision, double precision) TO service_role;

NOTIFY pgrst, 'reload schema';

-- Uji cepat: Botani Square (di dalam kota) dan titik di luar kota
SELECT public.criteria_at_point(-6.6009, 106.8056) AS di_dalam_kota,
       public.criteria_at_point(-6.4000, 106.8000) AS di_luar_kota;
