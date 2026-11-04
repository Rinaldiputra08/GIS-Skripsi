'use client';

import React, { useEffect, useState } from 'react';
import {
  SlidersHorizontal,
  Trophy,
  Layers,
  Info,
  Compass,
  LocateFixed,
  MousePointerClick,
  Loader2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronUp,
  FileText,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { AhpForm } from './AhpForm';
import { TopRecommendations } from './TopRecommendations';
import { LayerFilterControl } from './LayerFilterControl';
import { ScenarioPanel } from './ScenarioPanel';
import { SurveyHistoryPanel } from './SurveyHistoryPanel';
import {
  AhpResult,
  TopsisCandidateResult,
  LayerToggleState,
  FilterState,
  SurveyPointEvaluation,
} from '@/lib/types';

type TabId = 'ahp' | 'recommendations' | 'layers' | 'survey' | 'info';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
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
  onUpdateLayers?: (updated: Partial<LayerToggleState>) => void;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  totalVisibleCandidates: number;
  zoneCount?: number;
  onLoadScenario?: (pairs: Record<string, number>) => void;
  // Field Survey Props
  surveyResult?: SurveyPointEvaluation | null;
  onSurveyPointSelected?: (lat: number, lng: number) => void;
  onOpenSurveyModal?: () => void;
  onClearSurvey?: () => void;
  isSurveyClickMode?: boolean;
  onToggleSurveyClickMode?: () => void;
}

const TABS: { id: TabId; label: string; icon: React.ElementType; title: string }[] = [
  { id: 'ahp', label: 'Prioritas', icon: SlidersHorizontal, title: 'Atur prioritas kriteria (AHP)' },
  { id: 'recommendations', label: 'Hasil', icon: Trophy, title: 'Rekomendasi lokasi terbaik' },
  { id: 'survey', label: 'Survei', icon: Compass, title: 'Cek kelayakan satu titik (GPS / klik peta)' },
  { id: 'layers', label: 'Layer', icon: Layers, title: 'Lapisan peta & filter' },
  { id: 'info', label: 'Info', icon: Info, title: 'Tentang aplikasi & cara pakai' },
];

const DEMO_SURVEY_SPOTS = [
  {
    name: 'Jl. Pajajaran (dekat Botani)',
    district: 'Bogor Timur',
    lat: -6.6025,
    lng: 106.8062,
    desc: 'Koridor komersial utama, dekat mall dan pintu tol Jagorawi',
  },
  {
    name: 'Jl. Suryakencana (Pecinan)',
    district: 'Bogor Tengah',
    lat: -6.6042,
    lng: 106.8005,
    desc: 'Sentra kuliner legendaris dan heritage Kota Bogor',
  },
  {
    name: 'Jl. Pandu Raya (Indraprasta)',
    district: 'Bogor Utara',
    lat: -6.5785,
    lng: 106.8152,
    desc: 'Sentra kafe & kuliner anak muda Bogor Utara',
  },
  {
    name: 'Air Mancur (Jl. Sudirman)',
    district: 'Bogor Tengah',
    lat: -6.5842,
    lng: 106.7948,
    desc: 'Pusat kuliner malam dan perkantoran',
  },
  {
    name: 'Lahan dekat TPU Blender',
    district: 'Tanah Sareal',
    lat: -6.5645,
    lng: 106.7885,
    desc: 'Uji coba filter lahan terlarang (zona pemakaman)',
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
  onUpdateLayers,
  filters,
  onFilterChange,
  totalVisibleCandidates,
  zoneCount,
  onLoadScenario,
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

  // Di layar kecil, mode "klik peta" butuh peta terlihat: lipat panel otomatis.
  useEffect(() => {
    if (isSurveyClickMode && !isCollapsed && typeof window !== 'undefined' && window.innerWidth < 1024) {
      onToggleCollapse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSurveyClickMode]);

  const handleUseGps = () => {
    if (!navigator.geolocation) return;
    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        onSurveyPointSelected?.(pos.coords.latitude, pos.coords.longitude);
      },
      () => setIsGpsLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) onSurveyPointSelected?.(lat, lng);
  };

  const handleTab = (id: TabId) => {
    onTabChange(id);
    if (isCollapsed) onToggleCollapse();
  };

  return (
    <>
      {/* Desktop: tombol buka panel saat disembunyikan */}
      {isCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="float-panel absolute left-4 top-[84px] z-[550] hidden h-12 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-bold text-ink transition-transform hover:scale-[1.03] lg:flex"
        >
          <PanelLeftOpen className="h-[18px] w-[18px]" />
          Buka panel
        </button>
      )}

      <aside
        aria-label="Panel analisis"
        className={`float-panel absolute z-[550] flex flex-col overflow-hidden transition-[height] duration-300 ease-out
          max-lg:inset-x-0 max-lg:bottom-0 max-lg:rounded-t-[28px] max-lg:pb-[env(safe-area-inset-bottom)] ${isCollapsed ? 'max-lg:h-[96px]' : 'max-lg:h-[62dvh]'}
          lg:bottom-4 lg:left-4 lg:top-[84px] lg:w-[420px] lg:rounded-[28px] ${isCollapsed ? 'lg:hidden' : ''}`}
      >
        {/* Pegangan sheet (mobile) / tombol sembunyikan (desktop) */}
        <div className="flex h-8 shrink-0 items-center justify-center px-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Buka panel' : 'Tutup panel'}
            className="flex h-8 w-24 cursor-pointer items-center justify-center lg:hidden"
          >
            <span className="h-1.5 w-10 rounded-full bg-line-2" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Sembunyikan panel"
            aria-label="Sembunyikan panel"
            className="ml-auto hidden h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-ink-3 transition-colors hover:bg-oat-2 hover:text-ink lg:flex"
          >
            <PanelLeftClose className="h-4 w-4" />
            Sembunyikan
          </button>
        </div>

        {/* Tab */}
        <nav className="shrink-0 px-3 pb-2" role="tablist" aria-label="Menu analisis">
          <div className="grid grid-cols-5 gap-1 rounded-2xl bg-oat-2 p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id && !isCollapsed;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={t.title}
                  onClick={() => handleTab(t.id)}
                  className={`relative flex cursor-pointer flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold transition-all ${
                    active ? 'bg-paper text-ink shadow-soft' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
                  {t.label}
                  {t.id === 'recommendations' && candidates.length > 0 && (
                    <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-good ring-2 ring-oat-2" />
                  )}
                  {t.id === 'survey' && surveyResult && (
                    <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-lime ring-2 ring-espresso" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Isi tab */}
        {!isCollapsed && (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">
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
              <div className="flex flex-col gap-5">
                <TopRecommendations
                  candidates={candidates}
                  selectedCandidateId={selectedCandidateId}
                  onSelectCandidate={onSelectCandidate}
                  radiusMeters={layers.recommendationRadiusMeters}
                />
                <ScenarioPanel
                  ahpResult={ahpResult}
                  pairs={pairs}
                  candidates={candidates}
                  onLoadScenario={(p) => onLoadScenario?.(p)}
                />
              </div>
            )}

            {activeTab === 'survey' && (
              <div className="animate-in flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-ink">Survei lokasi</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">
                    Lagi lihat ruko atau lahan? Cek kelayakan titik itu secara instan, dengan bobot prioritas yang sama.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={handleUseGps} disabled={isGpsLoading} className="btn btn-primary !px-3">
                    {isGpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                    {isGpsLoading ? 'Mencari…' : 'Lokasi saya'}
                  </button>
                  {onToggleSurveyClickMode && (
                    <button
                      type="button"
                      onClick={onToggleSurveyClickMode}
                      aria-pressed={isSurveyClickMode}
                      className={`btn !px-3 ${isSurveyClickMode ? 'bg-lime text-ink ring-2 ring-espresso' : 'btn-soft'}`}
                    >
                      <MousePointerClick className="h-4 w-4" />
                      {isSurveyClickMode ? 'Klik peta…' : 'Pilih di peta'}
                    </button>
                  )}
                </div>

                {surveyResult && (
                  <div className="card animate-in overflow-hidden">
                    <div className="flex items-start justify-between gap-3 bg-espresso p-4 text-white">
                      <div className="min-w-0">
                        <span className="chip bg-lime text-ink">Hasil terkini</span>
                        <h3 className="mt-2 truncate text-base font-extrabold">
                          {surveyResult.districtName ? `Kecamatan ${surveyResult.districtName}` : 'Di luar Kota Bogor'}
                        </h3>
                        <p className="tabular font-mono text-[11px] text-white/60">
                          {surveyResult.lat.toFixed(5)}, {surveyResult.lng.toFixed(5)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[11px] font-semibold text-white/60">Skor TOPSIS</div>
                        <div className="tabular text-2xl font-extrabold text-lime">{surveyResult.score.toFixed(3)}</div>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-px bg-line text-sm">
                      <Metric label="Jarak kompetitor" value={`${surveyResult.c1_dist_competitor} m`} />
                      <Metric label="Kepadatan" value={`${surveyResult.c2_density.toLocaleString('id-ID')} /km²`} />
                      <Metric label="Jarak jalan utama" value={`${surveyResult.c3_dist_road} m`} />
                      <Metric label="Jarak keramaian" value={`${surveyResult.c4_dist_crowd} m`} />
                    </dl>

                    <div className="flex items-center gap-2 p-3">
                      {onOpenSurveyModal && (
                        <button type="button" onClick={onOpenSurveyModal} className="btn btn-primary flex-1 !text-[13px]">
                          <FileText className="h-4 w-4" /> Laporan lengkap
                        </button>
                      )}
                      {onClearSurvey && (
                        <button
                          type="button"
                          onClick={onClearSurvey}
                          title="Hapus titik survei"
                          aria-label="Hapus titik survei"
                          className="btn btn-soft !px-0 w-11"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <SurveyHistoryPanel
                  survey={surveyResult ?? null}
                  weights={ahpResult.weightsArray}
                  onReview={(la, ln) => onSurveyPointSelected?.(la, ln)}
                />

                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-3">Coba titik contoh</h3>
                  <div className="flex flex-col gap-2">
                    {DEMO_SURVEY_SPOTS.map((spot) => (
                      <button
                        key={spot.name}
                        type="button"
                        onClick={() => onSurveyPointSelected?.(spot.lat, spot.lng)}
                        className="card group flex cursor-pointer items-center gap-3 p-3 text-left transition-all hover:border-line-2 hover:shadow-float"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-oat-2 text-ink-2 transition-colors group-hover:bg-lime group-hover:text-ink">
                          <MapPin className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">{spot.name}</span>
                          <span className="block truncate text-xs text-ink-3">
                            {spot.district} · {spot.desc}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </section>

                <details className="card group p-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-bold text-ink">
                    Masukkan koordinat manual
                    <ChevronUp className="h-4 w-4 text-ink-3 transition-transform group-open:rotate-180" />
                  </summary>
                  <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 border-t border-line p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs font-semibold text-ink-2">
                        Latitude
                        <input
                          type="text"
                          inputMode="decimal"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          className="tabular mt-1 h-11 w-full rounded-xl border border-line-2 bg-paper px-3 font-mono text-sm text-ink"
                        />
                      </label>
                      <label className="text-xs font-semibold text-ink-2">
                        Longitude
                        <input
                          type="text"
                          inputMode="decimal"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          className="tabular mt-1 h-11 w-full rounded-xl border border-line-2 bg-paper px-3 font-mono text-sm text-ink"
                        />
                      </label>
                    </div>
                    <button type="submit" className="btn btn-soft w-full">
                      Evaluasi koordinat ini
                    </button>
                  </form>
                </details>
              </div>
            )}

            {activeTab === 'layers' && (
              <LayerFilterControl
                layers={layers}
                onToggleLayer={onToggleLayer}
                onUpdateLayers={onUpdateLayers}
                filters={filters}
                onFilterChange={onFilterChange}
                totalVisibleCandidates={totalVisibleCandidates}
                zoneCount={zoneCount}
              />
            )}

            {activeTab === 'info' && <InfoTab onStart={() => handleTab('ahp')} />}
          </div>
        )}
      </aside>
    </>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-paper p-3">
    <dt className="text-xs font-medium text-ink-3">{label}</dt>
    <dd className="tabular mt-0.5 font-mono text-[15px] font-bold text-ink">{value}</dd>
  </div>
);

const InfoTab: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="animate-in flex flex-col gap-5">
    <div>
      <h2 className="text-xl font-extrabold tracking-tight text-ink">Cari lokasi kedai kopi, pakai data</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">
        Sistem Informasi Geografis untuk menemukan <em>celah pasar</em> (<em>blank spot</em>) kedai kopi baru di 6 kecamatan
        Kota Bogor, menggunakan metode AHP–TOPSIS.
      </p>
    </div>

    <ol className="flex flex-col gap-2">
      {[
        ['Atur prioritas', 'Tentukan kriteria mana yang lebih penting bagi usahamu.'],
        ['Hitung', 'Sistem menilai ribuan titik di seluruh kota.'],
        ['Lihat hasil', 'Telusuri peringkat dan cek langsung di peta.'],
      ].map(([t, d], i) => (
        <li key={t} className="card flex items-center gap-3 p-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-espresso text-sm font-extrabold text-lime">
            {i + 1}
          </span>
          <span>
            <b className="block text-sm text-ink">{t}</b>
            <span className="text-[13px] text-ink-2">{d}</span>
          </span>
        </li>
      ))}
    </ol>

    <section className="card p-4">
      <h3 className="text-sm font-extrabold text-ink">4 kriteria penilaian</h3>
      <ul className="mt-3 flex flex-col gap-3 text-[13px] leading-relaxed text-ink-2">
        <li>
          <b className="text-ink">C1 · Jarak ke kompetitor</b> <span className="chip bg-good-bg text-good">Benefit</span>
          <br />
          Semakin jauh, semakin minim persaingan langsung.
        </li>
        <li>
          <b className="text-ink">C2 · Kepadatan penduduk</b> <span className="chip bg-good-bg text-good">Benefit</span>
          <br />
          Semakin padat, semakin besar potensi pasar.
        </li>
        <li>
          <b className="text-ink">C3 · Jarak ke jalan utama</b> <span className="chip bg-info-bg text-info">Cost</span>
          <br />
          Semakin dekat arteri/kolektor, semakin mudah diakses.
        </li>
        <li>
          <b className="text-ink">C4 · Jarak ke keramaian</b> <span className="chip bg-info-bg text-info">Cost</span>
          <br />
          Semakin dekat mall, pasar, terminal, atau taman, semakin tinggi lalu lintas pengunjung.
        </li>
      </ul>
    </section>

    <section className="card p-4">
      <h3 className="text-sm font-extrabold text-ink">Metode</h3>
      <ul className="mt-3 flex flex-col gap-2.5 text-[13px] leading-relaxed text-ink-2">
        <li>
          <b className="text-ink">AHP</b> menentukan bobot kriteria lewat perbandingan berpasangan, dengan validasi rasio
          konsistensi (CR ≤ 0,10).
        </li>
        <li>
          <b className="text-ink">TOPSIS</b> meranking titik kandidat berdasarkan kedekatannya dengan solusi ideal positif
          dan jaraknya dari solusi ideal negatif.
        </li>
        <li>
          <b className="text-ink">Survei lokasi</b> menilai satu titik pilihanmu (GPS atau klik peta) dengan cara yang sama.
        </li>
      </ul>
    </section>

    <button type="button" onClick={onStart} className="btn btn-primary w-full">
      Mulai atur prioritas <ArrowRight className="h-4 w-4" />
    </button>
  </div>
);
