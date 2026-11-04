import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, checkCredentials, createSessionToken, loginBlocked, sessionCookieOptions } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (loginBlocked(ip)) {
    return NextResponse.json({ success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.' }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) {
    return NextResponse.json({ success: false, error: 'Email dan kata sandi wajib diisi.' }, { status: 400 });
  }
  const res = await checkCredentials(body.email, body.password, ip);
  if (!res.ok) return NextResponse.json({ success: false, error: res.error }, { status: 401 });

  const out = NextResponse.json({ success: true, email: res.email });
  out.cookies.set(ADMIN_COOKIE, createSessionToken(res.email), sessionCookieOptions);
  return out;
}
