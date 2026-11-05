-- =====================================================================
-- JALAN UTAMA (C3) MENCAKUP JALAN NASIONAL (OSM highway=trunk)
-- Jalankan setelah scripts/import-osm-trunk-roads.mjs. Aman dijalankan berulang.
--
-- Sebelumnya v_main_roads hanya primary + secondary, sehingga jalan arteri terbesar Kota Bogor
-- (Jl. Raya Pajajaran, Sholeh Iskandar, KH Abdullah bin Nuh, Jl. Raya Tajur, Jl. Raya Bogor,
-- Jl. Raya Sukabumi, Dramaga) yang di OSM ditandai `trunk` tidak ikut dihitung pada C3.
-- Jalan tol (motorway) tetap tidak dihitung karena tidak bisa diakses langsung dari lahan usaha.
-- =====================================================================
SET search_path = public, extensions;

CREATE OR REPLACE VIEW v_main_roads AS
SELECT id,
       osm_id,
       COALESCE(name, 'Jalan tanpa nama'::character varying) AS name,
       road_type,
       geom
FROM road_networks
WHERE road_type::text = ANY (ARRAY['trunk', 'primary', 'secondary']);

NOTIFY pgrst, 'reload schema';

-- Pengecekan: diharapkan ada baris trunk (±268 ruas)
SELECT road_type, count(*) FROM v_main_roads GROUP BY road_type ORDER BY road_type;
