import { NextResponse } from 'next/server';
import {
  BOGOR_DISTRICTS,
  BOGOR_COMPETITORS,
  BOGOR_ROADS,
  BOGOR_CROWD_CENTERS,
  BOGOR_GRID_CANDIDATES,
} from '@/data/bogor-spatial';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  try {
    const client = getSupabaseAdmin();

    if (isSupabaseConfigured && client) {
      try {
        const [compRes, crowdRes, distRes, roadRes, gridCountRes] = await Promise.all([
          client.from('competitors').select('*').limit(500),
          client.from('crowd_centers').select('*').limit(200),
          client.from('districts').select('*'),
          client.from('road_networks').select('*'),
          client.from('grid_points').select('id', { count: 'exact', head: true }),
        ]);

        if (compRes.data && compRes.data.length > 0) {
          return NextResponse.json({
            success: true,
            source: 'supabase_live',
            districts: BOGOR_DISTRICTS,
            competitors: compRes.data.map((c: any) => ({
              id: c.id,
              name: c.name || c.nama || 'Coffee Shop',
              category: c.category || c.kategori || 'Coffee Shop',
              district: c.district_name || c.district || c.kecamatan || 'Kota Bogor',
              address: c.address || c.alamat || '',
              lat: Number(c.latitude ?? c.lat ?? -6.5971),
              lng: Number(c.longitude ?? c.lng ?? 106.7972),
            })),
            roads: BOGOR_ROADS,
            crowdCenters:
              crowdRes.data && crowdRes.data.length > 0
                ? crowdRes.data.map((cc: any) => ({
                    id: cc.id,
                    name: cc.name || cc.nama,
                    category: cc.category || cc.kategori || 'mall',
                    district: cc.district_name || cc.district || cc.kecamatan || 'Kota Bogor',
                    description: cc.description || cc.deskripsi || '',
                    lat: Number(cc.latitude ?? cc.lat ?? -6.5971),
                    lng: Number(cc.longitude ?? cc.lng ?? 106.7972),
                  }))
                : BOGOR_CROWD_CENTERS,
            gridCount: gridCountRes.count ?? BOGOR_GRID_CANDIDATES.length,
          });
        }
      } catch (dbErr) {
        console.warn('Supabase query failed, falling back to embedded dataset:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      source: 'embedded_spatial_engine',
      districts: BOGOR_DISTRICTS,
      competitors: BOGOR_COMPETITORS,
      roads: BOGOR_ROADS,
      crowdCenters: BOGOR_CROWD_CENTERS,
      gridCount: BOGOR_GRID_CANDIDATES.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
