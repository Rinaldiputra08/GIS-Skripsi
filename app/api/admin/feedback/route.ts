import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

/** GET -> skenario & riwayat survei yang disimpan pengguna; DELETE ?type=scenario|survey&id= -> moderasi */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });
  const [sc, sv] = await Promise.all([
    db.from('scenarios').select('id,name,weights,cr,summary,created_at').order('created_at', { ascending: false }).limit(200),
    db.from('survey_logs').select('id,name,note,latitude,longitude,district,score,category,rank_estimate,total_candidates,created_at').order('created_at', { ascending: false }).limit(200),
  ]);
  if (sc.error || sv.error) return NextResponse.json({ success: false, error: (sc.error ?? sv.error)!.message }, { status: 500 });
  return NextResponse.json({ success: true, scenarios: sc.data, surveys: sv.data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });
  const type = req.nextUrl.searchParams.get('type');
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id) || (type !== 'scenario' && type !== 'survey')) {
    return NextResponse.json({ success: false, error: 'Parameter tidak valid.' }, { status: 400 });
  }
  const { error } = await db.from(type === 'scenario' ? 'scenarios' : 'survey_logs').delete().eq('id', id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
