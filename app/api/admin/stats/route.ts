import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { loadSettings } from '@/lib/settings-db';

/** GET /api/admin/stats -> ringkasan untuk dasbor admin */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });

  const count = async (table: string, f?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = db.from(table).select('*', { count: 'exact', head: true });
    if (f) q = f(q);
    const { count: c, error } = await q;
    return error ? null : (c ?? 0);
  };

  const [kaggle, osm, manual, inCity, crowd, crowdInCity, zones, grid, scenarios, surveys] = await Promise.all([
    count('competitors', (q) => q.eq('source', 'kaggle')),
    count('competitors', (q) => q.eq('source', 'osm')),
    count('competitors', (q) => q.eq('source', 'manual')),
    count('v_competitors'),
    count('crowd_centers'),
    count('v_crowd_centers'),
    count('restricted_zones'),
    count('grid_points'),
    count('scenarios'),
    count('survey_logs'),
  ]);

  // Tabel CMS (cms.sql) sudah ada?
  const probe = await db.from('audit_log').select('id').limit(1);
  const cmsReady = !probe.error && zones !== null;

  let lastRun: Record<string, unknown> | null = null;
  let pending = 0;
  let pendingItems: { at: string; action: string; entity: string; label: string | null }[] = [];
  if (cmsReady) {
    const { data: run } = await db.from('grid_runs').select('id,at,actor,cell_m,duration_ms,n_points,n_competitors').order('at', { ascending: false }).limit(1);
    lastRun = (run?.[0] as Record<string, unknown>) ?? null;
    let q = db.from('audit_log').select('at,action,entity,label', { count: 'exact' }).eq('affects_grid', true).order('at', { ascending: false }).limit(8);
    if (lastRun) q = q.gt('at', lastRun.at as string);
    const { data, count: c } = await q;
    pending = c ?? 0;
    pendingItems = (data ?? []) as typeof pendingItems;
  }

  const { data: pop } = await db.from('population_data').select('tahun').order('tahun', { ascending: false }).limit(1);
  const settings = await loadSettings();

  return NextResponse.json({
    success: true,
    cmsReady,
    competitors: { total: (kaggle ?? 0) + (osm ?? 0) + (manual ?? 0), inCity, kaggle, osm, manual },
    crowd: { total: crowd, inCity: crowdInCity },
    zones: cmsReady ? zones : null,
    gridPoints: grid,
    populationYear: pop?.[0]?.tahun ?? null,
    scenarios,
    surveys,
    lastRun,
    pending,
    pendingItems,
    settings,
  });
}
