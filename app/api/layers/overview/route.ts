import { NextResponse } from 'next/server';
import {
  BOGOR_DISTRICTS,
  BOGOR_COMPETITORS,
  BOGOR_ROADS,
  BOGOR_CROWD_CENTERS,
  BOGOR_GRID_CANDIDATES,
} from '@/data/bogor-spatial';
import { loadLayersFromDb, loadGridFromDb, loadZones } from '@/lib/spatial-db';
import { loadSettings } from '@/lib/settings-db';

/**
 * Layer peta + grid kandidat.
 * Sumber utama: Supabase/PostGIS (view bersih + grid_points hasil supabase/pipeline.sql).
 * Cadangan   : dataset lokal (data/generated) bila database belum siap / tidak terjangkau.
 * Layer dan grid ditentukan sumbernya terpisah, dan `source` hanya 'supabase_live' bila KEDUANYA
 * berasal dari database, agar label sumber data di UI tidak menyesatkan.
 */
export async function GET() {
  try {
    const settings = await loadSettings();
    const [layers, grid, zoneData] = await Promise.all([loadLayersFromDb(), loadGridFromDb(), loadZones()]);

    const source = layers && grid ? 'supabase_live' : 'embedded_spatial_engine';

    return NextResponse.json({
      success: true,
      source,
      layersSource: layers ? 'supabase' : 'embedded',
      gridSource: grid ? 'supabase' : 'embedded',
      districts: layers?.districts ?? BOGOR_DISTRICTS,
      competitors: layers?.competitors ?? BOGOR_COMPETITORS,
      roads: layers?.roads ?? BOGOR_ROADS,
      crowdCenters: layers?.crowdCenters ?? BOGOR_CROWD_CENTERS,
      grid: grid ?? BOGOR_GRID_CANDIDATES,
      exclusionZones: zoneData.zones,
      settings,
      gridCount: (grid ?? BOGOR_GRID_CANDIDATES).length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
