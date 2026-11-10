import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/geocode?q=...
 * Cari alamat/tempat di Kota Bogor lewat Nominatim (OpenStreetMap).
 * Lewat server agar: User-Agent sesuai kebijakan Nominatim, hasil di-cache, dan dibatasi ±1 permintaan/detik.
 * Kebijakan: https://operations.osmfoundation.org/policies/nominatim/
 */

// Kotak batas Kota Bogor (sedikit dilebarkan): kiri, atas, kanan, bawah
const VIEWBOX = '106.725,-6.505,106.855,-6.69';
const CACHE = new Map<string, { at: number; results: Place[] }>();
const CACHE_MS = 24 * 60 * 60 * 1000;
let lastCall = 0;

interface Place { name: string; address: string; lat: number; lng: number; type: string }
interface NominatimRow { lat: string; lon: string; name?: string; display_name: string; type?: string; category?: string }

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().replace(/\s+/g, ' ');
  if (q.length < 3 || q.length > 120) {
    return NextResponse.json({ success: false, error: 'Ketik minimal 3 huruf.' }, { status: 400 });
  }
  const key = q.toLowerCase();
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return NextResponse.json({ success: true, results: hit.results });

  // Batas laju: maksimal 1 permintaan per detik ke Nominatim
  const wait = lastCall + 1000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    q, format: 'jsonv2', limit: '6', countrycodes: 'id', 'accept-language': 'id', viewbox: VIEWBOX, bounded: '1',
  }).toString();

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'kopispasial-bogor-thesis/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = (await res.json()) as NominatimRow[];
    const all: Place[] = rows.map((r) => {
      const parts = r.display_name.split(', ');
      const name = r.name || parts[0];
      return {
        name,
        // buang nama tempat, kode pos, provinsi & negara agar alamat ringkas
        address: parts.filter((p, i) => !(i === 0 && p === name) && !/^\d{5}$/.test(p) && !/^(Jawa Barat|Indonesia)$/.test(p) && !/^(No\.?\s*)?[\d;\-/ ]+$/i.test(p)).slice(0, 4).join(', '),
        lat: Number(r.lat),
        lng: Number(r.lon),
        type: r.type ?? r.category ?? '',
      };
    });
    // Buang duplikat: nama sama dalam radius ±150 m (mis. gedung & titik layanan mal yang sama)
    const results = all.filter((p, i) =>
      !all.slice(0, i).some((o) => o.name === p.name && Math.abs(o.lat - p.lat) < 0.0014 && Math.abs(o.lng - p.lng) < 0.0014)
    );
    CACHE.set(key, { at: Date.now(), results });
    if (CACHE.size > 500) CACHE.delete(CACHE.keys().next().value as string);
    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.warn('Geocode gagal:', err);
    return NextResponse.json({ success: false, error: 'Layanan pencarian alamat sedang tidak dapat dihubungi. Coba lagi sebentar.' }, { status: 502 });
  }
}
