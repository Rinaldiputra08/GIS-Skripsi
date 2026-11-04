import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { clip, rateLimited, validOwner } from '@/lib/public-limits';

const MAX_TOTAL = 5000;
const COLS = 'id,name,note,latitude,longitude,district,score,category,rank_estimate,total_candidates,criteria,weights,created_at';

/** GET /api/survey-logs?ownerId=...  -> riwayat survei milik perangkat ini */
export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get('ownerId');
  if (!validOwner(owner)) return NextResponse.json({ success: false, error: 'ownerId tidak valid.' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: true, logs: [], available: false });
  const { data, error } = await db.from('survey_logs').select(COLS).eq('owner_id', owner).order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ success: true, logs: [], available: false });
  return NextResponse.json({ success: true, logs: data, available: true });
}

/** POST /api/survey-logs -> simpan hasil survei lokasi */
export async function POST(req: NextRequest) {
  if (rateLimited('survey', req, 40, 3600_000)) {
    return NextResponse.json({ success: false, error: 'Terlalu banyak penyimpanan. Coba lagi nanti.' }, { status: 429 });
  }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || !validOwner(b.ownerId)) return NextResponse.json({ success: false, error: 'Permintaan tidak valid.' }, { status: 400 });
  const lat = Number(b.latitude), lng = Number(b.longitude), score = Number(b.score);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(score)) {
    return NextResponse.json({ success: false, error: 'Koordinat/skor tidak valid.' }, { status: 400 });
  }
  if (JSON.stringify(b.criteria ?? null).length > 2000 || JSON.stringify(b.weights ?? null).length > 300) {
    return NextResponse.json({ success: false, error: 'Data terlalu besar.' }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Database belum dikonfigurasi.' }, { status: 503 });
  const { count } = await db.from('survey_logs').select('*', { count: 'exact', head: true });
  if ((count ?? 0) >= MAX_TOTAL) return NextResponse.json({ success: false, error: 'Penyimpanan penuh.' }, { status: 507 });

  const { data, error } = await db.from('survey_logs').insert({
    owner_id: b.ownerId, name: clip(b.name, 80), note: clip(b.note, 400), latitude: lat, longitude: lng,
    district: clip(b.district, 60), score, category: clip(b.category, 20),
    rank_estimate: Number.isInteger(b.rankEstimate) ? b.rankEstimate : null,
    total_candidates: Number.isInteger(b.totalCandidates) ? b.totalCandidates : null,
    criteria: b.criteria ?? null, weights: b.weights ?? null,
  }).select(COLS).single();
  if (error) return NextResponse.json({ success: false, error: 'Gagal menyimpan survei.' }, { status: 500 });
  return NextResponse.json({ success: true, log: data });
}

/** DELETE /api/survey-logs?id=&ownerId= -> hapus catatan milik sendiri */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  const owner = req.nextUrl.searchParams.get('ownerId');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !validOwner(owner)) return NextResponse.json({ success: false, error: 'Parameter tidak valid.' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Database belum dikonfigurasi.' }, { status: 503 });
  const { error } = await db.from('survey_logs').delete().eq('id', id).eq('owner_id', owner);
  if (error) return NextResponse.json({ success: false, error: 'Gagal menghapus.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
