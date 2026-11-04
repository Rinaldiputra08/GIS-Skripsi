-- =====================================================================
-- KOMPETITOR: tambah kolom sumber & kategori (Kaggle + OpenStreetMap)
-- Jalankan di Supabase SQL Editor SEBELUM mengimpor data OSM. Aman dijalankan berulang.
-- =====================================================================
SET search_path = public, extensions;

-- 1. Kolom penelusuran asal data (untuk skripsi: setiap titik bisa ditelusuri ke sumbernya)
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS source   text;   -- 'kaggle' | 'osm'
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS category text;   -- 'Coffee shop' | 'Cafe' | ...
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS osm_id   text;   -- mis. 'node/123' (hanya baris OSM)

-- 2. Baris yang sudah ada berasal dari dataset Kaggle
UPDATE competitors SET source = 'kaggle' WHERE source IS NULL AND business_type = 'coffee_shop';

-- 3. View kompetitor: sertakan sumber & kategori (kolom lama tetap, kolom baru di belakang)
CREATE OR REPLACE VIEW v_competitors AS
SELECT c.id, c.name, c.address, c.rating, c.total_reviews,
       c.latitude, c.longitude, d.name AS district_name, c.geom,
       c.source, c.category
FROM competitors c
JOIN v_districts d ON ST_Covers(d.geom, c.geom)
WHERE c.business_type = 'coffee_shop';

NOTIFY pgrst, 'reload schema';

-- Pengecekan: diharapkan 88 baris berkolom source = 'kaggle'
SELECT source, count(*) FROM competitors GROUP BY source;
