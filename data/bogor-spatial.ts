import {
  CompetitorPoint,
  DistrictGeo,
  RoadSegment,
  CrowdCenterPoint,
  SpatialCandidate,
  ExclusionZone,
} from '../lib/types';
import districtsData from './generated/districts.json';
import competitorsData from './generated/competitors.json';
import roadsData from './generated/roads.json';
import crowdData from './generated/crowd.json';
import zonesData from './generated/zones.json';

// Data di bawah ini dibangun dari dataset penelitian oleh scripts/build-spatial-data.mjs
// (jalankan ulang skrip tersebut bila dataset berubah; jangan edit data/generated/ manual).

// ==========================================
// 1. BATAS 6 KECAMATAN KOTA BOGOR
// (Poligon administrasi + penduduk BPS Kota Bogor 2025, luas & kepadatan dihitung dari poligon)
// ==========================================

export const BOGOR_DISTRICTS = districtsData as DistrictGeo[];


// ==========================================
// 2. ZONA RESTRIKSI / LAHAN TERLARANG KOTA BOGOR
// Cadangan lokal dari tabel restricted_zones (poligon OpenStreetMap: pemakaman, militer/polisi,
// Istana & Kebun Raya, sempadan sungai, badan air). Ditulis oleh scripts/import-osm-zones.mjs.
// Sumber utama saat aplikasi berjalan tetap database (lib/spatial-db.ts -> loadZones).
// ==========================================

export const BOGOR_EXCLUSION_ZONES = zonesData as ExclusionZone[];

// ==========================================
// 3. DATA KOMPETITOR KEDAI KOPI EKSISTING
// (Dataset coffee shop Kota Bogor 2025 - dibersihkan & dipotong sesuai batas kota)
// ==========================================

export const BOGOR_COMPETITORS = competitorsData as CompetitorPoint[];

// ==========================================
// 4. DATA JARINGAN JALAN UTAMA KOTA BOGOR
// (OpenStreetMap: primary -> arterial, secondary -> collector, tertiary -> secondary)
// ==========================================

export const BOGOR_ROADS = roadsData as RoadSegment[];

// Kriteria C3 ("jarak ke jalan UTAMA") dihitung hanya terhadap jalan arteri (primary)
// dan kolektor (secondary). Jalan tersier ditampilkan di peta tetapi tidak dipakai di C3
// karena hampir menjangkau seluruh kota sehingga tidak membedakan lokasi.
const C3_ROAD_TYPES: ReadonlySet<RoadSegment['type']> = new Set(['arterial', 'collector']);

// ==========================================
// 5. DATA SIMPUL KERAMAIAN KOTA BOGOR
// (OpenStreetMap: mall, supermarket, pasar, taman, atraksi, terminal, stasiun)
// ==========================================

export const BOGOR_CROWD_CENTERS = crowdData as CrowdCenterPoint[];


// Helper to compute haversine distance in meters
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Ray-Casting algorithm: Test if a [lat, lng] coordinate is strictly inside a polygon [[lat, lng], ...]
export function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Exact Spatial Administrative Boundary Check:
// Returns the exact district object ONLY if the point is strictly inside its polygon
export function getStrictDistrictForPoint(lat: number, lng: number): { districtName: string; population: number; density: number } | null {
  for (const district of BOGOR_DISTRICTS) {
    for (const poly of district.coordinates) {
      if (isPointInPolygon(lat, lng, poly)) {
        return { districtName: district.name, population: district.population, density: district.density };
      }
    }
  }
  return null; // Point is outside Kota Bogor boundaries!
}

// Jarak titik ke polyline jalan (jarak tegak lurus ke SEGMEN, bukan hanya ke titik simpul,
// karena garis jalan sudah disederhanakan). Proyeksi lokal ekuirektangular cukup akurat
// untuk skala kota (< 0.1% galat).
const M_PER_DEG = 111320;

export function getDistanceToRoads(lat: number, lng: number): { distance: number; nearestRoad: string } {
  const kx = M_PER_DEG * Math.cos((lat * Math.PI) / 180);
  let minDistance = Infinity;
  let nearestRoad = '';

  for (const road of BOGOR_ROADS) {
    if (!C3_ROAD_TYPES.has(road.type)) continue;
    const pts = road.coordinates;
    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = (pts[i][1] - lng) * kx, y1 = (pts[i][0] - lat) * M_PER_DEG;
      const x2 = (pts[i + 1][1] - lng) * kx, y2 = (pts[i + 1][0] - lat) * M_PER_DEG;
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(x1 * dx + y1 * dy) / len2));
      const d = Math.hypot(x1 + t * dx, y1 + t * dy);
      if (d < minDistance) {
        minDistance = d;
        nearestRoad = road.name;
      }
    }
  }

  return { distance: Math.max(30, Math.round(minDistance)), nearestRoad };
}

// Nearest competitor
export function getNearestCompetitor(lat: number, lng: number): { distance: number; name: string } {
  let minDistance = Infinity;
  let name = '';

  for (const comp of BOGOR_COMPETITORS) {
    const d = getHaversineDistance(lat, lng, comp.lat, comp.lng);
    if (d < minDistance) {
      minDistance = d;
      name = comp.name;
    }
  }

  return { distance: Math.max(50, minDistance), name };
}

// Nearest crowd center
export function getNearestCrowd(lat: number, lng: number): { distance: number; name: string } {
  let minDistance = Infinity;
  let name = '';

  for (const crowd of BOGOR_CROWD_CENTERS) {
    const d = getHaversineDistance(lat, lng, crowd.lat, crowd.lng);
    if (d < minDistance) {
      minDistance = d;
      name = crowd.name;
    }
  }

  return { distance: Math.max(40, minDistance), name };
}

// Kotak pembatas tiap zona poligon (dihitung sekali per objek zona) untuk penyaringan cepat
const zoneBoxes = new WeakMap<ExclusionZone, [number, number, number, number]>();
function zoneBox(zone: ExclusionZone): [number, number, number, number] {
  let box = zoneBoxes.get(zone);
  if (!box) {
    box = [Infinity, -Infinity, Infinity, -Infinity];
    for (const poly of zone.shape ?? []) for (const [la, ln] of poly[0] ?? []) {
      box[0] = Math.min(box[0], la); box[1] = Math.max(box[1], la);
      box[2] = Math.min(box[2], ln); box[3] = Math.max(box[3], ln);
    }
    zoneBoxes.set(zone, box);
  }
  return box;
}

/** Titik di dalam zona: lingkaran (jarak <= radius) atau poligon (di dalam batas luar, bukan di lubang) */
export function isPointInZone(lat: number, lng: number, zone: ExclusionZone): boolean {
  if (zone.radiusMeters) {
    return getHaversineDistance(lat, lng, zone.center[0], zone.center[1]) <= zone.radiusMeters;
  }
  if (!zone.shape?.length) return false;
  const [la0, la1, ln0, ln1] = zoneBox(zone);
  if (lat < la0 || lat > la1 || lng < ln0 || lng > ln1) return false;
  return zone.shape.some(
    (poly) => poly.length > 0 && isPointInPolygon(lat, lng, poly[0]) && !poly.slice(1).some((hole) => isPointInPolygon(lat, lng, hole))
  );
}

// Spatial Constraint Masking: Check if a point falls within any Restricted Exclusion Zone
export function checkSpatialConstraint(lat: number, lng: number, zones: ExclusionZone[] = BOGOR_EXCLUSION_ZONES): {
  isRestricted: boolean;
  restrictionReason?: string;
  landUseType: string;
} {
  for (const zone of zones) {
    if (isPointInZone(lat, lng, zone)) {
      return {
        isRestricted: true,
        restrictionReason: `${zone.typeLabel}: ${zone.name}`,
        landUseType: `Zona Terlarang (${zone.typeLabel})`,
      };
    }
  }

  return {
    isRestricted: false,
    landUseType: 'Kawasan Komersial & Permukiman Layak Usaha',
  };
}

// ==========================================
// 6. SPATIAL GRID SAMPLING
// Kota Bogor dibagi menjadi sel persegi berukuran SERAGAM (dalam meter). Titik pusat tiap sel
// menjadi titik kandidat; hanya sel yang pusatnya berada di dalam poligon kecamatan yang dipakai.
// Ukuran sel tetap (ditentukan peneliti), tidak dapat diubah pengguna.
// ==========================================

/** Panjang sisi sel grid dalam meter (trade-off presisi vs beban komputasi) */
export const GRID_CELL_METERS = 300;

function generateCandidateGrid(): SpatialCandidate[] {
  const candidates: SpatialCandidate[] = [];

  // Bounding box diturunkan dari poligon kecamatan (bukan angka manual)
  let latMin = Infinity, latMax = -Infinity, lngMin = Infinity, lngMax = -Infinity;
  for (const d of BOGOR_DISTRICTS) {
    for (const ring of d.coordinates) {
      for (const [la, ln] of ring) {
        latMin = Math.min(latMin, la); latMax = Math.max(latMax, la);
        lngMin = Math.min(lngMin, ln); lngMax = Math.max(lngMax, ln);
      }
    }
  }

  // Konversi meter -> derajat; lebar sel dalam derajat bujur disesuaikan dengan lintang kota
  const latMid = (latMin + latMax) / 2;
  const dLat = GRID_CELL_METERS / M_PER_DEG;
  const dLng = GRID_CELL_METERS / (M_PER_DEG * Math.cos((latMid * Math.PI) / 180));

  let counter = 1;
  // +dLat/2 : titik pusat sel, bukan sudut sel
  for (let lat = latMin + dLat / 2; lat < latMax; lat += dLat) {
    for (let lng = lngMin + dLng / 2; lng < lngMax; lng += dLng) {
      const la = Math.round(lat * 1e6) / 1e6;
      const ln = Math.round(lng * 1e6) / 1e6;

      // Clipping: buang sel yang pusatnya di luar batas Kota Bogor
      const districtInfo = getStrictDistrictForPoint(la, ln);
      if (!districtInfo) continue;

      const competitor = getNearestCompetitor(la, ln);
      const road = getDistanceToRoads(la, ln);
      const crowd = getNearestCrowd(la, ln);
      const constraint = checkSpatialConstraint(la, ln);

      candidates.push({
        id: `grid_${counter}`,
        lat: la,
        lng: ln,
        district: districtInfo.districtName,
        c1_dist_competitor: competitor.distance,
        c2_density: districtInfo.density,
        c3_dist_road: road.distance,
        c4_dist_crowd: crowd.distance,
        nearestCompetitorName: competitor.name,
        nearestRoadName: road.nearestRoad,
        nearestCrowdName: crowd.name,
        isRestricted: constraint.isRestricted,
        restrictionReason: constraint.restrictionReason,
        landUseType: constraint.landUseType,
      });

      counter++;
    }
  }

  return candidates;
}

export const BOGOR_GRID_CANDIDATES: SpatialCandidate[] = generateCandidateGrid();
