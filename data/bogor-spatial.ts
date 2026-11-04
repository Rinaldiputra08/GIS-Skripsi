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

// Data di bawah ini dibangun dari dataset penelitian oleh scripts/build-spatial-data.mjs
// (jalankan ulang skrip tersebut bila dataset berubah; jangan edit data/generated/ manual).

// ==========================================
// 1. BATAS 6 KECAMATAN KOTA BOGOR
// (Poligon administrasi + penduduk BPS Kota Bogor 2025, luas & kepadatan dihitung dari poligon)
// ==========================================

export const BOGOR_DISTRICTS = districtsData as DistrictGeo[];


// ==========================================
// 2. ZONA RESTRIKSI / LAHAN TERLARANG KOTA BOGOR
// (TPU / Kuburan, Kantor Polisi, Markas Militer,
//  Istana Kepresidenan, Cagar Alam, Sempadan Sungai)
// ==========================================

export const BOGOR_EXCLUSION_ZONES: ExclusionZone[] = [
  // TPU / Kuburan (Cemeteries)
  {
    id: 'ex_tpu_blender',
    name: 'TPU Blender (Kebon Pedes)',
    type: 'cemetery',
    typeLabel: 'Pemakaman Umum (TPU)',
    description: 'Kompleks Tempat Pemakaman Umum Blender - Zona Terlarang Non-Komersial',
    center: [-6.5615, 106.7865],
    radiusMeters: 320,
  },
  {
    id: 'ex_tpu_dreded',
    name: 'TPU Dreded & Makam Pahlawan',
    type: 'cemetery',
    typeLabel: 'Pemakaman Umum (TPU)',
    description: 'Kawasan TPU Dreded dan Taman Makam Pahlawan - Zona Sakral Non-Usaha',
    center: [-6.6185, 106.8012],
    radiusMeters: 300,
  },
  {
    id: 'ex_tpu_gunung_gadung',
    name: 'TPU Gunung Gadung Cipaku',
    type: 'cemetery',
    typeLabel: 'Pemakaman Umum (TPU)',
    description: 'Kompleks Pemakaman Tionghoa Gunung Gadung seluas puluhan hektar',
    center: [-6.6435, 106.8195],
    radiusMeters: 480,
  },
  {
    id: 'ex_tpu_kayumanis',
    name: 'TPU Kayumanis',
    type: 'cemetery',
    typeLabel: 'Pemakaman Umum (TPU)',
    description: 'Lahan Tempat Pemakaman Umum Kayumanis Tanah Sareal',
    center: [-6.5325, 106.7645],
    radiusMeters: 280,
  },

  // Kantor Kepolisian & Markas Militer
  {
    id: 'ex_polresta_bogor',
    name: 'Mako Polresta Bogor Kota',
    type: 'military_police',
    typeLabel: 'Instansi Keamanan / Polisi',
    description: 'Markas Komando Kepolisian Resor Kota Bogor - Kawasan Otoritas Terbatas',
    center: [-6.5938, 106.7885],
    radiusMeters: 220,
  },
  {
    id: 'ex_korem_suryakancana',
    name: 'Korem 061/Suryakancana & Kodim 0606',
    type: 'military_police',
    typeLabel: 'Markas Militer / TNI',
    description: 'Komando Resor Militer dan Distrik Militer - Zona Pertahanan Terbatas',
    center: [-6.5895, 106.7852],
    radiusMeters: 220,
  },
  {
    id: 'ex_pusdikzi_tni',
    name: 'Pusdikzi TNI-AD Sudirman',
    type: 'military_police',
    typeLabel: 'Pusat Pendidikan Militer TNI',
    description: 'Pusat Pendidikan Zeni Angkatan Darat - Kompleks Militer Tertutup',
    center: [-6.5845, 106.7942],
    radiusMeters: 260,
  },
  {
    id: 'ex_brimob_sukasari',
    name: 'Mako Brimob & Satlantas Sukasari',
    type: 'military_police',
    typeLabel: 'Instansi Kepolisian Khusus',
    description: 'Kawasan Asrama dan Kantor Kepolisian Tertutup',
    center: [-6.6192, 106.8135],
    radiusMeters: 200,
  },

  // Kawasan Khusus / Istana Kepresidenan
  {
    id: 'ex_istana_bogor',
    name: 'Istana Kepresidenan Bogor (Ring 1)',
    type: 'palace_conservation',
    typeLabel: 'Kawasan Khusus Kenegaraan (Ring 1)',
    description: 'Zona Otoritas Khusus Istana Kepresidenan RI - Dilarang Bangunan Komersial',
    center: [-6.5945, 106.7972],
    radiusMeters: 380,
  },

  // Sempadan Sungai Rawan Banjir
  {
    id: 'ex_sungai_ciliwung',
    name: 'Sempadan Rawan Sungai Ciliwung',
    type: 'water_body',
    typeLabel: 'Sempadan Aliran Sungai',
    description: 'Bantaran Sungai Ciliwung - Zona Hijau Perlindungan Air & Bebas Bangunan',
    center: [-6.6065, 106.8045],
    radiusMeters: 180,
  },
];

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

// Spatial Constraint Masking: Check if a point falls within any Restricted Exclusion Zone
export function checkSpatialConstraint(lat: number, lng: number, zones: ExclusionZone[] = BOGOR_EXCLUSION_ZONES): {
  isRestricted: boolean;
  restrictionReason?: string;
  landUseType: string;
} {
  for (const zone of zones) {
    const dist = getHaversineDistance(lat, lng, zone.center[0], zone.center[1]);
    if (dist <= zone.radiusMeters) {
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
