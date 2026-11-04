'use client';

import React from 'react';
import { CircleDot, Radio, Target, ShieldAlert, Info } from 'lucide-react';
import { LayerToggleState, FilterState, RecommendationDisplayMode } from '@/lib/types';
import { BOGOR_DISTRICTS } from '@/data/bogor-spatial';

interface LayerFilterControlProps {
  layers: LayerToggleState;
  onToggleLayer: (layerKey: keyof LayerToggleState) => void;
  onUpdateLayers?: (updated: Partial<LayerToggleState>) => void;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  totalVisibleCandidates: number;
  zoneCount?: number;
}

const LAYER_ITEMS: { key: keyof LayerToggleState; label: string; hint: string; color: string }[] = [
  { key: 'showRecommendations', label: 'Hasil rekomendasi', hint: 'Gradasi skor TOPSIS', color: '#12805c' },
  { key: 'showCompetitors', label: 'Kedai kopi eksisting', hint: 'Kompetitor (C1)', color: '#7a4a21' },
  { key: 'showCrowdCenters', label: 'Pusat keramaian', hint: 'Mall, pasar, terminal, taman (C4)', color: '#0e8fa0' },
  { key: 'showRoads', label: 'Jaringan jalan', hint: 'Akses jalan (C3)', color: '#4b6cb7' },
  { key: 'showDistricts', label: 'Batas kecamatan', hint: '6 kecamatan Kota Bogor', color: '#1f1813' },
  { key: 'showExclusionZones', label: 'Zona terlarang', hint: 'Makam, polisi, militer, istana', color: '#c2352b' },
];

const MODES = [
  { id: 'both', label: 'Gabungan', icon: CircleDot },
  { id: 'radius', label: 'Area', icon: Radio },
  { id: 'point', label: 'Titik', icon: Target },
] as const;

const CATEGORIES = [
  { key: 'all', label: 'Semua' },
  { key: 'high', label: 'Tinggi' },
  { key: 'medium', label: 'Menengah' },
  { key: 'low', label: 'Rendah' },
] as const;

export const LayerFilterControl: React.FC<LayerFilterControlProps> = ({
  layers,
  onToggleLayer,
  onUpdateLayers,
  filters,
  onFilterChange,
  totalVisibleCandidates,
  zoneCount,
}) => {
  const radius = layers.recommendationRadiusMeters || 250;
  const mode = layers.recommendationDisplayMode || 'both';

  return (
    <div className="animate-in flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink">Layer & filter</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">Atur apa yang tampil di peta dan saring hasil rekomendasi.</p>
      </div>

      {/* Lapisan */}
      <section aria-labelledby="layer-title">
        <h3 id="layer-title" className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-3">
          Lapisan peta
        </h3>
        <ul className="card divide-y divide-line overflow-hidden">
          {LAYER_ITEMS.map((it) => {
            const on = Boolean(layers[it.key]);
            return (
              <li key={it.key}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => onToggleLayer(it.key)}
                  className="flex min-h-[56px] w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-oat/60"
                >
                  <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white" style={{ background: it.color, boxShadow: `0 0 0 1px ${it.color}33` }} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-bold ${on ? 'text-ink' : 'text-ink-3'}`}>{it.label}</span>
                    <span className="block truncate text-xs text-ink-3">{it.hint}</span>
                  </span>
                  <span
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-espresso' : 'bg-line-2'}`}
                    aria-hidden
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Tampilan hasil */}
      <section aria-labelledby="mode-title" className="card flex flex-col gap-4 p-4">
        <div>
          <h3 id="mode-title" className="text-sm font-extrabold text-ink">
            Bentuk tampilan hasil
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-3">
            Titik adalah pusat sel grid. Area menunjukkan zona sekitar ±{radius} m tempat kamu sebaiknya mencari ruko atau lahan.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-oat-2 p-1" role="radiogroup" aria-label="Bentuk tampilan hasil">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onUpdateLayers?.({ recommendationDisplayMode: m.id as RecommendationDisplayMode })}
                className={`flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-xs font-bold transition-all ${
                  active ? 'bg-paper text-ink shadow-soft' : 'text-ink-3 hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" />
                {m.label}
              </button>
            );
          })}
        </div>

        {mode !== 'point' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-sm">
              <label htmlFor="radius" className="font-semibold text-ink-2">
                Radius zona
              </label>
              <span className="tabular font-mono font-bold text-ink">
                {radius} m <span className="text-xs font-medium text-ink-3">(~{((Math.PI * radius * radius) / 10000).toFixed(1)} ha)</span>
              </span>
            </div>
            <input
              id="radius"
              type="range"
              min={100}
              max={600}
              step={25}
              value={radius}
              onChange={(e) => onUpdateLayers?.({ recommendationRadiusMeters: parseInt(e.target.value, 10) })}
              className="w-full"
            />
            <div className="flex flex-wrap gap-1.5">
              {[150, 250, 400, 500].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onUpdateLayers?.({ recommendationRadiusMeters: r })}
                  aria-pressed={radius === r}
                  className={`chip cursor-pointer !px-3 !py-1.5 transition-colors ${
                    radius === r ? 'bg-espresso text-white' : 'bg-oat-2 text-ink-2 hover:bg-line'
                  }`}
                >
                  {r} m
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Filter */}
      <section aria-labelledby="filter-title" className="card flex flex-col gap-5 p-4">
        <div className="flex items-baseline justify-between">
          <h3 id="filter-title" className="text-sm font-extrabold text-ink">
            Saring hasil
          </h3>
          <span className="chip bg-oat-2 text-ink-2">
            <b className="tabular text-ink">{totalVisibleCandidates.toLocaleString('id-ID')}</b> titik tampil
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <label htmlFor="minscore" className="font-semibold text-ink-2">
              Skor minimal (Vi)
            </label>
            <span className="tabular font-mono font-bold text-ink">≥ {filters.minScore.toFixed(2)}</span>
          </div>
          <input
            id="minscore"
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={filters.minScore}
            onChange={(e) => onFilterChange({ minScore: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-[11px] font-medium text-ink-3">
            <span>Semua</span>
            <span>Sangat ketat</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-2">Kategori kelayakan</span>
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-oat-2 p-1" role="radiogroup" aria-label="Kategori kelayakan">
            {CATEGORIES.map((c) => {
              const active = filters.category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onFilterChange({ category: c.key as FilterState['category'] })}
                  className={`min-h-[40px] cursor-pointer rounded-xl text-xs font-bold transition-all ${
                    active ? 'bg-paper text-ink shadow-soft' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-snug text-ink-3">Tinggi: Vi ≥ 0,62 · Menengah: 0,45–0,62 · Rendah: &lt; 0,45</p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-2">Kecamatan</span>
          <select
            value={filters.district}
            onChange={(e) => onFilterChange({ district: e.target.value })}
            className="h-12 w-full cursor-pointer rounded-2xl border border-line-2 bg-paper px-4 text-sm font-semibold text-ink"
          >
            <option value="ALL">Semua 6 kecamatan</option>
            {BOGOR_DISTRICTS.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          role="switch"
          aria-checked={filters.excludeRestricted}
          onClick={() => onFilterChange({ excludeRestricted: !filters.excludeRestricted })}
          className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-oat p-3.5 text-left transition-colors hover:bg-oat-2"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bad-bg text-bad">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">Sembunyikan lahan terlarang</span>
            <span className="block text-xs leading-snug text-ink-3">
              {zoneCount ?? 0} zona: makam, markas polisi & militer, ring 1 istana, sempadan sungai.
            </span>
          </span>
          <span
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${filters.excludeRestricted ? 'bg-espresso' : 'bg-line-2'}`}
            aria-hidden
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                filters.excludeRestricted ? 'left-6' : 'left-1'
              }`}
            />
          </span>
        </button>
      </section>

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Hasil adalah rekomendasi berbasis data spasial, bukan jaminan keberhasilan usaha. Selalu verifikasi di lapangan.
      </p>
    </div>
  );
};
