import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { RESOURCES, validateInput, logAudit, auditSnapshot } from '@/lib/admin-resources';
import { getSupabaseAdmin } from '@/lib/supabase';
import { invalidateSpatialCache } from '@/lib/spatial-db';

type Ctx = { params: Promise<{ resource: string }> };
const PAGE = 1000;

/** GET /api/admin/:resource  -> seluruh baris (dengan penanda inCity untuk titik) */
export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { resource } = await ctx.params;
  const cfg = RESOURCES[resource];
  if (!cfg) return NextResponse.json({ success: false, error: 'Sumber data tidak dikenal.' }, { status: 404 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });

  async function all(table: string, select: string, filter?: (q: any) => any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const out: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = db!.from(table).select(select).order(table === cfg.table ? cfg.orderBy : 'id').range(from, from + PAGE - 1);
      if (filter) q = filter(q);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      out.push(...((data as unknown as Record<string, unknown>[]) ?? []));
      if (!data || data.length < PAGE) break;
    }
    return out;
  }

  try {
    const rows = await all(cfg.table, cfg.select, cfg.table === 'competitors' ? (q) => q.eq('business_type', 'coffee_shop') : undefined);
    if (cfg.cityView) {
      const inside = new Set((await all(cfg.cityView, 'id')).map((r) => r.id as string));
      for (const r of rows) r.inCity = inside.has(r.id as string);
    }
    return NextResponse.json({ success: true, rows });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

/** POST /api/admin/:resource -> tambah baris */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { resource } = await ctx.params;
  const cfg = RESOURCES[resource];
  if (!cfg) return NextResponse.json({ success: false, error: 'Sumber data tidak dikenal.' }, { status: 404 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ success: false, error: 'Body tidak valid.' }, { status: 400 });
  const v = validateInput(cfg, body, false);
  if (!v.ok) return NextResponse.json({ success: false, error: v.error }, { status: 400 });

  // Cegah duplikat kompetitor: nama sama dalam radius ~100 m (boleh diteruskan dengan force)
  if (resource === 'competitors' && !body.force) {
    const lat = v.data.latitude as number, lng = v.data.longitude as number;
    const d = 0.001; // ~110 m
    const { data: near } = await db.from('competitors').select('id,name,latitude,longitude')
      .gte('latitude', lat - d).lte('latitude', lat + d).gte('longitude', lng - d).lte('longitude', lng + d);
    const nm = String(v.data.name).toLowerCase().replace(/[^a-z0-9]/g, '');
    const dup = (near ?? []).find((n) => String(n.name).toLowerCase().replace(/[^a-z0-9]/g, '') === nm);
    if (dup) {
      return NextResponse.json({ success: false, duplicate: true, error: `"${dup.name}" sudah ada di sekitar titik ini (±100 m).` }, { status: 409 });
    }
  }

  const { data, error } = await db.from(cfg.table).insert({ ...cfg.createDefaults, ...v.data }).select(cfg.select).single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  const row = data as unknown as Record<string, unknown>;

  invalidateSpatialCache(cfg.affectsGrid ? 'layers' : 'zones');
  invalidateSpatialCache('layers');
  await logAudit({
    actor: auth.email, action: 'create', entity: cfg.entity, entityId: String(row.id),
    label: String(row[cfg.labelKey] ?? ''), after: auditSnapshot(row), affectsGrid: cfg.affectsGrid,
  });
  return NextResponse.json({ success: true, row });
}
