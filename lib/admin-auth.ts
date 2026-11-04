/**
 * Autentikasi admin (satu akun).
 *
 * - Kredensial diperiksa oleh Supabase Auth (email + kata sandi).
 * - Hanya email yang sama dengan ADMIN_EMAIL yang diterima, jadi pendaftaran akun lain di
 *   Supabase tidak otomatis menjadi admin.
 * - Setelah lolos, server menerbitkan cookie sesi bertanda tangan HMAC (httpOnly, SameSite=Lax,
 *   berlaku 12 jam). Semua endpoint /api/admin/* dan halaman /admin memverifikasi cookie ini.
 *
 * Hanya untuk server.
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const ADMIN_COOKIE = 'kb_admin';
const SESSION_HOURS = 12;

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    crypto.createHash('sha256').update('kopispasial-admin:' + (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')).digest('hex')
  );
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sign = (payload: string) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

export function createSessionToken(email: string): string {
  const payload = b64(JSON.stringify({ sub: email, exp: Date.now() + SESSION_HOURS * 3600_000 }));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub: string; exp: number };
    if (!data.sub || data.exp < Date.now()) return null;
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!adminEmail || data.sub.toLowerCase() !== adminEmail) return null;
    return data.sub;
  } catch {
    return null;
  }
}

/** Email admin yang sedang login (server component / route handler), atau null */
export async function getAdmin(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

/**
 * Pengaman route handler admin. Mengembalikan { email } bila lolos, atau NextResponse galat.
 * Untuk metode yang mengubah data, header Origin harus sama dengan host (perlindungan CSRF).
 */
export async function requireAdmin(req: NextRequest): Promise<{ email: string } | NextResponse> {
  const email = verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!email) return NextResponse.json({ success: false, error: 'Belum login atau sesi berakhir.' }, { status: 401 });
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== req.headers.get('host')) {
      return NextResponse.json({ success: false, error: 'Origin tidak diizinkan.' }, { status: 403 });
    }
  }
  return { email };
}

// ---------- pembatasan percobaan login (per IP, in-memory) ----------
const attempts = new Map<string, { n: number; first: number }>();
const WINDOW_MS = 10 * 60_000;
const MAX_FAILS = 6;

export function loginBlocked(ip: string): boolean {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() - a.first > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return a.n >= MAX_FAILS;
}
function recordFail(ip: string) {
  const a = attempts.get(ip);
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(ip, { n: 1, first: Date.now() });
  else a.n += 1;
}

/** Periksa email + kata sandi ke Supabase Auth. Mengembalikan email bila benar. */
export async function checkCredentials(email: string, password: string, ip: string): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return { ok: false, error: 'ADMIN_EMAIL belum diatur di .env server.' };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false, error: 'Supabase belum dikonfigurasi.' };

  const generic = { ok: false as const, error: 'Email atau kata sandi salah.' };
  if (email.trim().toLowerCase() !== adminEmail) {
    recordFail(ip);
    return generic;
  }
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) {
    recordFail(ip);
    return generic;
  }
  attempts.delete(ip);
  return { ok: true, email: data.user.email ?? adminEmail };
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_HOURS * 3600,
};
