import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { loadGridFromDb, invalidateSpatialCache } from '@/lib/spatial-db';
import { loadSettings } from '@/lib/settings-db';
import { calculateTopsis } from '@/lib/topsis';
import { compareRankings, summarize } from '@/lib/ranking-summary';
import { logAudit } from '@/lib/admin-resources';

export const maxDuration = 120;
const EQUAL: [number, number, number, number] = [0.25, 0.25, 0.25, 0.25];

/**
 * POST /api/admin/apply
 * Menerapkan perubahan data: membangun ulang grid_points (PostGIS) lalu membandingkan peringkat
 * TOPSIS sebelum vs sesudah. Perbandingan memakai bobot sama rata agar adil (tidak bergantung
 * preferensi AHP tertentu).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });

  try {
    const settings = await loadSettings();
    const beforeGrid = await loadGridFromDb({ fresh: true });
    const beforeRes = beforeGrid ? calculateTopsis(beforeGrid, EQUAL).candidates : null;

    const { data: lastRun } = await db.from('grid_runs').select('n_competitors').order('at', { ascending: false }).limit(1);
    const prevCompetitors = (lastRun?.[0]?.n_competitors as number | null | undefined) ?? null;

    const t0 = Date.now();
    const { data: n, error } = await db.rpc('rebuild_grid_points', { cell_m: settings.cellMeters });
    const durationMs = Date.now() - t0;
    if (error) {
      const timeout = /timeout/i.test(error.message);
      return NextResponse.json({
        success: false,
        error: timeout
          ? 'Pembangunan grid melebihi batas waktu API Supabase. Jalankan supabase/cms.sql (versi cepat) atau jalankan "SELECT rebuild_grid_points(300);" di SQL Editor, lalu muat ulang halaman ini.'
          : `Gagal membangun grid: ${error.message}`,
      }, { status: 500 });
    }

    invalidateSpatialCache('all');
    const afterGrid = await loadGridFromDb({ fresh: true });
    if (!afterGrid) return NextResponse.json({ success: false, error: 'Grid baru tidak terbaca dari database.' }, { status: 500 });
    const afterRes = calculateTopsis(afterGrid, EQUAL).candidates;

    const { count: nComp } = await db.from('v_competitors').select('id', { count: 'exact', head: true });
    const before = beforeRes ? summarize(beforeRes) : null;
    const after = summarize(afterRes);
    const diff = compareRankings(beforeRes, afterRes);

    await db.from('grid_runs').insert({
      actor: auth.email, cell_m: settings.cellMeters, duration_ms: durationMs, n_points: Number(n) || afterGrid.length,
      n_competitors: nComp ?? null, before: before ? { summary: before } : null, after: { summary: after, diff },
    });
    await logAudit({
      actor: auth.email, action: 'apply', entity: 'grid', label: `Grid dibangun ulang (${afterGrid.length} titik)`,
      after: { cellMeters: settings.cellMeters, nCompetitors: nComp, durationMs },
    });

    return NextResponse.json({ success: true, durationMs, nPoints: afterGrid.length, nCompetitors: nComp ?? 0, prevCompetitors, before, after, diff });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
