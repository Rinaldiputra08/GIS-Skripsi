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
import { SurveyPointEvaluation, BusinessType, BUSINESS_TYPES } from '@/lib/types';
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
  businessType?: BusinessType;
}

export const SurveyLocationModal: React.FC<SurveyLocationModalProps> = ({
  isOpen,
  onClose,
  survey,
  onFocusMap,
  onNewSurvey,
  businessType = 'coffee_shop',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'swot' | 'matrix'>('summary');
  const currentBusiness = BUSINESS_TYPES[businessType] || BUSINESS_TYPES.coffee_shop;

  if (!isOpen || !survey) return null;

  const businessScore = formatBusinessScore(survey.score);
  const starCount = getStarRating(survey.score);

  const getBadgeStyle = () => {
    switch (survey.swot.verdictType) {
      case 'recommended':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
          badgeText: '🟢 SANGAT DIREKOMENDASIKAN (POTENSI TINGGI)',
          barColor: 'from-emerald-500 to-teal-400',
          textColor: 'text-emerald-400',
        };
      case 'moderate':
        return {
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
          badgeText: '🟡 CUKUP POTENSIAL (LAYAK DIPERTIMBANGKAN)',
          barColor: 'from-amber-500 to-orange-400',
          textColor: 'text-amber-400',
        };
      case 'not_recommended':
        return {
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
          badgeText: '🔴 KURANG STRATEGIS (RISIKO TINGGI)',
          barColor: 'from-rose-500 to-red-600',
          textColor: 'text-rose-400',
        };
      case 'restricted':
        return {
          bg: 'bg-red-950/60 border-red-600/50 text-red-300',
          badgeText: '⛔ TIDAK LAYAK (ZONA TERLARANG)',
          barColor: 'from-red-600 to-rose-700',
          textColor: 'text-red-400',
        };
      default:
        return {
          bg: 'bg-slate-800/60 border-slate-700 text-slate-300',
          badgeText: '⚠️ DI LUAR WILAYAH KOTA BOGOR',
          barColor: 'from-slate-600 to-slate-500',
          textColor: 'text-slate-400',
        };
    }
  };

  const badge = getBadgeStyle();

  const handleCopyReport = () => {
    const reportText = `
=== LAPORAN EVALUASI KELAYAKAN LOKASI ${currentBusiness.name.toUpperCase()} ===
Koordinat: ${survey.lat.toFixed(5)}, ${survey.lng.toFixed(5)}
Kecamatan: ${survey.districtName || 'Luar Wilayah Kota'}
Skor Kelayakan: ${businessScore}/100 (${badge.badgeText})
Nilai Preferensi TOPSIS (Vi): ${survey.score.toFixed(4)}
Peringkat Estimasi: #${survey.rankEstimate} dari ${survey.totalCandidates} titik (Top ${survey.percentile}%)

1. Jarak Kompetitor Terdekat: ${survey.c1_dist_competitor} m (${survey.nearestCompetitorName})
2. Basis Populasi: ${survey.c2_population.toLocaleString('id-ID')} jiwa (${survey.districtName})
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
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-slate-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Laporan Kelayakan Bisnis Lokasi
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-[11px] text-slate-300">
                  {survey.lat.toFixed(5)}, {survey.lng.toFixed(5)}
                </span>
                <span>•</span>
                <span className="text-emerald-300 font-medium">
                  {survey.districtName ? `Kecamatan ${survey.districtName}` : 'Luar Wilayah Kota'}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Hero Card: Status & Score */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 relative overflow-hidden space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide ${badge.bg}`}>
                {badge.badgeText}
              </div>

              {survey.isInsideBogor && !survey.isRestricted && (
                <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Peringkat:</span>
                  <strong className="text-white font-bold">#{survey.rankEstimate}</strong>
                  <span className="text-slate-500">/ {survey.totalCandidates}</span>
                  <span className="text-emerald-400 font-semibold ml-1">(Top {survey.percentile}%)</span>
                </div>
              )}
            </div>

            {/* Score Display (Unified: 0-100 Score, Stars & Vi reference) */}
            {survey.isInsideBogor && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    Skor Kelayakan Lokasi:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < starCount ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xl font-black font-mono text-emerald-400">
                      {businessScore}
                      <span className="text-xs text-slate-400 font-normal"> / 100</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
                      V<sub>i</sub>: {survey.score.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${badge.barColor} transition-all duration-700`}
                    style={{ width: `${Math.min(100, Math.max(5, survey.score * 100))}%` }}
                  />
                </div>
              </div>
            )}



            {/* Verdict summary paragraph */}
            <p className="text-xs text-slate-300 leading-relaxed pt-1 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
              {survey.swot.verdict}
            </p>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex border-b border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'summary'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>4 Faktor Strategis</span>
            </button>

            <button
              onClick={() => setActiveTab('swot')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'swot'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Analisis SWOT &amp; Peluang</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'matrix'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit Matematis</span>
            </button>
          </div>

          {/* TAB 1: 4 Factors / Criteria */}
          {activeTab === 'summary' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* C1: Competitor Distance */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                      🏪 Faktor Persaingan {currentBusiness.shortName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                      {survey.c1_dist_competitor >= 400 ? 'Persaingan Rendah' : 'Persaingan Ketat'}
                    </span>
                  </div>
                  <div className="text-base font-bold text-white">
                    {survey.c1_dist_competitor} <span className="text-xs text-slate-400 font-normal">meter</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate" title={survey.nearestCompetitorName}>
                    Kompetitor Terdekat: <strong className="text-slate-200">{survey.nearestCompetitorName}</strong>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {survey.c1_dist_competitor >= 400
                      ? '✅ Celah pasar terbuka lebar / aman dari perang harga'
                      : '⚠️ Berdekatan dengan kompetitor eksisting'}
                  </p>
                </div>

                {/* C2: Population */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                      👥 Faktor Potensi Pasar
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">
                      Populasi Wilayah
                    </span>
                  </div>
                  <div className="text-base font-bold text-white">
                    {survey.c2_population.toLocaleString('id-ID')}{' '}
                    <span className="text-xs text-slate-400 font-normal">jiwa</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Wilayah: <strong className="text-slate-200">{survey.districtName || '-'}</strong>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {survey.c2_population >= 180000
                      ? '✅ Basis demografis pasar sangat padat'
                      : 'ℹ️ Kepadatan demografis menengah'}
                  </p>
                </div>

                {/* C3: Road Distance */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                      🛣️ Faktor Akses Transportasi
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono">
                      Akses Jalan
                    </span>
                  </div>
                  <div className="text-base font-bold text-white">
                    {survey.c3_dist_road} <span className="text-xs text-slate-400 font-normal">meter</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate" title={survey.nearestRoadName}>
                    Ruas Jalan: <strong className="text-slate-200">{survey.nearestRoadName}</strong>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {survey.c3_dist_road <= 60
                      ? '✅ Sangat mudah dijangkau kendaraan & pejalan kaki'
                      : 'ℹ️ Lokasi masuk ke jalan lingkungan perumahan'}
                  </p>
                </div>

                {/* C4: Crowd Center Distance */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                      🎯 Faktor Arus Pengunjung
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">
                      Pusat Keramaian
                    </span>
                  </div>
                  <div className="text-base font-bold text-white">
                    {survey.c4_dist_crowd} <span className="text-xs text-slate-400 font-normal">meter</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate" title={survey.nearestCrowdName}>
                    Simpul Magnet: <strong className="text-slate-200">{survey.nearestCrowdName}</strong>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {survey.c4_dist_crowd <= 250
                      ? '✅ Menjamin foot traffic dan calon pembeli harian'
                      : 'ℹ️ Jarak menengah ke pusat aktivitas'}
                  </p>
                </div>
              </div>

              {/* Land-use Status */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  survey.isRestricted
                    ? 'bg-rose-950/50 border-rose-600/50 text-rose-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                {survey.isRestricted ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div>
                  <strong className="block text-white font-semibold">
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
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Keunggulan Lokasi (Strengths)
                  </h4>
                  {survey.swot.strengths.length > 0 ? (
                    <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                      {survey.swot.strengths.map((s, idx) => (
                        <li key={idx} className="leading-snug">
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">Tidak ada keunggulan dominan yang signifikan.</p>
                  )}
                </div>

                {/* Weaknesses */}
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                  <h4 className="font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Tantangan Lokasi (Weaknesses)
                  </h4>
                  {survey.swot.weaknesses.length > 0 ? (
                    <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                      {survey.swot.weaknesses.map((w, idx) => (
                        <li key={idx} className="leading-snug">
                          {w}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">Tidak ditemukan kelemahan spasial mayor.</p>
                  )}
                </div>

                {/* Opportunities */}
                <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-2">
                  <h4 className="font-bold text-blue-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Peluang Bisnis (Opportunities)
                  </h4>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    {survey.swot.opportunities.map((o, idx) => (
                      <li key={idx} className="leading-snug">
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Threats */}
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                  <h4 className="font-bold text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" /> Risiko Pasar (Threats)
                  </h4>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
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
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Vektor Normalisasi (r_ij) &amp; Terbobot (y_ij) Titik Survei</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-mono">r_C1 (Kompetitor)</span>
                    <strong className="text-amber-300 font-mono text-xs">{survey.normalized[0]?.toFixed(4)}</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-mono">r_C2 (Populasi)</span>
                    <strong className="text-blue-300 font-mono text-xs">{survey.normalized[1]?.toFixed(4)}</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-mono">r_C3 (Jalan)</span>
                    <strong className="text-cyan-300 font-mono text-xs">{survey.normalized[2]?.toFixed(4)}</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-mono">r_C4 (Keramaian)</span>
                    <strong className="text-purple-300 font-mono text-xs">{survey.normalized[3]?.toFixed(4)}</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white">Jarak Solusi Ideal Euclidean (TOPSIS)</h4>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-300 block">Jarak ke Solusi Ideal Positif ($S^+$)</span>
                    <strong className="text-white font-mono text-xs">{survey.dPlus?.toFixed(4)}</strong>
                  </div>
                  <div className="p-2 rounded bg-rose-950/30 border border-rose-500/30">
                    <span className="text-[10px] text-rose-300 block">Jarak ke Solusi Ideal Negatif ($S^-$)</span>
                    <strong className="text-white font-mono text-xs">{survey.dMinus?.toFixed(4)}</strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 font-mono">
                  {`Formula: Vi = S- / (S+ + S-) = ${survey.dMinus?.toFixed(4)} / (${survey.dPlus?.toFixed(4)} + ${survey.dMinus?.toFixed(4)}) = `}
                  <strong className="text-emerald-400">{survey.score.toFixed(4)}</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-950/90 text-xs">
          <div className="flex items-center gap-2">
            {onFocusMap && survey.isInsideBogor && (
              <button
                onClick={() => {
                  onFocusMap(survey.lat, survey.lng);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Fokus di Peta</span>
              </button>
            )}

            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Tersalin!</span>
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
                className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition-all cursor-pointer"
              >
                Survei Titik Baru
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
