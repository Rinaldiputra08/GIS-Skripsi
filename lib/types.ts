export type ViewMode = 'business' | 'academic';

export type CriterionId = 'c1' | 'c2' | 'c3' | 'c4';

export type CriterionType = 'benefit' | 'cost';

export interface CriterionInfo {
  id: CriterionId;
  code: string;
  name: string;
  shortName: string;
  type: CriterionType;
  unit: string;
  description: string;
  targetDescription: string;
}

export const CRITERIA_METADATA: Record<CriterionId, CriterionInfo> = {
  c1: {
    id: 'c1',
    code: 'C1',
    name: 'Jarak ke Kompetitor Terdekat',
    shortName: 'Jarak Kompetitor',
    type: 'benefit',
    unit: 'meter',
    description: 'Jarak Euclidean dari kandidat lokasi ke kedai kopi eksisting terdekat.',
    targetDescription: 'Semakin JAUH semakin baik (Celah pasar / Low competition).'
  },
  c2: {
    id: 'c2',
    code: 'C2',
    name: 'Kepadatan Penduduk',
    shortName: 'Kepadatan Penduduk',
    type: 'benefit',
    unit: 'jiwa/km²',
    description: 'Kepadatan penduduk kecamatan tempat kandidat lokasi berada (penduduk BPS ÷ luas poligon kecamatan). Data BPS hanya tersedia per kecamatan, sehingga seluruh grid dalam satu kecamatan bernilai sama.',
    targetDescription: 'Semakin PADAT semakin baik (Potensi pasar konsumen besar).'
  },
  c3: {
    id: 'c3',
    code: 'C3',
    name: 'Jarak ke Jaringan Jalan Utama',
    shortName: 'Akses Jalan',
    type: 'cost',
    unit: 'meter',
    description: 'Jarak terdekat ke ruas jalan arteri / kolektor utama Kota Bogor.',
    targetDescription: 'Semakin DEKAT semakin baik (Kemudahan aksesibilitas transportasi).'
  },
  c4: {
    id: 'c4',
    code: 'C4',
    name: 'Jarak ke Simpul Keramaian',
    shortName: 'Pusat Keramaian',
    type: 'cost',
    unit: 'meter',
    description: 'Jarak terdekat ke titik magnet aktivitas (Mall, Supermarket, Pasar, Terminal, Stasiun, Taman, Atraksi).',
    targetDescription: 'Semakin DEKAT semakin baik (Tingkat foot traffic / pengunjung tinggi).'
  }
};

export interface AhpMatrixPair {
  row: CriterionId;
  col: CriterionId;
  value: number; // 1 to 9 (or fractional reciprocal 1/2 to 1/9)
}

export interface AhpResult {
  weights: Record<CriterionId, number>;
  weightsArray: [number, number, number, number]; // [c1, c2, c3, c4]
  rawMatrix: number[][];
  normalizedMatrix: number[][];
  lambdaMax: number;
  ci: number; // Consistency Index
  cr: number; // Consistency Ratio
  isConsistent: boolean; // cr <= 0.1
  criteriaOrder: CriterionId[];
}

export type ExclusionZoneType = 'cemetery' | 'military_police' | 'palace_conservation' | 'water_body';

export interface ExclusionZone {
  id: string;
  name: string;
  type: ExclusionZoneType;
  typeLabel: string;
  description: string;
  center: [number, number]; // [lat, lng] titik pusat (lingkaran) atau titik di dalam poligon
  /** Zona lingkaran (dibuat admin): radius dalam meter. null/undefined = zona poligon */
  radiusMeters?: number | null;
  /** Zona poligon (OpenStreetMap): MultiPolygon -> poligon -> ring -> [lat, lng]. Ring pertama = batas luar, sisanya lubang */
  shape?: [number, number][][][];
  source?: 'osm' | 'manual' | string;
  osmRef?: string | null;
}

export interface SpatialCandidate {
  id: string;
  lat: number;
  lng: number;
  district: string;
  c1_dist_competitor: number; // in meters (Benefit)
  c2_density: number;         // people per km² (Benefit)
  c3_dist_road: number;        // in meters (Cost)
  c4_dist_crowd: number;       // in meters (Cost)
  nearestCompetitorName?: string;
  nearestRoadName?: string;
  nearestCrowdName?: string;
  isRestricted?: boolean;
  restrictionReason?: string;
  landUseType?: string;
}

export interface TopsisCandidateResult extends SpatialCandidate {
  r: [number, number, number, number]; // normalized vector
  y: [number, number, number, number]; // weighted normalized vector
  dPlus: number;  // Distance to positive ideal solution S+
  dMinus: number; // Distance to negative ideal solution S-
  score: number;  // Preference score Vi (0 to 1)
  rank: number;   // 1 to N
  category: 'high' | 'medium' | 'low';
}

export interface TopsisSummary {
  candidates: TopsisCandidateResult[];
  divisors: [number, number, number, number];
  weights: [number, number, number, number];
  idealPositive: [number, number, number, number];
  idealNegative: [number, number, number, number];
  /** Vi terendah di kelas tinggi & sedang (hasil klasifikasi kuantil), untuk legenda */
  tierCutoffs?: { high: number; medium: number };
  executionTimeMs: number;
}

export interface CompetitorPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  district: string;
  address?: string;
  category?: string;
  source?: 'kaggle' | 'osm' | string;
}

export interface DistrictGeo {
  id: string;
  name: string;
  population: number;
  areaKm2: number;
  density: number;
  color: string;
  center: [number, number];
  coordinates: [number, number][][]; // GeoJSON polygon format [lat, lng][]
}

export interface RoadSegment {
  id: string;
  name: string;
  type: 'arterial' | 'collector' | 'secondary';
  coordinates: [number, number][]; // [lat, lng][]
}

export interface CrowdCenterPoint {
  id: string;
  name: string;
  category: 'mall' | 'supermarket' | 'marketplace' | 'park' | 'attraction' | 'bus_station' | 'station' | 'shelter';
  lat: number;
  lng: number;
  district: string;
  description?: string;
}

export type RecommendationDisplayMode = 'radius' | 'point' | 'both';

export interface LayerToggleState {
  showDistricts: boolean;
  showCompetitors: boolean;
  showRoads: boolean;
  showCrowdCenters: boolean;
  showRecommendations: boolean;
  showHeatmap: boolean;
  showExclusionZones: boolean;
  recommendationDisplayMode: RecommendationDisplayMode;
  recommendationRadiusMeters: number;
}

export interface FilterState {
  district: string; // 'ALL' or district name
  minScore: number; // 0 to 1
  category: 'all' | 'high' | 'medium' | 'low';
  excludeRestricted: boolean; // Filter out cemeteries, police, military, etc.
}

/**
 * Kriteria sebuah titik survei (C1, C3, C4 beserta nama objek terdekat, kecamatan & kepadatan C2).
 * Dihitung oleh database (PostGIS, fungsi criteria_at_point) bila tersedia.
 */
export interface PointCriteria {
  inside: boolean;
  district?: string;
  density?: number;
  c1?: number; c1Name?: string;
  c3?: number; c3Name?: string;
  c4?: number; c4Name?: string;
}

export interface SurveyPointEvaluation {
  id: string;
  lat: number;
  lng: number;
  isInsideBogor: boolean;
  districtName: string | null;
  c1_dist_competitor: number; // meters (Benefit)
  c2_density: number;         // people per km² (Benefit)
  c3_dist_road: number;       // meters (Cost)
  c4_dist_crowd: number;      // meters (Cost)
  nearestCompetitorName: string;
  nearestRoadName: string;
  nearestCrowdName: string;
  isRestricted: boolean;
  restrictionReason?: string;
  landUseType: string;
  score: number;              // TOPSIS preference score Vi (0 to 1)
  dPlus: number;
  dMinus: number;
  category: 'high' | 'medium' | 'low' | 'restricted' | 'outside';
  rankEstimate: number;       // e.g. 15 out of 342
  totalCandidates: number;
  percentile: number;         // e.g. Top 8%
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    verdict: string;
    verdictType: 'recommended' | 'moderate' | 'not_recommended' | 'restricted' | 'invalid';
  };
  normalized: [number, number, number, number];
  weighted: [number, number, number, number];
  createdAt: string;
}

