import { NextResponse, type NextRequest } from 'next/server';

/**
 * Penjaga awal halaman /admin: tanpa cookie sesi, arahkan ke halaman login.
 * Ini hanya pemeriksaan cepat; keabsahan sesi (tanda tangan & masa berlaku) diverifikasi lagi
 * oleh layout admin dan oleh setiap route handler /api/admin/* (lib/admin-auth.ts).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  if (!req.cookies.get('kb_admin')) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: '/admin/:path*' };
