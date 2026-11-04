import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin-auth';

export async function POST() {
  const out = NextResponse.json({ success: true });
  out.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return out;
}
