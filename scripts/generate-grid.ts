/**
 * Standalone Node.js Spatial Grid Pre-computation Script
 * Run with: npx ts-node scripts/generate-grid.ts or npx tsx scripts/generate-grid.ts
 */

import { BOGOR_GRID_CANDIDATES } from '../data/bogor-spatial';
import { getSupabaseAdmin } from '../lib/supabase';

async function main() {
  console.log('🚀 Memulai prekomputasi matriks spasial grid Kota Bogor...');
  console.log(`📊 Total titik grid ter-generate: ${BOGOR_GRID_CANDIDATES.length} titik.`);

  const sample = BOGOR_GRID_CANDIDATES[0];
  console.log('🔍 Contoh titik kandidat [0]:', {
    id: sample.id,
    district: sample.district,
    lat: sample.lat,
    lng: sample.lng,
    c1_competitor_dist_m: sample.c1_dist_competitor,
    c2_population_jiwa: sample.c2_population,
    c3_road_dist_m: sample.c3_dist_road,
    c4_crowd_dist_m: sample.c4_dist_crowd,
  });

  const supabase = getSupabaseAdmin();
  if (supabase) {
    console.log('💾 Terhubung ke Supabase. Mengunggah data titik grid ke tabel `grid_points`...');
    try {
      const records = BOGOR_GRID_CANDIDATES.map((c) => ({
        latitude: c.lat,
        longitude: c.lng,
        district_name: c.district,
        c1_dist_competitor: c.c1_dist_competitor,
        c2_population: c.c2_population,
        c3_dist_road: c.c3_dist_road,
        c4_dist_crowd: c.c4_dist_crowd,
        nearest_competitor: c.nearestCompetitorName,
        nearest_road: c.nearestRoadName,
        nearest_crowd: c.nearestCrowdName,
      }));

      const { data, error } = await supabase.from('grid_points').upsert(records);
      if (error) {
        console.error('❌ Gagal upload ke Supabase:', error.message);
      } else {
        console.log('✅ Berhasil sinkronisasi titik grid ke database Supabase!');
      }
    } catch (err) {
      console.error('❌ Error eksekusi batch upload:', err);
    }
  } else {
    console.log('ℹ️ Mode Lokal: Environment Supabase belum diset. Data spasial embedded siap digunakan.');
  }

  console.log('✨ Proses Spatial Pre-computation Selesai.');
}

main().catch(console.error);
