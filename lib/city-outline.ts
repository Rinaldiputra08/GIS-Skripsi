/**
 * Garis batas luar Kota Bogor, diturunkan dari poligon 6 kecamatan: sisi poligon yang salah satu
 * sisinya (kiri/kanan) tidak berada di dalam kecamatan mana pun. Dengan begitu garis tepi di peta
 * selalu sama persis dengan cakupan grid (batas antar-kecamatan tidak ikut ditebalkan).
 */
import type { DistrictGeo } from './types';
import { isPointInPolygon } from '@/data/bogor-spatial';

type LatLng = [number, number];
const M_PER_DEG = 111320;
const OFFSET_M = 12; // jarak uji ke kiri/kanan sisi

export function cityOutline(districts: DistrictGeo[]): LatLng[][] {
  const rings = districts.flatMap((d) => d.coordinates);
  const inside = (lat: number, lng: number) => rings.some((r) => isPointInPolygon(lat, lng, r));
  const segments: LatLng[][] = [];
  let current: LatLng[] | null = null;
  for (const ring of rings) {
    current = null;
    for (let i = 0; i < ring.length - 1; i++) {
      const [la1, ln1] = ring[i];
      const [la2, ln2] = ring[i + 1];
      const kx = M_PER_DEG * Math.cos((la1 * Math.PI) / 180);
      const dx = (ln2 - ln1) * kx, dy = (la2 - la1) * M_PER_DEG;
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;
      // titik tengah sisi digeser tegak lurus ke kiri & kanan
      const mx = (ln1 + ln2) / 2, my = (la1 + la2) / 2;
      const ox = (-dy / len) * OFFSET_M / kx, oy = (dx / len) * OFFSET_M / M_PER_DEG;
      const outer = !inside(my + oy, mx + ox) || !inside(my - oy, mx - ox);
      if (outer) {
        if (!current) { current = [ring[i]]; segments.push(current); }
        current.push(ring[i + 1]);
      } else current = null;
    }
  }
  return segments;
}
