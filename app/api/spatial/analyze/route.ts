import { NextRequest, NextResponse } from 'next/server';
import { buildAhpMatrix, calculateAhp } from '@/lib/ahp';
import { calculateTopsis } from '@/lib/topsis';
import { BOGOR_GRID_CANDIDATES, getCandidatesForBusinessType } from '@/data/bogor-spatial';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { SpatialCandidate, BusinessType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { matrix, pairs, weights, businessType = 'coffee_shop' } = body;

    let ahpResult = null;

    // 1. Calculate AHP if matrix or pairs are provided
    if (pairs) {
      matrix = buildAhpMatrix(pairs);
    }

    if (matrix && Array.isArray(matrix)) {
      ahpResult = calculateAhp(matrix);
      if (!ahpResult.isConsistent) {
        return NextResponse.json(
          {
            success: false,
            error: 'CR > 0.1',
            cr: ahpResult.cr,
            ci: ahpResult.ci,
            lambdaMax: ahpResult.lambdaMax,
            message: `Rasio Konsistensi AHP (${(ahpResult.cr * 100).toFixed(2)}%) melebihi batas toleransi 10%. Mohon sesuaikan preferensi perbandingan berpasangan.`,
            ahpResult,
          },
          { status: 422 }
        );
      }
      weights = ahpResult.weightsArray;
    } else if (!weights || weights.length !== 4) {
      weights = [0.25, 0.25, 0.25, 0.25];
    }

    // 2. Fetch candidates from Supabase or embedded dataset
    let candidateData: SpatialCandidate[] = BOGOR_GRID_CANDIDATES;
    const client = getSupabaseAdmin();

    if (isSupabaseConfigured && client) {
      try {
        const { data, error } = await client.from('grid_points').select('*').limit(1000);
        if (!error && data && data.length > 0) {
          candidateData = data.map((d: any) => ({
            id: d.id,
            lat: Number(d.latitude ?? d.lat ?? -6.5971),
            lng: Number(d.longitude ?? d.lng ?? 106.7972),
            district: d.district_name ?? d.district ?? 'Bogor Tengah',
            c1_dist_competitor: Number(d.c1_dist_competitor ?? d.c1 ?? 100),
            c2_population: Number(d.c2_population ?? d.c2 ?? 100000),
            c3_dist_road: Number(d.c3_dist_road ?? d.c3 ?? 100),
            c4_dist_crowd: Number(d.c4_dist_crowd ?? d.c4 ?? 100),
            nearestCompetitorName: d.nearest_competitor,
            nearestRoadName: d.nearest_road,
            nearestCrowdName: d.nearest_crowd,
          }));
        }
      } catch (err) {
        console.warn('Supabase grid query failed, using embedded candidates', err);
      }
    }

    // 3. Adjust C1 distance according to selected business type
    if (businessType && businessType !== 'coffee_shop') {
      candidateData = getCandidatesForBusinessType(candidateData, businessType as BusinessType);
    }

    // 4. Run TOPSIS calculation
    const topsisResult = calculateTopsis(candidateData, weights as [number, number, number, number]);

    return NextResponse.json({
      success: true,
      ahpResult,
      topsisResult,
      top10: topsisResult.candidates.slice(0, 10),
      totalCount: topsisResult.candidates.length,
      executionTimeMs: topsisResult.executionTimeMs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Calculation error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
