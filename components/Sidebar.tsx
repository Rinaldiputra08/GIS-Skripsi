'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Trophy,
  Layers,
  Info,
  ChevronLeft,
  ChevronRight,
  Compass,
  LocateFixed,
  Crosshair,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Navigation,
  Loader2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { AhpForm } from './AhpForm';
import { TopRecommendations } from './TopRecommendations';
import { LayerFilterControl } from './LayerFilterControl';
import {
  AhpResult,
  TopsisCandidateResult,
  LayerToggleState,
  FilterState,
  SurveyPointEvaluation,
} from '@/lib/types';

interface SidebarProps {
  activeTab: 'ahp' | 'recommendations' | 'layers' | 'survey' | 'info';
  onTabChange: (tab: 'ahp' | 'recommendations' | 'layers' | 'survey' | 'info') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // AHP Props
  pairs: Record<string, number>;
  onPairChange: (pairKey: string, value: number) => void;
  onApplyPreset: (presetId: string) => void;
  activePreset: string | null;
  ahpResult: AhpResult;
  onCalculate: () => void;
  isCalculating: boolean;
  // Recommendations Props
  candidates: TopsisCandidateResult[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidate: TopsisCandidateResult) => void;
  // Layer & Filter Props
  layers: LayerToggleState;
  onToggleLayer: (layerKey: keyof LayerToggleState) => void;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  totalVisibleCandidates: number;
  // Field Survey Props
  surveyResult?: SurveyPointEvaluation | null;
  onSurveyPointSelected?: (lat: number, lng: number) => void;
  onOpenSurveyModal?: () => void;
  onClearSurvey?: () => void;
  isSurveyClickMode?: boolean;
  onToggleSurveyClickMode?: () => void;
}

const DEMO_SURVEY_SPOTS = [
  {
    name: 'Kawasan Jl. Pajajaran (Dekat Botani)',
    district: 'Bogor Timur',
    lat: -6.6025,
    lng: 106.8062,
    desc: 'Koridor komersial utama, dekat mall dan pintu tol Jagorawi',
  },
  {
    name: 'Kawasan Jl. Suryakencana (Pecinan)',
    district: 'Bogor Tengah',
    lat: -6.6042,
    lng: 106.8005,
    desc: 'Sentra kuliner legendaris dan heritage Kota Bogor',
  },
  {
    name: 'Kawasan Jl. Pandu Raya (Indraprasta)',
    district: 'Bogor Utara',
    lat: -6.5785,
    lng: 106.8152,
    desc: 'Sentra cafe & kuliner hits anak muda Bogor Utara',
  },
  {
    name: 'Kawasan Air Mancur (Jl. Sudirman)',
    district: 'Bogor Tengah',
    lat: -6.5842,
    lng: 106.7948,
    desc: 'Pusat kuliner malam dan perkantoran militer/sipil',
  },
  {
    name: 'Kawasan Lahan Dekat TPU Blender',
    district: 'Tanah Sareal',
    lat: -6.5645,
    lng: 106.7885,
    desc: 'Uji Coba Filter Lahan Terlarang (Zona Pemakaman)',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  pairs,
  onPairChange,
  onApplyPreset,
  activePreset,
  ahpResult,
  onCalculate,
  isCalculating,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  layers,
  onToggleLayer,
  filters,
  onFilterChange,
  totalVisibleCandidates,
  surveyResult,
  onSurveyPointSelected,
  onOpenSurveyModal,
  onClearSurvey,
  isSurveyClickMode = false,
  onToggleSurveyClickMode,
}) => {
  const [manualLat, setManualLat] = useState('-6.5971');
  const [manualLng, setManualLng] = useState('106.7972');
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  const handleUseGps = () => {
    if (!navigator.geolocation) return;
    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        if (onSurveyPointSelected) {
          onSurveyPointSelected(pos.coords.latitude, pos.coords.longitude);
        }
      },
      () => {
        setIsGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng) && onSurveyPointSelected) {
      onSurveyPointSelected(lat, lng);
    }
  };

  return (
    <aside
      className={`relative z-20 flex flex-col bg-slate-950 border-r border-slate-800 transition-all duration-300 shadow-2xl ${
        isCollapsed ? 'w-16' : 'w-full md:w-[460px] lg:w-[480px]'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="hidden md:flex absolute -right-3.5 top-6 z-30 w-7 h-7 bg-slate-900 border border-slate-700 text-slate-300 rounded-full items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-md cursor-pointer"
        title={isCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Tabs Header */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900/90 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => onTabChange('ahp')}
          className={`flex-1 py-3 px-2.5 flex items-center justify-center gap-1 border-b-2 transition-all cursor-pointer ${
            activeTab === 'ahp'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Form AHP (Pembobotan Kriteria)"
        >
          <Sliders className="w-3.5 h-3.5" />
          {!isCollapsed && <span>AHP</span>}
        </button>

        <button
          onClick={() => onTabChange('recommendations')}
          className={`flex-1 py-3 px-2.5 flex items-center justify-center gap-1 border-b-2 transition-all cursor-pointer relative ${
            activeTab === 'recommendations'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Top Rekomendasi Lokasi"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          {!isCollapsed && <span>Rekomendasi</span>}
          {candidates.length > 0 && !isCollapsed && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-1.5" />
          )}
        </button>

        {/* Tab Survei Lapangan */}
        <button
          onClick={() => onTabChange('survey')}
          className={`flex-1 py-3 px-2.5 flex items-center justify-center gap-1 border-b-2 transition-all cursor-pointer relative ${
            activeTab === 'survey'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Survei Lapangan Mandiri (GPS / Klik Titik Peta)"
        >
          <Compass className="w-3.5 h-3.5 text-teal-400" />
          {!isCollapsed && <span>Survei</span>}
          {surveyResult && !isCollapsed && (
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse absolute top-2 right-1.5" />
          )}
        </button>

        <button
          onClick={() => onTabChange('layers')}
          className={`flex-1 py-3 px-2.5 flex items-center justify-center gap-1 border-b-2 transition-all cursor-pointer ${
            activeTab === 'layers'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Lapisan GIS & Filter"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          {!isCollapsed && <span>Layer</span>}
        </button>

        <button
          onClick={() => onTabChange('info')}
          className={`flex-1 py-3 px-2.5 flex items-center justify-center gap-1 border-b-2 transition-all cursor-pointer ${
            activeTab === 'info'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Informasi Skripsi & Petunjuk"
        >
          <Info className="w-3.5 h-3.5 text-purple-400" />
          {!isCollapsed && <span>Info</span>}
        </button>
      </div>

      {/* Tab Content Area */}
      {!isCollapsed && (
        <div className="flex-1 p-4 md:p-5 overflow-y-auto">
          {activeTab === 'ahp' && (
            <AhpForm
              pairs={pairs}
              onPairChange={onPairChange}
              onApplyPreset={onApplyPreset}
              activePreset={activePreset}
              ahpResult={ahpResult}
              onCalculate={onCalculate}
              isCalculating={isCalculating}
            />
          )}

          {activeTab === 'recommendations' && (
            <TopRecommendations
              candidates={candidates}
              selectedCandidateId={selectedCandidateId}
              onSelectCandidate={onSelectCandidate}
            />
          )}

          {/* TAB SURVEI LAPANGAN */}
          {activeTab === 'survey' && (
            <div className="flex flex-col gap-4 text-slate-200 text-xs leading-relaxed animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Survei Lapangan Mandiri
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  AHP + TOPSIS Live
                </span>
              </div>

              <p className="text-slate-400 leading-normal">
                Sedang survei ruko/tanah di lapangan? Gunakan fitur ini untuk mendeteksi koordinat Anda atau klik sembarang titik di peta untuk mengevaluasi kelayakan lokasinya secara instan.
              </p>

              {/* Primary Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleUseGps}
                  disabled={isGpsLoading}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  {isGpsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LocateFixed className="w-4 h-4" />
                  )}
                  <span>{isGpsLoading ? 'Mencari GPS...' : 'Survei Lokasi GPS Saya'}</span>
                </button>

                {onToggleSurveyClickMode && (
                  <button
                    type="button"
                    onClick={onToggleSurveyClickMode}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all cursor-pointer ${
                      isSurveyClickMode
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 animate-pulse'
                        : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700'
                    }`}
                  >
                    <Crosshair className="w-4 h-4" />
                    <span>{isSurveyClickMode ? 'Klik di Peta Aktif' : 'Klik Titik di Peta'}</span>
                  </button>
                )}
              </div>

              {/* Active Survey Evaluation Card */}
              {surveyResult && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                        Hasil Evaluasi Terkini
                      </span>
                      <h4 className="font-bold text-sm text-white pt-1">
                        {surveyResult.districtName ? `Kecamatan ${surveyResult.districtName}` : 'Luar Wilayah Kota'}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {surveyResult.lat.toFixed(5)}, {surveyResult.lng.toFixed(5)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">Skor TOPSIS</span>
                      <span className="text-base font-extrabold font-mono text-emerald-400">
                        {surveyResult.score.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* 4 Criteria Summary */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px]">C1: Jarak Kompetitor</span>
                      <strong className="text-amber-300 font-mono">{surveyResult.c1_dist_competitor} m</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">C2: Populasi</span>
                      <strong className="text-blue-300 font-mono">{surveyResult.c2_population.toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">C3: Jarak Jalan</span>
                      <strong className="text-cyan-300 font-mono">{surveyResult.c3_dist_road} m</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">C4: Jarak Keramaian</span>
                      <strong className="text-purple-300 font-mono">{surveyResult.c4_dist_crowd} m</strong>
                    </div>
                  </div>

                  {/* Open Modal & Clear Button */}
                  <div className="flex items-center gap-2 pt-1">
                    {onOpenSurveyModal && (
                      <button
                        onClick={onOpenSurveyModal}
                        className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Buka Laporan Lengkap (SWOT)</span>
                      </button>
                    )}

                    {onClearSurvey && (
                      <button
                        onClick={onClearSurvey}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                        title="Hapus Titik Survei"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Presets for Demo / Testing */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Contoh Titik Lapangan (1-Klik Demo):
                </span>
                <div className="space-y-1.5">
                  {DEMO_SURVEY_SPOTS.map((spot, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (onSurveyPointSelected) {
                          onSurveyPointSelected(spot.lat, spot.lng);
                        }
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-white text-xs group-hover:text-emerald-300 transition-colors">
                          {spot.name}
                        </strong>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {spot.district}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 pt-0.5 leading-snug">{spot.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Coordinate Input */}
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 block">
                  Input Manual Koordinat Lapangan:
                </span>
                <form onSubmit={handleManualSubmit} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-mono">Latitude:</label>
                      <input
                        type="text"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-mono">Longitude:</label>
                      <input
                        type="text"
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                  >
                    Evaluasi Koordinat Ini
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'layers' && (
            <LayerFilterControl
              layers={layers}
              onToggleLayer={onToggleLayer}
              filters={filters}
              onFilterChange={onFilterChange}
              totalVisibleCandidates={totalVisibleCandidates}
            />
          )}

          {activeTab === 'info' && (
            <div className="flex flex-col gap-4 text-slate-200 text-xs leading-relaxed">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Tentang KopiSpasial Kota Bogor
                </h3>
              </div>

              <p>
                Sistem Informasi Geografis (SIG) berbasis Web untuk analisis celah pasar (*market gap/blank spot*) lokasi kedai kopi (*coffee shop*) baru di 6 wilayah administratif Kota Bogor:
              </p>

              <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="font-semibold text-emerald-400">4 Kriteria Evaluasi Spasial:</div>
                <ul className="space-y-1.5 pl-4 list-disc text-slate-300">
                  <li><strong>C1 (Benefit):</strong> Jarak ke kompetitor terdekat. Semakin jauh, semakin minim persaingan langsung.</li>
                  <li><strong>C2 (Benefit):</strong> Kepadatan penduduk kecamatan. Semakin padat, semakin tinggi potensi pasar.</li>
                  <li><strong>C3 (Cost):</strong> Jarak ke jalan utama (arteri/kolektor). Semakin dekat, semakin mudah diakses pengunjung.</li>
                  <li><strong>C4 (Cost):</strong> Jarak ke simpul keramaian (mall/stasiun/kampus/taman). Semakin dekat, semakin tinggi foot traffic.</li>
                </ul>
              </div>

              <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="font-semibold text-cyan-400">Metodologi yang Diterapkan:</div>
                <ul className="space-y-1.5 pl-4 list-disc text-slate-300">
                  <li><strong>Analytic Hierarchy Process (AHP):</strong> Menentukan bobot preferensi kriteria dengan validasi Rasio Konsistensi (CR ≤ 0.10).</li>
                  <li><strong>TOPSIS:</strong> Merangking ratusan kandidat titik sampling spasial berdasarkan kedekatan dengan Solusi Ideal Positif ($A^+$) dan jarak terjauh dari Solusi Ideal Negatif ($A^-$).</li>
                  <li><strong>Field Survey Evaluator:</strong> Evaluasi kelayakan lokasi secara dinamis dan real-time menggunakan GPS / Pin-Drop di lapangan.</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-[11px] text-emerald-300">
                💡 <strong>Tips:</strong> Klik tab <strong>Survei</strong> atau tombol <strong>Survei GPS</strong> untuk mengevaluasi kelayakan calon tempat usaha kedai kopi secara instan.
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
