/**
 * Loader data spasial dari Supabase (PostGIS) - SUMBER DATA UTAMA aplikasi.
 *
 * Pipeline di database ada di supabase/pipeline.sql:
 *   tabel mentah -> view bersih -> rebuild_grid_points() -> grid_points
 *
 * Semua fungsi mengembalikan null jika database tidak terjangkau / belum disiapkan
 * (pipeline.sql belum dijalankan), sehingga pemanggil dapat memakai data cadangan lokal
 * (data/generated) dan menandai sumbernya dengan jelas.
 *
 * Hanya untuk dipakai di server (route handler).
 */
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase';
import { checkSpatialConstraint, BOGOR_EXCLUSION_ZONES } from '@/data/bogor-spatial';
import type {
  CompetitorPoint,
  CrowdCenterPoint,
  DistrictGeo,
  ExclusionZone,
  RoadSegment,
  PointCriteria,
  SpatialCandidate,
} from './types';

// Baris mentah PostgREST: bentuknya dinamis (view/tabel), divalidasi saat dipetakan
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type LatLng = [number, number];

const PAGE = 1000; // batas baris per request PostgREST

async function fetchAll(table: string, select = '*', orderBy = 'id'): Promise<Row[]> {
  const client = getSupabaseAdmin();
  if (!isSupabaseConfigured || !client) throw new Error('Supabase belum dikonfigurasi');
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select(select)
      .order(orderBy)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data as unknown as Row[]) ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

// GeoJSON [lng, lat] -> [lat, lng]
const flip = (c: number[]): LatLng => [c[1], c[0]];

const DISTRICT_COLORS: Record<string, { id: string; color: string }> = {
  'Bogor Tengah': { id: 'bogor_tengah', color: '#3B82F6' },
  'Bogor Timur': { id: 'bogor_timur', color: '#10B981' },
  'Bogor Utara': { id: 'bogor_utara', color: '#8B5CF6' },
  'Bogor Selatan': { id: 'bogor_selatan', color: '#F59E0B' },
  'Bogor Barat': { id: 'bogor_barat', color: '#EC4899' },
  'Tanah Sareal': { id: 'tanah_sareal', color: '#06B6D4' },
};

const ROAD_TYPE: Record<string, RoadSegment['type']> = {
  trunk: 'arterial', // jalan nasional (Pajajaran, Sholeh Iskandar, Tajur, dll.)
  primary: 'arterial',
  secondary: 'collector',
  tertiary: 'secondary',
};

export interface DbLayers {
  districts: DistrictGeo[];
  competitors: CompetitorPoint[];
  roads: RoadSegment[];
  crowdCenters: CrowdCenterPoint[];
}

let layersCache: { at: number; data: DbLayers } | null = null;
let gridCache: { at: number; data: SpatialCandidate[] } | null = null;
let zonesCache: { at: number; data: ExclusionZone[] } | null = null;
const TTL_MS = 60_000;

/** Dipanggil CMS setelah data berubah agar pembacaan berikutnya langsung segar */
export function invalidateSpatialCache(which: 'all' | 'layers' | 'grid' | 'zones' = 'all') {
  if (which === 'all' || which === 'layers') layersCache = null;
  if (which === 'all' || which === 'grid') gridCache = null;
  if (which === 'all' || which === 'zones' || which === 'grid') zonesCache = null;
  if (which === 'zones') gridCache = null; // status terlarang per titik ikut berubah
}

/** Baris restricted_zones -> ExclusionZone. Lingkaran (radius_m terisi) tidak perlu mengirim poligonnya. */
export function zoneFromRow(z: Row): ExclusionZone {
  const radius = z.radius_m == null ? null : Number(z.radius_m);
  let shape: ExclusionZone['shape'];
  if (!radius && z.geom && (z.geom.type === 'MultiPolygon' || z.geom.type === 'Polygon')) {
    const polys: number[][][][] = z.geom.type === 'MultiPolygon' ? z.geom.coordinates : [z.geom.coordinates];
    shape = polys.map((poly) => poly.map((ring) => ring.map(flip)));
  }
  return {
    id: z.id,
    name: z.name,
    type: z.zone_type,
    typeLabel: z.type_label,
    description: z.description ?? '',
    center: [Number(z.latitude), Number(z.longitude)],
    radiusMeters: radius,
    ...(shape ? { shape } : {}),
    source: z.source ?? 'manual',
    osmRef: z.osm_ref ?? null,
  };
}

/** Zona terlarang dari tabel restricted_zones; null bila tabel belum ada (pakai daftar bawaan di kode) */
export async function loadZonesFromDb(): Promise<ExclusionZone[] | null> {
  if (zonesCache && Date.now() - zonesCache.at < TTL_MS) return zonesCache.data;
  try {
    const rows = await fetchAll('restricted_zones', '*', 'created_at');
    const data: ExclusionZone[] = rows.map((z) => zoneFromRow(z));
    zonesCache = { at: Date.now(), data };
    return data;
  } catch (err) {
    console.warn('[spatial-db] zona terlarang dari Supabase tidak tersedia:', (err as Error).message);
    return null;
  }
}

export async function loadZones(): Promise<{ zones: ExclusionZone[]; source: 'supabase' | 'embedded' }> {
  const db = await loadZonesFromDb();
  return db ? { zones: db, source: 'supabase' } : { zones: BOGOR_EXCLUSION_ZONES, source: 'embedded' };
}

export async function loadLayersFromDb(): Promise<DbLayers | null> {
  if (layersCache && Date.now() - layersCache.at < TTL_MS) return layersCache.data;
  try {
    const [dist, comp, roads, crowd] = await Promise.all([
      fetchAll('v_districts'),
      fetchAll('v_competitors'),
      fetchAll('v_roads_display'),
      fetchAll('v_crowd_centers'),
    ]);
    if (dist.length === 0 || comp.length === 0) return null;

    const districts: DistrictGeo[] = dist.map((d) => {
      // MultiPolygon -> ambil cincin luar terbesar (batas kecamatan berupa satu poligon)
      const polys: number[][][][] = d.geom.type === 'MultiPolygon' ? d.geom.coordinates : [d.geom.coordinates];
      const outer = polys.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
      const ring = outer.map(flip);
      const meta = DISTRICT_COLORS[d.name] ?? { id: String(d.name).toLowerCase().replace(/\s+/g, '_'), color: '#64748B' };
      return {
        id: meta.id,
        name: d.name,
        population: Number(d.population),
        areaKm2: Number(d.area_km2),
        density: Number(d.density),
        color: meta.color,
        center: [
          ring.reduce((s, p) => s + p[0], 0) / ring.length,
          ring.reduce((s, p) => s + p[1], 0) / ring.length,
        ],
        coordinates: [ring],
      };
    });

    const data: DbLayers = {
      districts,
      competitors: comp.map((c) => ({
        id: c.id,
        name: c.name,
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        district: c.district_name,
        address: c.address ?? '',
        category: c.category ?? 'Coffee shop',
        source: c.source ?? undefined,
      })),
      roads: roads
        .filter((r) => r.geom && r.geom.type === 'LineString')
        .map((r) => ({
          id: r.id,
          name: r.name,
          type: ROAD_TYPE[r.road_type] ?? 'secondary',
          coordinates: r.geom.coordinates.map(flip),
        })),
      crowdCenters: crowd.map((c) => ({
        id: c.id,
        name: c.name || `${c.category} (tanpa nama)`,
        category: c.category,
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        district: c.district_name,
      })),
    };
    layersCache = { at: Date.now(), data };
    return data;
  } catch (err) {
    console.warn('[spatial-db] layer dari Supabase tidak tersedia:', (err as Error).message);
    return null;
  }
}

export async function loadGridFromDb(opts: { fresh?: boolean } = {}): Promise<SpatialCandidate[] | null> {
  if (opts.fresh) invalidateSpatialCache('grid');
  if (gridCache && Date.now() - gridCache.at < TTL_MS) return gridCache.data;
  try {
    const cols =
      'id,latitude,longitude,district_name,c1_distance_competitor,c2_population_density,c3_distance_road,c4_distance_crowd,nearest_competitor,nearest_road,nearest_crowd';
    // village_name (C2 per kelurahan, supabase/villages.sql); database lama belum punya kolom ini
    const rows = await fetchAll('grid_points', `${cols},village_name`).catch(() => fetchAll('grid_points', cols));
    const valid =
      rows.length > 0 &&
      rows.every(
        (r) =>
          r.latitude != null &&
          r.district_name != null &&
          r.c1_distance_competitor != null &&
          r.c2_population_density != null &&
          r.c3_distance_road != null &&
          r.c4_distance_crowd != null
      );
    if (!valid) {
      console.warn('[spatial-db] grid_points kosong / belum lengkap (jalankan supabase/pipeline.sql).');
      return null;
    }

    // Urutkan agar id & urutan stabil (selatan ke utara, barat ke timur)
    rows.sort((a, b) => a.latitude - b.latitude || a.longitude - b.longitude);

    const { zones } = await loadZones();
    const data: SpatialCandidate[] = rows.map((r) => {
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      // Zona restriksi (makam, militer, istana) adalah aturan tata guna lahan di aplikasi
      const constraint = checkSpatialConstraint(lat, lng, zones);
      return {
        id: r.id,
        lat,
        lng,
        district: r.district_name,
        village: r.village_name ?? undefined,
        c1_dist_competitor: Number(r.c1_distance_competitor),
        c2_density: Number(r.c2_population_density),
        c3_dist_road: Number(r.c3_distance_road),
        c4_dist_crowd: Number(r.c4_distance_crowd),
        nearestCompetitorName: r.nearest_competitor ?? undefined,
        nearestRoadName: r.nearest_road ?? undefined,
        nearestCrowdName: r.nearest_crowd ?? undefined,
        isRestricted: constraint.isRestricted,
        restrictionReason: constraint.restrictionReason,
        landUseType: constraint.landUseType,
      };
    });
    gridCache = { at: Date.now(), data };
    return data;
  } catch (err) {
    console.warn('[spatial-db] grid dari Supabase tidak tersedia:', (err as Error).message);
    return null;
  }
}

/**
 * C1..C4 untuk satu titik survei, dihitung PostGIS (fungsi criteria_at_point, supabase/pipeline_point.sql).
 * null bila database / fungsi belum tersedia -> pemanggil memakai perhitungan cadangan di kode.
 */
export async function loadPointCriteriaFromDb(lat: number, lng: number): Promise<PointCriteria | null> {
  try {
    const client = getSupabaseAdmin();
    if (!isSupabaseConfigured || !client) return null;
    const { data, error } = await client.rpc('criteria_at_point', { p_lat: lat, p_lng: lng });
    if (error || !data || typeof data.inside !== 'boolean') {
      if (error) console.warn('[spatial-db] criteria_at_point tidak tersedia:', error.message);
      return null;
    }
    return data as PointCriteria;
  } catch (err) {
    console.warn('[spatial-db] criteria_at_point gagal:', (err as Error).message);
    return null;
  }
}
