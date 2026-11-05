import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logAudit } from '@/lib/admin-resources';
import { invalidateSpatialCache } from '@/lib/spatial-db';

/** GET -> 68 kelurahan: penduduk, periode, luas poligon, luas resmi, kepadatan (sumber C2) */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });

  const [{ data: rows, error }, { data: dens }] = await Promise.all([
    db.from('villages').select('code,name,district_name,population,population_period,population_source,official_area_km2').order('district_name').order('name'),
    db.from('v_villages').select('code,area_km2,density'),
  ]);
  if (error) {
    // Tabel belum dibuat (supabase/villages.sql) -> halaman menampilkan petunjuk, bukan galat
    return NextResponse.json({ success: true, available: false, rows: [], message: error.message });
  }
  const byCode = new Map((dens ?? []).map((d) => [d.code, d]));
  return NextResponse.json({
    success: true,
    available: true,
    rows: (rows ?? []).map((r) => ({ ...r, area_km2: byCode.get(r.code)?.area_km2 ?? null, density: byCode.get(r.code)?.density ?? null })),
  });
}

/** PUT { period, values: { "<kode wilayah>": jumlah, ... } } -> perbarui penduduk kelurahan */
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { period?: string; values?: Record<string, number> } | null;
  const period = String(body?.period ?? '').trim();
  const values = body?.values ?? {};
  if (period.length < 4 || period.length > 80) return NextResponse.json({ success: false, error: 'Periode data wajib diisi (mis. "Semester 1 Tahun 2026").' }, { status: 400 });
  const codes = Object.keys(values);
  if (codes.length === 0) return NextResponse.json({ success: false, error: 'Tidak ada data penduduk.' }, { status: 400 });
  for (const c of codes) {
    const v = Number(values[c]);
    if (!Number.isInteger(v) || v < 100 || v > 500_000) return NextResponse.json({ success: false, error: `Jumlah penduduk kelurahan ${c} harus bilangan bulat 100 – 500.000.` }, { status: 400 });
  }

  const { data: current, error: curErr } = await db.from('villages').select('code,name,population,population_period');
  if (curErr) return NextResponse.json({ success: false, error: curErr.message }, { status: 400 });
  const known = new Map((current ?? []).map((r) => [r.code as string, r]));
  const unknown = codes.filter((c) => !known.has(c));
  if (unknown.length) return NextResponse.json({ success: false, error: `Kode kelurahan tidak dikenal: ${unknown.join(', ')}` }, { status: 400 });

  const before: Record<string, number> = {};
  const after: Record<string, number> = {};
  for (const c of codes) {
    const prev = known.get(c)!;
    const n = Number(values[c]);
    if (prev.population === n && prev.population_period === period) continue;
    const { error } = await db.from('villages').update({ population: n, population_period: period, updated_at: new Date().toISOString() }).eq('code', c);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    before[prev.name as string] = prev.population as number;
    after[prev.name as string] = n;
  }
  const changed = Object.keys(after).length;
  if (changed > 0) {
    invalidateSpatialCache('all');
    await logAudit({
      actor: auth.email, action: 'update', entity: 'population', entityId: period,
      label: `Penduduk kelurahan (${changed} kelurahan, ${period})`, before, after, affectsGrid: true,
    });
  }
  return NextResponse.json({ success: true, changed });
}
