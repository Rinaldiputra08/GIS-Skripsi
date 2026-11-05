import {
  ExclusionZone,
  PointCriteria,
  SpatialCandidate,
  SurveyPointEvaluation,
  TopsisCandidateResult,
} from './types';
import {
  BOGOR_GRID_CANDIDATES,
  BOGOR_EXCLUSION_ZONES,
  getStrictDistrictForPoint,
  checkSpatialConstraint,
  getNearestCompetitor,
  getDistanceToRoads,
  getNearestCrowd,
  getHaversineDistance,
} from '@/data/bogor-spatial';
import { calculateTopsis } from './topsis';
import { getSettings } from './settings';

/**
 * Evaluates a custom survey point (from GPS or Map Pin-Drop)
 * using the full AHP-weighted TOPSIS multi-criteria framework
 * and generates a comprehensive spatial feasibility & SWOT report.
 *
 * `criteria` (opsional) = C1..C4 yang sudah dihitung database (PostGIS). Bila tidak diberikan,
 * kriteria dihitung dengan data cadangan lokal (haversine) agar aplikasi tetap berfungsi offline.
 */
export function evaluateSurveyLocation(
  lat: number,
  lng: number,
  weights: [number, number, number, number] = [0.25, 0.25, 0.25, 0.25],
  baselineCandidates: SpatialCandidate[] = BOGOR_GRID_CANDIDATES,
  criteria?: PointCriteria | null,
  zones: ExclusionZone[] = BOGOR_EXCLUSION_ZONES
): SurveyPointEvaluation {
  const timestamp = new Date().toISOString();
  const id = `survey_${Date.now()}`;

  // 1. Batas administratif: dari database bila tersedia, jika tidak Ray-Casting pada poligon lokal
  const localDistrict = getStrictDistrictForPoint(lat, lng);
  const districtInfo: { districtName: string; density: number } | null = criteria
    ? criteria.inside
      ? { districtName: criteria.district as string, density: criteria.density as number }
      : null
    : localDistrict;
  const isInsideBogor = districtInfo !== null;

  // 2. Spatial Constraint Check (Cemeteries, Police, Military, Ring 1 Palace)
  const constraint = checkSpatialConstraint(lat, lng, zones);

  // If outside Kota Bogor, return graceful boundary report
  if (!isInsideBogor) {
    return {
      id,
      lat,
      lng,
      isInsideBogor: false,
      districtName: null,
      c1_dist_competitor: 0,
      c2_density: 0,
      c3_dist_road: 0,
      c4_dist_crowd: 0,
      nearestCompetitorName: '-',
      nearestRoadName: '-',
      nearestCrowdName: '-',
      isRestricted: false,
      restrictionReason: 'Di luar batas 6 Kecamatan Kota Bogor',
      landUseType: 'Wilayah Administratif Luar (Kabupaten Bogor)',
      score: 0,
      dPlus: 1,
      dMinus: 0,
      category: 'outside',
      rankEstimate: baselineCandidates.length + 1,
      totalCandidates: baselineCandidates.length + 1,
      percentile: 0,
      swot: {
        strengths: [],
        weaknesses: [
          'Titik koordinat berada di luar wilayah administratif 6 Kecamatan Kota Bogor (Masuk Kabupaten Bogor).',
          'Data demografi dan perizinan Kota Bogor tidak berlaku pada titik ini.',
        ],
        opportunities: [],
        threats: [
          'Perbedaan regulasi perizinan usaha dan pajak daerah antara Kota dan Kabupaten Bogor.',
        ],
        verdict:
          'Lokasi berada di luar cakupan studi Kota Bogor. Mohon pilih titik di dalam 6 Kecamatan Kota Bogor.',
        verdictType: 'invalid',
      },
      normalized: [0, 0, 0, 0],
      weighted: [0, 0, 0, 0],
      createdAt: timestamp,
    };
  }

  // 3. Extract Spatial Attribute Criteria (Haversine distances in meters & Population)
  const competitor =
    criteria && criteria.inside
      ? { distance: criteria.c1 as number, name: criteria.c1Name ?? '-' }
      : getNearestCompetitor(lat, lng);
  const road =
    criteria && criteria.inside
      ? { distance: criteria.c3 as number, nearestRoad: criteria.c3Name ?? '-' }
      : getDistanceToRoads(lat, lng);
  const crowd =
    criteria && criteria.inside
      ? { distance: criteria.c4 as number, name: criteria.c4Name ?? '-' }
      : getNearestCrowd(lat, lng);

  const customCandidate: SpatialCandidate = {
    id,
    lat,
    lng,
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
  };

  // 4. TOPSIS gabungan: titik survei + titik grid yang layak (titik grid terlarang disaring di
  //    calculateTopsis). Titik survei selalu ikut dihitung agar skornya tetap informatif; bila ia di
  //    zona terlarang, kategorinya tetap "terlarang" (lihat di bawah).
  const combinedCandidates: SpatialCandidate[] = [{ ...customCandidate, isRestricted: false }, ...baselineCandidates];
  const topsisSummary = calculateTopsis(combinedCandidates, weights);

  // Find our custom candidate in the ranked TOPSIS results
  const rankedCandidate = topsisSummary.candidates.find((c) => c.id === id) || topsisSummary.candidates[0];

  const totalValid = topsisSummary.candidates.filter((c) => c.rank > 0).length;
  const rank = rankedCandidate.rank;
  // "Top X%": posisi titik di antara seluruh titik layak (peringkat 1 = 1% teratas)
  const percentile = Math.max(1, Math.ceil((rank / totalValid) * 100));

  // Determine category
  let category: 'high' | 'medium' | 'low' | 'restricted' | 'outside' = rankedCandidate.category;
  if (constraint.isRestricted) {
    category = 'restricted';
  }

  // 5. Build Comprehensive SWOT Analysis & Expert Advice
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];
  let verdictType: 'recommended' | 'moderate' | 'not_recommended' | 'restricted' | 'invalid' = 'moderate';
  let verdictText = '';

  // Constraint Check
  if (constraint.isRestricted) {
    verdictType = 'restricted';
    weaknesses.push(`Terletak di ${constraint.restrictionReason} (Zona Terlarang Usaha Komersial).`);
    threats.push('Risiko penertiban Satpol PP / Pelanggaran RTRW Kota Bogor.');
    verdictText = `TIDAK LAYAK USAHA: Titik ini berada di ${constraint.restrictionReason}. Dilarang mendirikan kedai kopi di zona ini.`;
  } else {
    // --- STRENGTHS ---
    if (road.distance <= 60) {
      strengths.push(
        `Akses Sangat Baik: Hanya ${road.distance} m dari ${road.nearestRoad} (mudah terlihat dari jalan utama).`
      );
    } else if (road.distance <= 150) {
      strengths.push(`Akses Transportasi Baik: Berjarak ${road.distance} m dari ${road.nearestRoad}.`);
    }

    if (crowd.distance <= 250) {
      strengths.push(
        `Dekat Pusat Keramaian: ${crowd.distance} m dari ${crowd.name}, berpotensi mendapat arus pengunjung (foot traffic) harian.`
      );
    } else if (crowd.distance <= 500) {
      strengths.push(`Dekat Simpul Aktivitas: ${crowd.distance} m dari ${crowd.name}.`);
    }

    if (competitor.distance >= 400) {
      strengths.push(
        `Persaingan Langsung Rendah: Berjarak ${competitor.distance} m dari kedai kopi terdekat yang tercatat (${competitor.name}).`
      );
    }
    if (competitor.distance >= 1500 && crowd.distance > 700) {
      weaknesses.push(
        'Jauh dari kedai kopi lain sekaligus dari pusat keramaian: bisa berarti pasar belum terbentuk. Cek langsung kondisi lapangan, karena data kompetitor (Kaggle + OpenStreetMap) mungkin belum lengkap di area ini.'
      );
    }

    if (districtInfo.density >= getSettings().denseThreshold) {
      strengths.push(
        `Potensi Pasar Besar: Kecamatan ${districtInfo.districtName} memiliki kepadatan penduduk tinggi (${districtInfo.density.toLocaleString('id-ID')} jiwa/km²).`
      );
    }

    // --- WEAKNESSES ---
    if (competitor.distance < 120) {
      weaknesses.push(
        `Persaingan Sangat Ketat: Hanya berjarak ${competitor.distance} m dari kedai kopi eksisting (${competitor.name}).`
      );
    }

    if (road.distance > 250) {
      weaknesses.push(
        `Akses Masuk Dalam: Jarak ke jalan utama ${road.distance} m, membutuhkan petunjuk arah & promosi digital aktif.`
      );
    }

    if (crowd.distance > 700) {
      weaknesses.push(
        `Jauh dari Titik Keramaian Utama: Berjarak ${crowd.distance} m ke ${crowd.name}.`
      );
    }

    // --- OPPORTUNITIES ---
    if (road.distance <= 100 && crowd.distance <= 400) {
      opportunities.push(
        'Peluang konsep Grab-and-Go & Dine-in estetik untuk mahasiswa/pekerja kantoran yang melintas.'
      );
    } else {
      opportunities.push(
        'Peluang konsep Neighborhood Hidden Gem Cafe untuk warga permukiman sekitar.'
      );
    }
    opportunities.push(
      'Integrasi layanan pesan-antar online (GoFood/GrabFood/ShopeeFood) dengan jangkauan pengiriman prima.'
    );

    // --- THREATS ---
    if (competitor.distance < 250) {
      threats.push(
        `Perang harga atau promo diskon dari kompetitor terdekat (${competitor.name}).`
      );
    }
    threats.push(
      'Potensi kemunculan kedai kopi baru di koridor jalan yang sama dalam 6-12 bulan ke depan.'
    );

    // --- VERDICT ---
    // Skor TOPSIS bersifat RELATIF: dibandingkan dengan seluruh titik grid layak di Kota Bogor
    // menurut bobot kriteria yang dipilih, bukan jaminan kelayakan usaha.
    const scoreText = `Skor Vi ${rankedCandidate.score.toFixed(3)}, peringkat #${rank} dari ${totalValid} titik (${percentile}% teratas)`;
    if (rankedCandidate.category === 'high') {
      verdictType = 'recommended';
      verdictText = `POTENSI TINGGI (${scoreText}): Dibanding titik lain di Kota Bogor, lokasi ini unggul pada kombinasi kriteria yang Anda prioritaskan. Tetap lakukan survei lapangan (ketersediaan lahan, harga sewa, perizinan).`;
    } else if (rankedCandidate.category === 'medium') {
      verdictType = 'moderate';
      verdictText = `POTENSI SEDANG (${scoreText}): Lokasi cukup bersaing. Perhatikan kelemahan di atas dan pertimbangkan diferensiasi konsep atau promosi digital.`;
    } else {
      verdictType = 'not_recommended';
      verdictText = `POTENSI RENDAH (${scoreText}): Dibanding titik lain, lokasi ini tertinggal pada kriteria yang Anda prioritaskan (persaingan, akses jalan, atau kedekatan keramaian).`;
    }
  }

  return {
    id,
    lat,
    lng,
    isInsideBogor: true,
    districtName: districtInfo.districtName,
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
    score: rankedCandidate.score,
    dPlus: rankedCandidate.dPlus,
    dMinus: rankedCandidate.dMinus,
    category,
    rankEstimate: rank,
    totalCandidates: totalValid,
    percentile,
    swot: {
      strengths,
      weaknesses,
      opportunities,
      threats,
      verdict: verdictText,
      verdictType,
    },
    normalized: rankedCandidate.r,
    weighted: rankedCandidate.y,
    createdAt: timestamp,
  };
}
