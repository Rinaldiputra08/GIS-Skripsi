'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Compass,
  Building2,
  Navigation,
  Sparkles,
  Copy,
  Check,
  Award,
  BarChart3,
  Star,
} from 'lucide-react';
import { SurveyPointEvaluation } from '@/lib/types';
import { getSettings } from '@/lib/settings';
import {
  formatBusinessScore,
  getStarRating,
} from '@/lib/business-logic';

interface SurveyLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: SurveyPointEvaluation | null;
  onFocusMap?: (lat: number, lng: number) => void;
  onNewSurvey?: () => void;
}

export const SurveyLocationModal: React.FC<SurveyLocationModalProps> = ({
  isOpen,
  onClose,
  survey,
  onFocusMap,
  onNewSurvey,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'swot' | 'matrix'>('summary');

  if (!isOpen || !survey) return null;

  const businessScore = formatBusinessScore(survey.score);
  const starCount = getStarRating(survey.score);

  const getBadgeStyle = () => {
    switch (survey.swot.verdictType) {
      case 'recommended':
        return {
          bg: 'bg-good-bg border-good/30 text-good',
          badgeText: 'Potensi tinggi',
          barColor: 'bg-good',
          textColor: 'text-good',
        };
      case 'moderate':
        return {
          bg: 'bg-mid-bg border-mid/30 text-mid',
          badgeText: 'Potensi sedang',
          barColor: 'bg-mid',
          textColor: 'text-mid',
        };
      case 'not_recommended':
        return {
          bg: 'bg-bad-bg border-bad/30 text-bad',
          badgeText: 'Potensi rendah',
          barColor: 'bg-bad',
          textColor: 'text-bad',
        };
      case 'restricted':
        return {
          bg: 'bg-bad-bg border-bad/30 text-bad',
          badgeText: 'Tidak layak (zona terlarang)',
          barColor: 'bg-bad',
          textColor: 'text-bad',
        };
      default:
        return {
          bg: 'bg-oat-2 border-line-2 text-ink-2',
          badgeText: 'Di luar wilayah Kota Bogor',
          barColor: 'bg-line-2',
          textColor: 'text-ink-3',
        };
    }
  };

  const badge = getBadgeStyle();

  const handleCopyReport = () => {
    const reportText = `
=== LAPORAN EVALUASI KELAYAKAN LOKASI KEDAI KOPI ===
Koordinat: ${survey.lat.toFixed(5)}, ${survey.lng.toFixed(5)}
Kecamatan: ${survey.districtName || 'Luar Wilayah Kota'}
Skor Potensi (relatif): ${businessScore}/100 (${badge.badgeText})
Nilai Preferensi TOPSIS (Vi): ${survey.score.toFixed(4)}
Peringkat Estimasi: #${survey.rankEstimate} dari ${survey.totalCandidates} titik (Top ${survey.percentile}%)

1. Jarak Kompetitor Terdekat: ${survey.c1_dist_competitor} m (${survey.nearestCompetitorName})
2. Kepadatan Penduduk: ${survey.c2_density.toLocaleString('id-ID')} jiwa/km² (${survey.villageName ? `Kel. ${survey.villageName}, Kec. ${survey.districtName}` : survey.districtName})
3. Akses Jalan Utama: ${survey.c3_dist_road} m (${survey.nearestRoadName})
4. Simpul Keramaian: ${survey.c4_dist_crowd} m (${survey.nearestCrowdName})
5. Status Peruntukan Lahan: ${survey.landUseType}

KESIMPULAN & SARAN AKSI:
${survey.swot.verdict}
===================================================
`;
    navigator.clipboard.writeText(reportText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-3 sm:p-6 bg-espresso/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92dvh] flex flex-col bg-paper border border-line rounded-[28px] shadow-float overflow-hidden text-ink font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-oat">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-espresso flex items-center justify-center">
              <Compass className="w-5 h-5 text-lime" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                Laporan Kelayakan Bisnis Lokasi
              </h2>
              <p className="text-xs text-ink-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-good" />
                <span className="font-mono text-[11px] text-ink-2">
                  {survey.lat.toFixed(5)}, {survey.lng.toFixed(5)}
                </span>
                <span>•</span>
                <span className="text-good font-medium">
                  {survey.districtName ? `Kecamatan ${survey.districtName}` : 'Luar Wilayah Kota'}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-oat-2 hover:bg-line text-ink-3 hover:text-ink flex items-center justify-center transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Hero Card: Status & Score */}
          <div className="p-4 rounded-xl bg-oat border border-line relative overflow-hidden space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide ${badge.bg}`}>
                {badge.badgeText}
              </div>

              {survey.isInsideBogor && !survey.isRestricted && (
                <div className="flex items-center gap-1 text-xs text-ink-3 font-medium">
                  <Award className="w-3.5 h-3.5 text-mid" />
                  <span>Peringkat:</span>
                  <strong className="text-ink font-bold">#{survey.rankEstimate}</strong>
                  <span className="text-ink-3">/ {survey.totalCandidates}</span>
                  <span className="text-good font-semibold ml-1">(Top {survey.percentile}%)</span>
                </div>
              )}
            </div>

            {/* Score Display (Unified: 0-100 Score, Stars & Vi reference) */}
            {survey.isInsideBogor && (
              <div className="space-y-1.5 pt-1">
                <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-2 text-xs">
                  <span className="text-ink-3 font-medium flex items-center gap-1.5">
                    Skor potensi (relatif terhadap titik lain):
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex text-mid">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < starCount ? 'fill-mid text-mid' : 'text-ink-3'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xl font-black font-mono text-good whitespace-nowrap">
                      {businessScore}
                      <span className="text-xs text-ink-3 font-normal"> / 100</span>
                    </span>
                    <span className="whitespace-nowrap text-xs font-mono text-ink-3 bg-oat-2 px-1.5 py-0.5 rounded border border-line-2">
                      V<sub>i</sub>: {survey.score.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 rounded-full bg-oat-2 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full ${badge.barColor} transition-all duration-700`}
                    style={{ width: `${Math.min(100, Math.max(5, survey.score * 100))}%` }}
                  />
                </div>
              </div>
            )}



            {/* Verdict summary paragraph */}
            <p className="text-xs text-ink-2 leading-relaxed pt-1 bg-paper p-2.5 rounded-lg border border-line">
              {survey.swot.verdict}
            </p>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex border-b border-line text-xs font-semibold">
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'summary'
                  ? 'border-good/30 text-good'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>4 Faktor Strategis</span>
            </button>

            <button
              onClick={() => setActiveTab('swot')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'swot'
                  ? 'border-good/30 text-good'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-mid" />
              <span>Analisis SWOT &amp; Peluang</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'matrix'
                  ? 'border-good/30 text-good'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-info" />
              <span>Audit Matematis</span>
            </button>
          </div>

          {/* TAB 1: 4 Factors / Criteria */}
          {activeTab === 'summary' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* C1: Competitor Distance */}
                <div className="p-3 rounded-xl bg-oat border border-line space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-mid flex items-center gap-1">
                      Faktor Persaingan Kafe
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-mid-bg text-mid font-mono">
                      {survey.c1_dist_competitor >= 400 ? 'Persaingan Rendah' : 'Persaingan Ketat'}
                    </span>
                  </div>
                  <div className="text-base font-bold text-ink">
                    {survey.c1_dist_competitor} <span className="text-xs text-ink-3 font-normal">meter</span>
                  </div>
                  <div className="text-[11px] text-ink-3 truncate" title={survey.nearestCompetitorName}>
                    Kafe Terdekat: <strong className="text-ink">{survey.nearestCompetitorName}</strong>
                  </div>
                  <p className="text-[10px] text-ink-3">
                    {survey.c1_dist_competitor >= 400
                      ? 'Persaingan langsung relatif rendah'
                      : 'Berdekatan dengan kompetitor eksisting'}
                  </p>
                </div>

                {/* C2: Population */}
                <div className="p-3 rounded-xl bg-oat border border-line space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-info flex items-center gap-1">
                      Faktor Potensi Pasar
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-info-bg text-info font-mono">
                      Kepadatan Wilayah
                    </span>
                  </div>
                  <div className="text-base font-bold text-ink">
                    {survey.c2_density.toLocaleString('id-ID')}{' '}
                    <span className="text-xs text-ink-3 font-normal">jiwa/km²</span>
                  </div>
                  <div className="text-[11px] text-ink-3 truncate">
                    Wilayah: <strong className="text-ink">{survey.villageName ? `Kel. ${survey.villageName}, ` : ''}{survey.districtName || '-'}</strong>
                  </div>
                  <p className="text-[10px] text-ink-3">
                    {survey.c2_density >= getSettings().denseThreshold
                      ? `${survey.villageName ? 'Kelurahan' : 'Kecamatan'} padat (nilai rata-rata satu ${survey.villageName ? 'kelurahan' : 'kecamatan'})`
                      : `Kepadatan sedang (nilai rata-rata satu ${survey.villageName ? 'kelurahan' : 'kecamatan'})`}
                  </p>
                </div>

                {/* C3: Road Distance */}
                <div className="p-3 rounded-xl bg-oat border border-line space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-info flex items-center gap-1">
                      Akses transportasi
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-info-bg text-info font-mono">
                      Akses Jalan
                    </span>
                  </div>
                  <div className="text-base font-bold text-ink">
                    {survey.c3_dist_road} <span className="text-xs text-ink-3 font-normal">meter</span>
                  </div>
                  <div className="text-[11px] text-ink-3 truncate" title={survey.nearestRoadName}>
                    Ruas Jalan: <strong className="text-ink">{survey.nearestRoadName}</strong>
                  </div>
                  <p className="text-[10px] text-ink-3">
                    {survey.c3_dist_road <= 60
                      ? 'Sangat mudah dijangkau kendaraan & pejalan kaki'
                      : survey.c3_dist_road <= 250
                        ? 'Cukup dekat dari jalan utama'
                        : 'Masuk ke jalan lingkungan, jauh dari jalan utama'}
                  </p>
                </div>

                {/* C4: Crowd Center Distance */}
                <div className="p-3 rounded-xl bg-oat border border-line space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-info flex items-center gap-1">
                      Arus pengunjung
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-info-bg text-info font-mono">
                      Pusat Keramaian
                    </span>
                  </div>
                  <div className="text-base font-bold text-ink">
                    {survey.c4_dist_crowd} <span className="text-xs text-ink-3 font-normal">meter</span>
                  </div>
                  <div className="text-[11px] text-ink-3 truncate" title={survey.nearestCrowdName}>
                    Simpul Magnet: <strong className="text-ink">{survey.nearestCrowdName}</strong>
                  </div>
                  <p className="text-[10px] text-ink-3">
                    {survey.c4_dist_crowd <= 250
                      ? 'Berpotensi mendapat arus pengunjung harian'
                      : 'Jarak menengah ke pusat aktivitas'}
                  </p>
                </div>
              </div>

              {/* Land-use Status */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  survey.isRestricted
                    ? 'bg-bad-bg border-bad/30 text-bad'
                    : 'bg-oat border-line text-ink-2'
                }`}
              >
                {survey.isRestricted ? (
                  <ShieldAlert className="w-5 h-5 text-bad shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-good shrink-0" />
                )}
                <div>
                  <strong className="block text-ink font-semibold">
                    Status Kelayakan Peruntukan Lahan:
                  </strong>
                  <span>{survey.landUseType}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SWOT Analysis */}
          {activeTab === 'swot' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Strengths */}
                <div className="p-3 rounded-xl bg-good-bg border border-good/30 space-y-2">
                  <h4 className="font-bold text-good flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Keunggulan Lokasi (Strengths)
                  </h4>
                  {survey.swot.strengths.length > 0 ? (
                    <ul className="space-y-1.5 text-ink-2 list-disc list-inside">
                      {survey.swot.strengths.map((s, idx) => (
                        <li key={idx} className="leading-snug">
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-ink-3 italic">Tidak ada keunggulan dominan yang signifikan.</p>
                  )}
                </div>

                {/* Weaknesses */}
                <div className="p-3 rounded-xl bg-bad-bg border border-bad/30 space-y-2">
                  <h4 className="font-bold text-bad flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Tantangan Lokasi (Weaknesses)
                  </h4>
                  {survey.swot.weaknesses.length > 0 ? (
                    <ul className="space-y-1.5 text-ink-2 list-disc list-inside">
                      {survey.swot.weaknesses.map((w, idx) => (
                        <li key={idx} className="leading-snug">
                          {w}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-ink-3 italic">Tidak ditemukan kelemahan spasial mayor.</p>
                  )}
                </div>

                {/* Opportunities */}
                <div className="p-3 rounded-xl bg-info-bg border border-info/30 space-y-2">
                  <h4 className="font-bold text-info flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Peluang Bisnis (Opportunities)
                  </h4>
                  <ul className="space-y-1.5 text-ink-2 list-disc list-inside">
                    {survey.swot.opportunities.map((o, idx) => (
                      <li key={idx} className="leading-snug">
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Threats */}
                <div className="p-3 rounded-xl bg-mid-bg border border-mid/30 space-y-2">
                  <h4 className="font-bold text-mid flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" /> Risiko Pasar (Threats)
                  </h4>
                  <ul className="space-y-1.5 text-ink-2 list-disc list-inside">
                    {survey.swot.threats.map((t, idx) => (
                      <li key={idx} className="leading-snug">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Mathematical & TOPSIS Breakdown */}
          {activeTab === 'matrix' && (
            <div className="space-y-3 text-xs animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-oat border border-line space-y-2">
                <h4 className="font-bold text-ink flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-info" />
                  <span>Vektor Normalisasi (r_ij) &amp; Terbobot (y_ij) Titik Survei</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded bg-paper border border-line text-center">
                    <span className="text-[10px] text-ink-3 block font-mono">r_C1 (Kompetitor)</span>
                    <strong className="text-mid font-mono text-xs">{survey.normalized[0]?.toFixed(4)}</strong>
                  </div>
                  <div className="p-2 rounded bg-paper border border-line text-center">
                    <span className="text-[10px] text-ink-3 block font-mono">r_C2 (Kepadatan)</span>
                    <strong className="text-info font-mono text-xs">{survey.normalized[1]?.toFixed(4)}</strong>
                  </div>
                  <div className="p-2 rounded bg-paper border border-line text-center">
                    <span className="text-[10px] text-ink-3 block font-mono">r_C3 (Jalan)</span>
                    <strong className="text-info font-mono text-xs">{survey.normalized[2]?.toFixed(4)}</strong>
                  </div>
                  <div className="p-2 rounded bg-paper border border-line text-center">
                    <span className="text-[10px] text-ink-3 block font-mono">r_C4 (Keramaian)</span>
                    <strong className="text-info font-mono text-xs">{survey.normalized[3]?.toFixed(4)}</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-oat border border-line space-y-2">
                <h4 className="font-bold text-ink">Jarak Solusi Ideal Euclidean (TOPSIS)</h4>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded bg-good-bg border border-good/30">
                    <span className="text-[10px] text-good block">Jarak ke Solusi Ideal Positif ($S^+$)</span>
                    <strong className="text-ink font-mono text-xs">{survey.dPlus?.toFixed(4)}</strong>
                  </div>
                  <div className="p-2 rounded bg-bad-bg border border-bad/30">
                    <span className="text-[10px] text-bad block">Jarak ke Solusi Ideal Negatif ($S^-$)</span>
                    <strong className="text-ink font-mono text-xs">{survey.dMinus?.toFixed(4)}</strong>
                  </div>
                </div>
                <p className="text-[11px] text-ink-3 pt-1 font-mono">
                  {`Formula: Vi = S- / (S+ + S-) = ${survey.dMinus?.toFixed(4)} / (${survey.dPlus?.toFixed(4)} + ${survey.dMinus?.toFixed(4)}) = `}
                  <strong className="text-good">{survey.score.toFixed(4)}</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-line bg-oat text-xs">
          <div className="flex items-center gap-2">
            {onFocusMap && survey.isInsideBogor && (
              <button
                onClick={() => {
                  onFocusMap(survey.lat, survey.lng);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-espresso hover:bg-espresso text-white font-semibold transition-all shadow-md cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Fokus di Peta</span>
              </button>
            )}

            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-oat-2 hover:bg-line text-ink font-medium border border-line-2 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-good" />
                  <span className="text-good font-semibold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Ringkasan</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onNewSurvey && (
              <button
                onClick={() => {
                  onNewSurvey();
                  onClose();
                }}
                className="px-3 py-2 rounded-lg bg-oat-2 hover:bg-line text-ink-2 font-medium border border-line-2 transition-all cursor-pointer"
              >
                Survei Titik Baru
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-oat-2 hover:bg-line text-ink-2 font-semibold transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
