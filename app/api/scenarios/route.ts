import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { clip, rateLimited, validOwner } from '@/lib/public-limits';

const MAX_TOTAL = 2000;

/** GET /api/scenarios?ownerId=...  -> skenario milik perangkat ini */
export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get('ownerId');
  if (!validOwner(owner)) return NextResponse.json({ success: false, error: 'ownerId tidak valid.' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: true, scenarios: [], available: false });
  const { data, error } = await db.from('scenarios').select('id,name,weights,pairs,cr,summary,created_at')
    .eq('owner_id', owner).order('created_at', { ascending: false }).limit(30);
  // Tabel belum dibuat (cms.sql belum dijalankan): fitur dinonaktifkan, bukan galat
  if (error) return NextResponse.json({ success: true, scenarios: [], available: false });
  return NextResponse.json({ success: true, scenarios: data, available: true });
}

/** POST /api/scenarios  -> simpan skenario (bobot AHP + ringkasan hasil) */
export async function POST(req: NextRequest) {
  if (rateLimited('scenario', req, 20, 3600_000)) {
    return NextResponse.json({ success: false, error: 'Terlalu banyak penyimpanan. Coba lagi nanti.' }, { status: 429 });
  }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = clip(b?.name, 60);
  const w = b?.weights;
  if (!b || !validOwner(b.ownerId) || !name) return NextResponse.json({ success: false, error: 'Nama skenario wajib diisi.' }, { status: 400 });
  if (!Array.isArray(w) || w.length !== 4 || w.some((x) => typeof x !== 'number' || x < 0 || x > 1) || Math.abs((w as number[]).reduce((s, x) => s + x, 0) - 1) > 0.01) {
    return NextResponse.json({ success: false, error: 'Bobot tidak valid.' }, { status: 400 });
  }
  const summary = b.summary ?? null;
  if (JSON.stringify(summary).length > 6000 || JSON.stringify(b.pairs ?? null).length > 600) {
    return NextResponse.json({ success: false, error: 'Data terlalu besar.' }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Database belum dikonfigurasi.' }, { status: 503 });
  const { count } = await db.from('scenarios').select('*', { count: 'exact', head: true });
  if ((count ?? 0) >= MAX_TOTAL) return NextResponse.json({ success: false, error: 'Penyimpanan penuh.' }, { status: 507 });

  const { data, error } = await db.from('scenarios').insert({
    owner_id: b.ownerId, name, weights: w, pairs: b.pairs ?? null, cr: typeof b.cr === 'number' ? b.cr : null, summary,
  }).select('id,name,weights,pairs,cr,summary,created_at').single();
  if (error) return NextResponse.json({ success: false, error: 'Gagal menyimpan skenario.' }, { status: 500 });
  return NextResponse.json({ success: true, scenario: data });
}

/** DELETE /api/scenarios?id=&ownerId=  -> hapus skenario milik sendiri */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  const owner = req.nextUrl.searchParams.get('ownerId');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !validOwner(owner)) return NextResponse.json({ success: false, error: 'Parameter tidak valid.' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Database belum dikonfigurasi.' }, { status: 503 });
  const { error } = await db.from('scenarios').delete().eq('id', id).eq('owner_id', owner);
  if (error) return NextResponse.json({ success: false, error: 'Gagal menghapus.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
