import { NextRequest, NextResponse } from 'next/server';
import { loadPointCriteriaFromDb } from '@/lib/spatial-db';

/**
 * GET /api/spatial/point?lat=..&lng=..
 * Kriteria C1..C4 untuk satu titik survei, dihitung di database (PostGIS).
 * criteria = null bila database belum siap -> klien memakai perhitungan cadangan lokal.
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ success: false, error: 'lat/lng tidak valid' }, { status: 400 });
  }
  const criteria = await loadPointCriteriaFromDb(lat, lng);
  return NextResponse.json({ success: true, source: criteria ? 'supabase' : 'embedded', criteria });
}
