import fs from 'fs';
import path from 'path';
import {
  BOGOR_DISTRICTS,
  BOGOR_COMPETITORS,
  BOGOR_ROADS,
  BOGOR_CROWD_CENTERS,
  BOGOR_GRID_CANDIDATES,
} from '../data/bogor-spatial';

function generateSql() {
  const lines: string[] = [];

  lines.push(`-- =====================================================================`);
  lines.push(`-- WEB-GIS COFFEE SHOP MARKET GAP ANALYSIS (KOTA BOGOR)`);
  lines.push(`-- COMPLETE SETUP: EXTENSIONS, TABLES, RLS, & COMPLETE SEED DATA`);
  lines.push(`-- =====================================================================\n`);

  lines.push(`-- 1. EXTENSIONS`);
  lines.push(`CREATE EXTENSION IF NOT EXISTS postgis;`);
  lines.push(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`);

  lines.push(`-- 2. DROP TABLES`);
  lines.push(`DROP TABLE IF EXISTS grid_points CASCADE;`);
  lines.push(`DROP TABLE IF EXISTS crowd_centers CASCADE;`);
  lines.push(`DROP TABLE IF EXISTS road_networks CASCADE;`);
  lines.push(`DROP TABLE IF EXISTS competitors CASCADE;`);
  lines.push(`DROP TABLE IF EXISTS population_data CASCADE;`);
  lines.push(`DROP TABLE IF EXISTS districts CASCADE;\n`);

  lines.push(`-- 3. CREATE TABLES`);
  lines.push(`CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_name VARCHAR(100) NOT NULL UNIQUE,
    population INT NOT NULL,
    area_km2 NUMERIC(8, 2) NOT NULL,
    density_per_km2 INT NOT NULL,
    color VARCHAR(20) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE population_data (
    id SERIAL PRIMARY KEY,
    bps_district_name VARCHAR(100) NOT NULL UNIQUE,
    population_count INT NOT NULL,
    density_per_km2 INT NOT NULL,
    growth_rate NUMERIC(4, 2) DEFAULT 1.2,
    updated_year INT DEFAULT 2024
);

CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Coffee Shop',
    district_name VARCHAR(100),
    address TEXT,
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE road_networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    road_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE crowd_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    district_name VARCHAR(100),
    description TEXT,
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE grid_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    district_name VARCHAR(100) NOT NULL,
    c1_dist_competitor FLOAT8 NOT NULL,
    c2_population FLOAT8 NOT NULL,
    c3_dist_road FLOAT8 NOT NULL,
    c4_dist_crowd FLOAT8 NOT NULL,
    nearest_competitor VARCHAR(255),
    nearest_road VARCHAR(255),
    nearest_crowd VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);\n`);

  lines.push(`-- 4. ROW LEVEL SECURITY (RLS) POLICIES`);
  lines.push(`-- Enable public read access for all tables\n`);
  const tables = ['districts', 'population_data', 'competitors', 'road_networks', 'crowd_centers', 'grid_points'];
  for (const t of tables) {
    lines.push(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`);
    lines.push(`CREATE POLICY "Allow public select on ${t}" ON ${t} FOR SELECT TO public USING (true);`);
    lines.push(`CREATE POLICY "Allow anon all on ${t}" ON ${t} FOR ALL TO anon USING (true) WITH CHECK (true);\n`);
  }

  lines.push(`-- 5. SEED DATA\n`);

  // Districts
  lines.push(`-- Districts`);
  for (const d of BOGOR_DISTRICTS) {
    lines.push(`INSERT INTO districts (district_name, population, area_km2, density_per_km2, color) VALUES ('${d.name}', ${d.population}, ${d.areaKm2}, ${d.density}, '${d.color}');`);
    lines.push(`INSERT INTO population_data (bps_district_name, population_count, density_per_km2) VALUES ('${d.name}', ${d.population}, ${d.density});`);
  }
  lines.push('');

  // Crowd Centers
  lines.push(`-- Crowd Centers`);
  for (const c of BOGOR_CROWD_CENTERS) {
    const desc = c.description ? c.description.replace(/'/g, "''") : '';
    const name = c.name.replace(/'/g, "''");
    lines.push(`INSERT INTO crowd_centers (name, category, district_name, description, latitude, longitude) VALUES ('${name}', '${c.category}', '${c.district}', '${desc}', ${c.lat}, ${c.lng});`);
  }
  lines.push('');

  // Competitors
  lines.push(`-- Competitors`);
  for (const comp of BOGOR_COMPETITORS) {
    const name = comp.name.replace(/'/g, "''");
    const addr = comp.address ? comp.address.replace(/'/g, "''") : '';
    const cat = comp.category ? comp.category.replace(/'/g, "''") : 'Coffee Shop';
    lines.push(`INSERT INTO competitors (name, category, district_name, address, latitude, longitude) VALUES ('${name}', '${cat}', '${comp.district}', '${addr}', ${comp.lat}, ${comp.lng});`);
  }
  lines.push('');

  // Roads
  lines.push(`-- Road Networks`);
  for (const r of BOGOR_ROADS) {
    const name = r.name.replace(/'/g, "''");
    lines.push(`INSERT INTO road_networks (name, road_type) VALUES ('${name}', '${r.type}');`);
  }
  lines.push('');

  // Grid Points
  lines.push(`-- Grid Points (${BOGOR_GRID_CANDIDATES.length} points)`);
  for (const g of BOGOR_GRID_CANDIDATES) {
    const nearestComp = g.nearestCompetitorName ? g.nearestCompetitorName.replace(/'/g, "''") : '';
    const nearestRoad = g.nearestRoadName ? g.nearestRoadName.replace(/'/g, "''") : '';
    const nearestCrowd = g.nearestCrowdName ? g.nearestCrowdName.replace(/'/g, "''") : '';
    lines.push(`INSERT INTO grid_points (latitude, longitude, district_name, c1_dist_competitor, c2_population, c3_dist_road, c4_dist_crowd, nearest_competitor, nearest_road, nearest_crowd) VALUES (${g.lat}, ${g.lng}, '${g.district}', ${g.c1_dist_competitor}, ${g.c2_population}, ${g.c3_dist_road}, ${g.c4_dist_crowd}, '${nearestComp}', '${nearestRoad}', '${nearestCrowd}');`);
  }
  lines.push('');

  return lines.join('\n');
}

const sql = generateSql();
fs.writeFileSync(path.join(process.cwd(), 'supabase', 'complete_setup.sql'), sql, 'utf-8');
console.log('✅ Generated supabase/complete_setup.sql successfully!');
