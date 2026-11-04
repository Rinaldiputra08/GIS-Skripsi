import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

/** GET -> riwayat perubahan data (audit_log) dan riwayat penerapan grid (grid_runs) */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ success: false, error: 'Supabase belum dikonfigurasi.' }, { status: 500 });
  const [audit, runs] = await Promise.all([
    db.from('audit_log').select('*').order('at', { ascending: false }).limit(200),
    db.from('grid_runs').select('*').order('at', { ascending: false }).limit(30),
  ]);
  if (audit.error) return NextResponse.json({ success: false, error: audit.error.message }, { status: 500 });
  return NextResponse.json({ success: true, audit: audit.data, runs: runs.data ?? [] });
}
