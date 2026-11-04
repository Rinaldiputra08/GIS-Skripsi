'use client';

import React, { useState } from 'react';
import { MapPin, Users, Route, Store, Building2, Navigation, Radio, Trophy } from 'lucide-react';
import { TopsisCandidateResult } from '@/lib/types';
import { BOGOR_DISTRICTS } from '@/data/bogor-spatial';
import { formatBusinessScore } from '@/lib/business-logic';

interface TopRecommendationsProps {
  candidates: TopsisCandidateResult[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidate: TopsisCandidateResult) => void;
  radiusMeters?: number;
}

import { getSettings } from '@/lib/settings';

/** Ambang kategori skor (Vi) - sama dengan yang dipakai peta & filter */
const tier = (score: number) =>
  score >= getSettings().tierHigh
    ? { label: 'Sangat strategis', cls: 'bg-good-bg text-good', bar: 'bg-good' }
    : score >= getSettings().tierMedium
    ? { label: 'Potensial', cls: 'bg-mid-bg text-mid', bar: 'bg-mid' }
    : { label: 'Prioritas rendah', cls: 'bg-bad-bg text-bad', bar: 'bg-bad' };

export const TopRecommendations: React.FC<TopRecommendationsProps> = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  radiusMeters = 250,
}) => {
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');

  // Zona terlarang (makam, militer, istana) tidak direkomendasikan
  const filtered = candidates.filter((c) => {
    if (c.isRestricted) return false;
    if (districtFilter === 'ALL') return true;
    return c.district.toLowerCase() === districtFilter.toLowerCase();
  });
  const top10 = filtered.slice(0, 10);

  return (
    <div className="animate-in flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink">10 lokasi terbaik</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">
          Dari <b className="tabular text-ink">{filtered.length.toLocaleString('id-ID')}</b> titik layak usaha. Ketuk kartu untuk
          melihatnya di peta.
        </p>
      </div>

      <label className="block">
        <span className="sr-only">Filter kecamatan</span>
        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="h-12 w-full cursor-pointer rounded-2xl border border-line-2 bg-paper px-4 text-sm font-semibold text-ink"
        >
          <option value="ALL">Semua kecamatan</option>
          {BOGOR_DISTRICTS.map((d) => (
            <option key={d.id} value={d.name}>
              Kecamatan {d.name}
            </option>
          ))}
        </select>
      </label>

      {top10.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <Trophy className="h-8 w-8 text-ink-3" />
          <p className="text-sm font-semibold text-ink-2">Belum ada titik rekomendasi untuk wilayah ini.</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {top10.map((c, idx) => {
            const rank = idx + 1;
            const selected = selectedCandidateId === c.id;
            const score100 = formatBusinessScore(c.score);
            const t = tier(c.score);
            const near = c.nearestCrowdName ? `Dekat ${c.nearestCrowdName}` : c.nearestRoadName ? `Ruas ${c.nearestRoadName}` : '';

            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelectCandidate(c)}
                  aria-pressed={selected}
                  className={`card block w-full cursor-pointer overflow-hidden p-0 text-left transition-all ${
                    selected ? '!border-espresso shadow-float ring-2 ring-espresso/10' : 'hover:border-line-2 hover:shadow-float'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3.5">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold ${
                        rank === 1 ? 'bg-lime text-ink' : rank <= 3 ? 'bg-espresso text-white' : 'bg-oat-2 text-ink-2'
                      }`}
                    >
                      {rank}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-extrabold text-ink">{c.district}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-3">{near || 'Titik grid'}</span>
                      <span className={`chip mt-1.5 ${t.cls}`}>{t.label}</span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="tabular block text-2xl font-extrabold leading-none text-ink">{score100}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-ink-3">dari 100</span>
                    </span>
                  </div>

                  {/* bilah skor */}
                  <div className="mx-3.5 mb-3.5 h-1.5 overflow-hidden rounded-full bg-oat-2">
                    <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${score100}%` }} />
                  </div>

                  {selected && (
                    <div className="border-t border-line bg-oat/60 p-3.5">
                      <dl className="grid grid-cols-2 gap-2.5 text-sm">
                        <Row icon={<Store className="h-4 w-4" />} label="Jarak kafe" value={`${Math.round(c.c1_dist_competitor)} m`} />
                        <Row icon={<Users className="h-4 w-4" />} label="Kepadatan" value={`${c.c2_density.toLocaleString('id-ID')} /km²`} />
                        <Row icon={<Route className="h-4 w-4" />} label="Akses jalan" value={`${Math.round(c.c3_dist_road)} m`} />
                        <Row icon={<Building2 className="h-4 w-4" />} label="Keramaian" value={`${Math.round(c.c4_dist_crowd)} m`} />
                      </dl>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
                        <span className="tabular flex items-center gap-1 font-mono">
                          <MapPin className="h-3.5 w-3.5" />
                          {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                        </span>
                        <span className="tabular font-mono">Vi {c.score.toFixed(4)}</span>
                        <span className="flex items-center gap-1">
                          <Radio className="h-3.5 w-3.5" />
                          zona ±{radiusMeters} m
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-ink">
                        <Navigation className="h-3.5 w-3.5" /> Ditampilkan di peta
                      </div>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

const Row: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2">
    <span className="text-ink-3">{icon}</span>
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-ink-3">{label}</dt>
      <dd className="tabular font-mono text-[13px] font-bold text-ink">{value}</dd>
    </div>
  </div>
);
