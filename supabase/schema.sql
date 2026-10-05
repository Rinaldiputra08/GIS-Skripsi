-- =====================================================================
-- WEB-GIS COFFEE SHOP MARKET GAP ANALYSIS (KOTA BOGOR)
-- POSTGRESQL 15+ SCHEMA WITH POSTGIS EXTENSION
-- =====================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-running
DROP TABLE IF EXISTS grid_points CASCADE;
DROP TABLE IF EXISTS crowd_centers CASCADE;
DROP TABLE IF EXISTS road_networks CASCADE;
DROP TABLE IF EXISTS competitors CASCADE;
DROP TABLE IF EXISTS population_data CASCADE;
DROP TABLE IF EXISTS districts CASCADE;

-- 3. Table: Districts (Poligon Batas Wilayah Administrasi 6 Kecamatan)
CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_name VARCHAR(100) NOT NULL UNIQUE,
    population INT NOT NULL,
    area_km2 NUMERIC(8, 2) NOT NULL,
    density_per_km2 INT NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_districts_geom ON districts USING GIST (geom);

-- 4. Table: Population Data (Statistik BPS Kota Bogor)
CREATE TABLE population_data (
    id SERIAL PRIMARY KEY,
    bps_district_name VARCHAR(100) NOT NULL UNIQUE,
    population_count INT NOT NULL,
    density_per_km2 INT NOT NULL,
    growth_rate NUMERIC(4, 2) DEFAULT 1.2,
    updated_year INT DEFAULT 2024
);

-- 5. Table: Competitors (C1 - Jarak ke Kedai Kopi Eksisting)
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Coffee Shop',
    district_name VARCHAR(100),
    address TEXT,
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_competitors_geom ON competitors USING GIST (geom);

-- 6. Table: Road Networks (C3 - Jarak ke Jaringan Jalan Utama)
CREATE TABLE road_networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    osm_id BIGINT,
    name VARCHAR(255) NOT NULL,
    road_type VARCHAR(50) NOT NULL, -- 'arterial', 'collector', 'secondary'
    geom geometry(Geometry, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_road_networks_geom ON road_networks USING GIST (geom);

-- 7. Table: Crowd Centers (C4 - Jarak ke Simpul Keramaian)
CREATE TABLE crowd_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'mall', 'station', 'university', 'park', 'hospital'
    district_name VARCHAR(100),
    description TEXT,
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_crowd_centers_geom ON crowd_centers USING GIST (geom);

-- 8. Table: Grid Points (Pre-computed Candidate Matrix untuk TOPSIS)
CREATE TABLE grid_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    district_name VARCHAR(100),
    c1_dist_competitor FLOAT8 NOT NULL, -- Satuan meter (Benefit)
    c2_population FLOAT8 NOT NULL,      -- Jumlah jiwa (Benefit)
    c3_dist_road FLOAT8 NOT NULL,        -- Satuan meter (Cost)
    c4_dist_crowd FLOAT8 NOT NULL,       -- Satuan meter (Cost)
    nearest_competitor VARCHAR(255),
    nearest_road VARCHAR(255),
    nearest_crowd VARCHAR(255),
    geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_grid_points_geom ON grid_points USING GIST (geom);

-- 9. Stored Procedure / Function to Auto-Calculate Spatial Distances via PostGIS
CREATE OR REPLACE FUNCTION compute_spatial_grid_metrics()
RETURNS VOID AS $$
BEGIN
    UPDATE grid_points g
    SET
        -- C1: Nearest Competitor Distance (Meters)
        c1_dist_competitor = (
            SELECT COALESCE(MIN(ST_Distance(g.geom::geography, c.geom::geography)), 100)
            FROM competitors c
        ),
        nearest_competitor = (
            SELECT c.name
            FROM competitors c
            ORDER BY g.geom <-> c.geom
            LIMIT 1
        ),
        -- C2: District Population
        c2_population = COALESCE((
            SELECT p.population_count
            FROM districts d
            JOIN population_data p ON p.bps_district_name = d.district_name
            WHERE ST_Contains(d.geom, g.geom)
            LIMIT 1
        ), (
            SELECT population FROM districts ORDER BY g.geom <-> ST_Centroid(geom) LIMIT 1
        )),
        district_name = COALESCE((
            SELECT d.district_name
            FROM districts d
            WHERE ST_Contains(d.geom, g.geom)
            LIMIT 1
        ), (
            SELECT district_name FROM districts ORDER BY g.geom <-> ST_Centroid(geom) LIMIT 1
        )),
        -- C3: Nearest Road Network Distance (Meters)
        c3_dist_road = (
            SELECT COALESCE(MIN(ST_Distance(g.geom::geography, r.geom::geography)), 50)
            FROM road_networks r
        ),
        nearest_road = (
            SELECT r.name
            FROM road_networks r
            ORDER BY g.geom <-> r.geom
            LIMIT 1
        ),
        -- C4: Nearest Crowd Center Distance (Meters)
        c4_dist_crowd = (
            SELECT COALESCE(MIN(ST_Distance(g.geom::geography, cc.geom::geography)), 50)
            FROM crowd_centers cc
        ),
        nearest_crowd = (
            SELECT cc.name
            FROM crowd_centers cc
            ORDER BY g.geom <-> cc.geom
            LIMIT 1
        );
END;
$$ LANGUAGE plpgsql;
