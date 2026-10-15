'use client';

import React from 'react';
import {
  Layers,
  MapPin,
  Route,
  Activity,
  Sparkles,
  Filter,
  Sliders,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  CircleDot,
  Radio,
  Target,
  Info,
} from 'lucide-react';
import { LayerToggleState, FilterState, RecommendationDisplayMode } from '@/lib/types';
import { BOGOR_DISTRICTS, BOGOR_EXCLUSION_ZONES } from '@/data/bogor-spatial';

interface LayerFilterControlProps {
  layers: LayerToggleState;
  onToggleLayer: (layerKey: keyof LayerToggleState) => void;
  onUpdateLayers?: (updated: Partial<LayerToggleState>) => void;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  totalVisibleCandidates: number;
}

export const LayerFilterControl: React.FC<LayerFilterControlProps> = ({
  layers,
  onToggleLayer,
  onUpdateLayers,
  filters,
  onFilterChange,
  totalVisibleCandidates,
}) => {
  return (
    <div className="flex flex-col gap-5 text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-1.5 border-b border-slate-800 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <Layers className="w-4 h-4" /> Kontrol Layer &amp; Filter Spasial
        </span>
        <p className="text-xs text-slate-300">
          Atur visibilitas lapisan data GIS dan saring titik kandidat agar bebas dari zona terlarang (*Kuburan, Kantor Polisi/Militer*).
        </p>
      </div>

      {/* Mode Tampilan Rekomendasi: Area Radius vs Titik Grid (Fitur Skripsi) */}
      <div className="p-3.5 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col gap-3 shadow-lg shadow-emerald-950/20">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Format Tampilan Rekomendasi</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
            Spasial Skripsi
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          Tentukan proyeksi hasil TOPSIS pada peta: dalam bentuk <strong>Zona Radius (Catchment Area)</strong> agar tidak diasumsikan sebagai 1 titik kaku absolut, atau titik koordinat analitik.
        </p>

        {/* 3 Display Mode Buttons */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          {[
            {
              id: 'both',
              label: 'Kombinasi',
              sub: 'Radius + Titik',
              icon: CircleDot,
            },
            {
              id: 'radius',
              label: 'Area Radius',
              sub: 'Zona Potensi',
              icon: Radio,
            },
            {
              id: 'point',
              label: 'Titik Saja',
              sub: 'Centroid Grid',
              icon: Target,
            },
          ].map((mode) => {
            const Icon = mode.icon;
            const isCurrent = (layers.recommendationDisplayMode || 'both') === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() =>
                  onUpdateLayers?.({
                    recommendationDisplayMode: mode.id as RecommendationDisplayMode,
                  })
                }
                className={`py-2 px-1.5 rounded-md text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-600/30 border border-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="text-[11px] font-bold leading-tight">{mode.label}</span>
                <span className="text-[9px] text-slate-400">{mode.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Radius Size Selector (if not in 'point' only mode) */}
        {layers.recommendationDisplayMode !== 'point' && (
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Radius Buffer Penyangga:</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {layers.recommendationRadiusMeters || 250} meter
                </span>
                <span className="text-[10px] text-slate-400">
                  (~{((Math.PI * Math.pow(layers.recommendationRadiusMeters || 250, 2)) / 10000).toFixed(1)} ha)
                </span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { r: 150, label: '150m (Mikro)' },
                { r: 250, label: '250m (Standar)' },
                { r: 400, label: '400m (Grid)' },
                { r: 500, label: '500m (Makro)' },
              ].map((p) => {
                const isSelected = (layers.recommendationRadiusMeters || 250) === p.r;
                return (
                  <button
                    key={p.r}
                    type="button"
                    onClick={() => onUpdateLayers?.({ recommendationRadiusMeters: p.r })}
                    className={`py-1 px-1 rounded text-[10px] font-mono transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-700/60'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Slider */}
            <input
              type="range"
              min="100"
              max="600"
              step="25"
              value={layers.recommendationRadiusMeters || 250}
              onChange={(e) =>
                onUpdateLayers?.({ recommendationRadiusMeters: parseInt(e.target.value, 10) })
              }
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        )}

        {/* Academic Note */}
        <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[10px] text-blue-200/90 leading-snug flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>Landasan Skripsi:</strong> Titik koordinat adalah <em>Centroid Spasial</em> sel sampling. Radius merepresentasikan <em>Catchment Area (daya jangkau pejalan kaki 5 menit)</em> agar investor mencari properti riil di koridor area tersebut.
          </span>
        </div>
      </div>

      {/* Spatial Constraint & Exclusion Toggle Card */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 flex flex-col gap-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" /> Filter Lahan Terlarang (SMCE)
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-mono font-bold">
            {BOGOR_EXCLUSION_ZONES.length} Zona Terproteksi
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          Mengeliminasi titik sampling yang jatuh di atas <strong>kuburan (TPU)</strong>, <strong>markas kepolisian &amp; militer</strong>, <strong>kawasan ring 1 istana</strong>, dan <strong>sempadan sungai</strong>.
        </p>

        <button
          type="button"
          onClick={() =>
            onFilterChange({ excludeRestricted: !filters.excludeRestricted })
          }
          className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
            filters.excludeRestricted
              ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50 shadow'
              : 'bg-rose-950/40 text-rose-300 border border-rose-800/60'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {filters.excludeRestricted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            )}
            <span>
              {filters.excludeRestricted
                ? 'Filter Aktif: Lahan Terlarang Dieliminasi'
                : 'Filter Nonaktif: Menampilkan Semua Titik'}
            </span>
          </div>
          <span className="text-[10px] underline">Ubah</span>
        </button>
      </div>

      {/* Layer Toggles */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Lapisan Peta GIS:</span>
        </span>

        <div className="flex flex-col gap-2">
          {/* Layer: Districts */}
          <button
            type="button"
            onClick={() => onToggleLayer('showDistricts')}
            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
              layers.showDistricts
                ? 'bg-slate-900 border-blue-500/40 text-blue-200'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="font-medium">Poligon 6 Kecamatan</span>
            </div>
            {layers.showDistricts ? (
              <Eye className="w-4 h-4 text-blue-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Layer: Exclusion Zones (Red Hatched) */}
          <button
            type="button"
            onClick={() => onToggleLayer('showExclusionZones')}
            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
              layers.showExclusionZones
                ? 'bg-slate-900 border-rose-500/40 text-rose-200'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-rose-600 animate-pulse" />
              <span className="font-medium">Zona Restriksi (Kuburan, Polisi, Militer)</span>
            </div>
            {layers.showExclusionZones ? (
              <Eye className="w-4 h-4 text-rose-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Layer: Competitors */}
          <button
            type="button"
            onClick={() => onToggleLayer('showCompetitors')}
            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
              layers.showCompetitors
                ? 'bg-slate-900 border-amber-500/40 text-amber-200'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="font-medium">Kedai Kopi Eksisting (Kompetitor C1)</span>
            </div>
            {layers.showCompetitors ? (
              <Eye className="w-4 h-4 text-amber-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Layer: Roads */}
          <button
            type="button"
            onClick={() => onToggleLayer('showRoads')}
            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
              layers.showRoads
                ? 'bg-slate-900 border-teal-500/40 text-teal-200'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-400" />
              <span className="font-medium">Jaringan Jalan Utama (Akses C3)</span>
            </div>
            {layers.showRoads ? (
              <Eye className="w-4 h-4 text-teal-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Layer: Crowd Centers */}
          <button
            type="button"
            onClick={() => onToggleLayer('showCrowdCenters')}
            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
              layers.showCrowdCenters
                ? 'bg-slate-900 border-purple-500/40 text-purple-200'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="font-medium">Simpul Keramaian (Mall/Stasiun C4)</span>
            </div>
            {layers.showCrowdCenters ? (
              <Eye className="w-4 h-4 text-purple-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Layer: Recommendations */}
          <button
            type="button"
            onClick={() => onToggleLayer('showRecommendations')}
            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
              layers.showRecommendations
                ? 'bg-slate-900 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">Hasil Rekomendasi TOPSIS (Gradasi)</span>
            </div>
            {layers.showRecommendations ? (
              <Eye className="w-4 h-4 text-emerald-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Numerical & Category Filters */}
      <div className="flex flex-col gap-3.5 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-400" /> Filter Kuantitatif
          </span>
          <span className="text-[11px] text-emerald-400 font-mono">
            {totalVisibleCandidates} Titik Aktif
          </span>
        </div>

        {/* Filter Minimum Score Vi */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Ambang Batas Skor Minimal (Vi):</span>
            <span className="font-mono font-bold text-emerald-400">
              ≥ {filters.minScore.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.05"
            value={filters.minScore}
            onChange={(e) => onFilterChange({ minScore: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.00 (Semua)</span>
            <span>0.40</span>
            <span>0.60</span>
            <span>0.80 (Sangat Ketat)</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-xs text-slate-400">Kategori Kelayakan:</span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { key: 'all', label: 'Semua Kategori' },
              { key: 'high', label: 'Tinggi (Vi ≥ 0.62)' },
              { key: 'medium', label: 'Menengah (0.45 - 0.62)' },
              { key: 'low', label: 'Rendah (Vi < 0.45)' },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() =>
                  onFilterChange({ category: cat.key as FilterState['category'] })
                }
                className={`py-1.5 px-2 rounded text-[11px] font-medium border transition-all cursor-pointer ${
                  filters.category === cat.key
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Kecamatan */}
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-xs text-slate-400">Batas Wilayah Kecamatan:</span>
          <select
            value={filters.district}
            onChange={(e) => onFilterChange({ district: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Semua 6 Kecamatan</option>
            {BOGOR_DISTRICTS.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name} (Pop: {d.population.toLocaleString('id-ID')})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
