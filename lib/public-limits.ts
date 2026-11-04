/** Pembatas sederhana untuk endpoint publik yang menulis data (in-memory, per IP). */
import { NextRequest } from 'next/server';

const hits = new Map<string, number[]>();

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

/** true bila IP melewati batas `max` permintaan dalam `windowMs` */
export function rateLimited(bucket: string, req: NextRequest, max: number, windowMs: number): boolean {
  const k = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  const list = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(k, list);
    return true;
  }
  list.push(now);
  hits.set(k, list);
  return false;
}

/** id anonim perangkat (uuid yang dibuat browser) */
export const validOwner = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f-]{20,40}$/i.test(s);

export const clip = (s: unknown, n: number): string | null => {
  if (typeof s !== 'string') return null;
  const t = s.trim().slice(0, n);
  return t.length ? t : null;
};
