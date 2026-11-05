import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { RESOURCES, validateInput, logAudit, auditSnapshot } from '@/lib/admin-resources';
import { getSupabaseAdmin } from '@/lib/supabase';
import { invalidateSpatialCache } from '@/lib/spatial-db';

type Ctx = { params: Promise<{ resource: string; id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

async function prepare(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return { error: auth } as const;
  const { resource, id } = await ctx.params;
  const cfg = RESOURCES[resource];
  if (!cfg) return { error: NextResponse.json({ success: false, error: 'Sumber data tidak dikenal.' }, { status: 404 }) } as const;
  if (!UUID.test(id)) return { error: NextResponse.json({ success: false, error: 'ID tidak valid.' }, { status: 400 }) } as const;
  const db = getSupabaseAdmin();
  if (!db) return { error: NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 }) } as const;
  return { auth, cfg, id, db } as const;
}

/** PUT /api/admin/:resource/:id -> ubah baris */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const p = await prepare(req, ctx);
  if ('error' in p) return p.error;
  const { auth, cfg, id, db } = p;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ success: false, error: 'Body tidak valid.' }, { status: 400 });
  const v = validateInput(cfg, body, true);
  if (!v.ok) return NextResponse.json({ success: false, error: v.error }, { status: 400 });
  if (Object.keys(v.data).length === 0) return NextResponse.json({ success: false, error: 'Tidak ada perubahan.' }, { status: 400 });

  const { data: before } = await db.from(cfg.table).select(cfg.select).eq('id', id).maybeSingle();
  if (!before) return NextResponse.json({ success: false, error: 'Data tidak ditemukan.' }, { status: 404 });
  if (cfg.table === 'restricted_zones' && (before as unknown as Record<string, unknown>).source === 'osm') {
    return NextResponse.json({
      success: false,
      error: 'Zona dari OpenStreetMap berupa poligon dan diperbarui lewat impor ulang (scripts/import-osm-zones.mjs). Hapus zona ini atau tambahkan zona lingkaran baru bila perlu.',
    }, { status: 400 });
  }

  const { data, error } = await db.from(cfg.table).update({ ...v.data, updated_at: new Date().toISOString() }).eq('id', id).select(cfg.select).single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  const row = data as unknown as Record<string, unknown>;

  invalidateSpatialCache(cfg.affectsGrid ? 'layers' : 'zones');
  invalidateSpatialCache('layers');
  await logAudit({
    actor: auth.email, action: 'update', entity: cfg.entity, entityId: id,
    label: String(row[cfg.labelKey] ?? ''), before: auditSnapshot(before as unknown as Record<string, unknown>),
    after: auditSnapshot(row), affectsGrid: cfg.affectsGrid,
  });
  return NextResponse.json({ success: true, row });
}

/** DELETE /api/admin/:resource/:id -> hapus baris */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const p = await prepare(req, ctx);
  if ('error' in p) return p.error;
  const { auth, cfg, id, db } = p;

  const { data: before } = await db.from(cfg.table).select(cfg.select).eq('id', id).maybeSingle();
  if (!before) return NextResponse.json({ success: false, error: 'Data tidak ditemukan.' }, { status: 404 });

  const { error } = await db.from(cfg.table).delete().eq('id', id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

  invalidateSpatialCache(cfg.affectsGrid ? 'layers' : 'zones');
  invalidateSpatialCache('layers');
  const b = before as unknown as Record<string, unknown>;
  await logAudit({
    actor: auth.email, action: 'delete', entity: cfg.entity, entityId: id,
    label: String(b[cfg.labelKey] ?? ''), before: auditSnapshot(b), affectsGrid: cfg.affectsGrid,
  });
  return NextResponse.json({ success: true });
}
