import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logAudit } from '@/lib/admin-resources';
import { invalidateSpatialCache } from '@/lib/spatial-db';

type Row = Record<string, unknown>;

/** GET -> data penduduk tahun terbaru + daftar tahun yang tersedia */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });

  const [{ data: rows, error }, { data: dist }] = await Promise.all([
    db.from('population_data').select('id,bps_nama_kecamatan,jumlah_penduduk,tahun').order('tahun', { ascending: false }).order('bps_nama_kecamatan'),
    db.from('v_districts').select('name,population,area_km2,density,population_year'),
  ]);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, rows, districts: dist ?? [] });
}

/**
 * PUT { year, values: { "<NAMA KECAMATAN BPS>": jumlah, ... } }
 * Tahun yang sudah ada diperbarui; tahun baru dibuat dengan menyalin struktur tahun terbaru.
 * Aplikasi selalu memakai tahun TERBARU (v_districts), jadi menambah tahun baru langsung menggantinya.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { year?: number; values?: Record<string, number> } | null;
  const year = Number(body?.year);
  const values = body?.values ?? {};
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return NextResponse.json({ success: false, error: 'Tahun tidak valid.' }, { status: 400 });
  const names = Object.keys(values);
  if (names.length === 0) return NextResponse.json({ success: false, error: 'Tidak ada data penduduk.' }, { status: 400 });
  for (const n of names) {
    const v = Number(values[n]);
    if (!Number.isInteger(v) || v < 1000 || v > 5_000_000) return NextResponse.json({ success: false, error: `Jumlah penduduk ${n} harus bilangan bulat 1.000 – 5.000.000.` }, { status: 400 });
  }

  const { data: latestRows } = await db.from('population_data').select('*').order('tahun', { ascending: false });
  const all = (latestRows ?? []) as Row[];
  const maxYear = all.length ? Number(all[0].tahun) : 0;
  const template = all.filter((r) => Number(r.tahun) === maxYear);
  const existing = all.filter((r) => Number(r.tahun) === year);
  if (year < maxYear && existing.length === 0) {
    return NextResponse.json({ success: false, error: `Tahun ${year} lebih lama dari data terbaru (${maxYear}); aplikasi hanya memakai tahun terbaru.` }, { status: 400 });
  }

  const before = Object.fromEntries((existing.length ? existing : template).map((r) => [String(r.bps_nama_kecamatan), Number(r.jumlah_penduduk)]));
  try {
    if (existing.length > 0) {
      for (const r of existing) {
        const name = String(r.bps_nama_kecamatan);
        if (values[name] === undefined) continue;
        const { error } = await db.from('population_data').update({ jumlah_penduduk: Number(values[name]) }).eq('id', r.id as number);
        if (error) throw new Error(error.message);
      }
    } else {
      const inserts = template.map((r) => {
        const { id: _id, ...rest } = r; void _id;
        return { ...rest, tahun: year, jumlah_penduduk: Number(values[String(r.bps_nama_kecamatan)] ?? r.jumlah_penduduk) };
      });
      const { error } = await db.from('population_data').insert(inserts);
      if (error) throw new Error(error.message);
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }

  invalidateSpatialCache('all');
  await logAudit({
    actor: auth.email, action: existing.length ? 'update' : 'create', entity: 'population', entityId: String(year),
    label: `Penduduk tahun ${year}`, before, after: values, affectsGrid: true,
  });
  return NextResponse.json({ success: true });
}
