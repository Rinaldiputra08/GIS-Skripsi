-- =====================================================================
-- SEED DATA UNTUK SISTEM INFORMASI GEOGRAFIS KOTA BOGOR
-- =====================================================================

-- 1. Insert Data Populasi Kecamatan BPS Kota Bogor
INSERT INTO population_data (bps_district_name, population_count, density_per_km2) VALUES
('Bogor Tengah', 98240, 12083),
('Bogor Timur', 104870, 10332),
('Bogor Utara', 189520, 10695),
('Bogor Selatan', 209140, 6788),
('Bogor Barat', 236780, 10259),
('Tanah Sareal', 221450, 11754)
ON CONFLICT (bps_district_name) DO UPDATE 
SET population_count = EXCLUDED.population_count;

-- 2. Insert Data Simpul Keramaian (C4)
INSERT INTO crowd_centers (name, category, district_name, latitude, longitude, description) VALUES
('Botani Square Mall & IPB Convention', 'mall', 'Bogor Tengah', -6.6009, 106.8056, 'Pusat belanja & lifestyle terbesar terhubung IPB'),
('Stasiun Besar Kota Bogor', 'station', 'Bogor Tengah', -6.5958, 106.7904, 'Simpul komuter KRL Jabodetabek (100k+ penumpang/hari)'),
('Kebun Raya Bogor & Museum Zoologi', 'park', 'Bogor Tengah', -6.5975, 106.7995, 'Destinasi wisata alam & riset botani ikonik dunia'),
('Alun-Alun Kota Bogor', 'park', 'Bogor Tengah', -6.5952, 106.7898, 'Ruang terbuka hijau publik terintegrasi Stasiun Bogor'),
('Lapangan Sempur & Taman Ekspresi', 'park', 'Bogor Tengah', -6.5892, 106.7998, 'Sentra olahraga, jogging track, dan festival komunitas'),
('Kampus IPB Baranangsiang', 'university', 'Bogor Tengah', -6.6025, 106.8082, 'Kampus Pascasarjana & Sekolah Vokasi IPB'),
('Lippo Plaza Ekalokasari', 'mall', 'Bogor Timur', -6.6162, 106.8155, 'Pusat perbelanjaan koridor Sukasari & Tajur'),
('Boxies 123 Mall Tajur', 'mall', 'Bogor Timur', -6.6365, 106.8305, 'Lifestyle mall keluarga dan wisata outdoor Tajur'),
('Terminal Bus Baranangsiang', 'station', 'Bogor Timur', -6.6045, 106.8095, 'Terminal bus antar kota & Damri Bandara Soetta'),
('Universitas Pakuan (UNPAK)', 'university', 'Bogor Timur', -6.6065, 106.8145, 'Kampus swasta terbesar di Kota Bogor'),
('Plaza Jambu Dua Bogor', 'mall', 'Bogor Utara', -6.5718, 106.8045, 'Sentra gadget, elektronik & IT terbesar Kota Bogor'),
('Taman Heulang', 'park', 'Tanah Sareal', -6.5735, 106.7975, 'Taman tematik populer untuk keluarga & komunitas muda'),
('Universitas Ibn Khaldun (UIKA)', 'university', 'Tanah Sareal', -6.5562, 106.7825, 'Kampus perguruan tinggi terkemuka di Sholeh Iskandar'),
('Transmart Carrefour Yasmin', 'mall', 'Bogor Barat', -6.5662, 106.7612, 'Hypermarket & entertainment center Yasmin'),
('Mall BTM Bogor (Bogor Trade Mall)', 'mall', 'Bogor Tengah', -6.6015, 106.7945, 'Pusat perdagangan retail depan Kebun Raya');

-- 3. Insert Data Kedai Kopi Eksisting (Kompetitor - C1)
INSERT INTO competitors (name, category, district_name, latitude, longitude, address) VALUES
('Popolo Coffee Baranangsiang', 'Specialty Coffee', 'Bogor Tengah', -6.6018, 106.8068, 'Jl. Malabar Ujung No.9'),
('Maraca Books and Coffee', 'Book Cafe', 'Bogor Tengah', -6.5925, 106.8012, 'Jl. Jalak Harupat No.9a'),
('Starbucks Botani Square', 'Chain Commercial', 'Bogor Tengah', -6.6009, 106.8056, 'Botani Square Mall Lt. GF'),
('Kopi Kenangan Botani Square', 'Grab & Go', 'Bogor Tengah', -6.6012, 106.8061, 'Botani Square Mall Lt. 2'),
('Fore Coffee Botani Square', 'Grab & Go', 'Bogor Tengah', -6.6015, 106.8052, 'Botani Square Mall Ground'),
('Janji Jiwa Suryakencana', 'Grab & Go', 'Bogor Tengah', -6.6045, 106.7998, 'Jl. Suryakencana No.158'),
('Tomoro Coffee Suryakencana', 'Chain Commercial', 'Bogor Tengah', -6.6062, 106.8015, 'Jl. Suryakencana No.210'),
('Uncle Jo X Bar Suryakencana', 'Vintage / Artisan', 'Bogor Tengah', -6.6078, 106.8028, 'Jl. Roda No.35'),
('Two Stories Cafe', 'Modern Lifestyle', 'Bogor Timur', -6.6115, 106.8118, 'Jl. Pajajaran Indah V No.7'),
('Raindear Coffee & Kitchen Bina Marga', 'Lifestyle / Roastery', 'Bogor Timur', -6.6082, 106.8124, 'Jl. Bina Marga No.7'),
('Kopi Nako Pajajaran Indah', 'Modern Outdoor', 'Bogor Timur', -6.6128, 106.8135, 'Jl. Pajajaran Indah V No.12'),
('Anthology Coffee & Tea Sukasari', 'Artisan Cafe', 'Bogor Timur', -6.6174, 106.8162, 'Jl. Sukasari III No.14'),
('Foresthree Coffee Pandu Raya', 'Modern Lifestyle', 'Bogor Utara', -6.5742, 106.8155, 'Jl. Pandu Raya No.105'),
('Dailydose Coffee & Eatery', 'Artisan Cafe', 'Bogor Utara', -6.5778, 106.8168, 'Jl. Pandu Raya No.141'),
('Baked & Brewed Pandu Raya', 'Bakery & Coffee', 'Bogor Utara', -6.5795, 106.8148, 'Jl. Pandu Raya No.42'),
('Cohere Coffee Ciwaringin', 'Artisan Cafe', 'Bogor Barat', -6.5842, 106.7795, 'Jl. Ciwaringin No.12'),
('Kopi Nako Yasmin Barat', 'Modern Outdoor', 'Bogor Barat', -6.5682, 106.7625, 'Jl. KH Abdullah Bin Nuh No.8'),
('Kopi Dari Hati Sholeh Iskandar', 'Chain Commercial', 'Tanah Sareal', -6.5525, 106.7798, 'Jl. KH Sholeh Iskandar No.22'),
('Kopi Daong Express Cipaku', 'Nature / Scenic', 'Bogor Selatan', -6.6425, 106.8115, 'Jl. Raya Cipaku No.88');
