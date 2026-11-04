import { NextRequest, NextResponse } from 'next/server';
import { buildAhpMatrix, calculateAhp } from '@/lib/ahp';
import { calculateTopsis } from '@/lib/topsis';
import { BOGOR_GRID_CANDIDATES } from '@/data/bogor-spatial';
import { loadGridFromDb } from '@/lib/spatial-db';
import { loadSettings } from '@/lib/settings-db';
import { SpatialCandidate } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pairs } = body;
    let { matrix, weights } = body;

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

    // 2. Kandidat = grid_points hasil pipeline PostGIS di Supabase (supabase/pipeline.sql).
    // Jika database belum siap / tidak terjangkau, pakai grid cadangan dari dataset lokal.
    const dbGrid = await loadGridFromDb();
    const candidateData: SpatialCandidate[] = dbGrid ?? BOGOR_GRID_CANDIDATES;
    const dataSource = dbGrid ? 'supabase' : 'embedded';

    await loadSettings(); // ambang kategori Vi dari parameter sistem

    // 3. Run TOPSIS calculation
    const topsisResult = calculateTopsis(candidateData, weights as [number, number, number, number]);

    return NextResponse.json({
      success: true,
      ahpResult,
      topsisResult,
      top10: topsisResult.candidates.slice(0, 10),
      totalCount: topsisResult.candidates.length,
      executionTimeMs: topsisResult.executionTimeMs,
      dataSource,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Calculation error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
