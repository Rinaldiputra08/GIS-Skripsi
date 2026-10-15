'use client';

import React, { useState } from 'react';
import {
  Trophy,
  MapPin,
  Compass,
  Navigation,
  Users,
  Route,
  Activity,
  ChevronRight,
  Filter,
  Sparkles,
  Star,
  Radio,
} from 'lucide-react';
import { TopsisCandidateResult } from '@/lib/types';
import { BOGOR_DISTRICTS } from '@/data/bogor-spatial';
import {
  formatBusinessScore,
  getStarRating,
} from '@/lib/business-logic';

interface TopRecommendationsProps {
  candidates: TopsisCandidateResult[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidate: TopsisCandidateResult) => void;
  radiusMeters?: number;
}

export const TopRecommendations: React.FC<TopRecommendationsProps> = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  radiusMeters = 250,
}) => {
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');

  // Filter out restricted spots (cemeteries, police, military) and apply district filter
  const filteredCandidates = candidates.filter((c) => {
    if (c.isRestricted) return false;
    if (districtFilter === 'ALL') return true;
    return c.district.toLowerCase() === districtFilter.toLowerCase();
  });

  const top10 = filteredCandidates.slice(0, 10);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg shadow-amber-500/30 ring-2 ring-yellow-400">
          #1
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-950 font-black text-xs flex items-center justify-center shadow ring-1 ring-slate-300">
          #2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white font-black text-xs flex items-center justify-center shadow ring-1 ring-amber-600">
          #3
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700">
        #{rank}
      </div>
    );
  };

  const getCategoryBadge = (category: string, score: number) => {
    if (score >= 0.62) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Sangat Strategis
        </span>
      );
    }
    if (score >= 0.45) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          Potensial Menengah
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
        Prioritas Rendah
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4 text-slate-100 font-sans">
      {/* Header & Filter */}
      <div className="flex flex-col gap-2.5 border-b border-slate-800 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Top 10 Zona Rekomendasi (±{radiusMeters}m)</span>
          </span>
          <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
            {filteredCandidates.length} Titik Layak Usaha
          </span>
        </div>

        {/* Kecamatan Filter Selector */}
        <div className="flex items-center gap-2 pt-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Semua Kecamatan Kota Bogor</option>
            {BOGOR_DISTRICTS.map((d) => (
              <option key={d.id} value={d.name}>
                Kecamatan {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Candidate List */}
      {top10.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400 text-xs">
          Belum ada titik rekomendasi untuk wilayah ini.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {top10.map((candidate, idx) => {
            const isSelected = selectedCandidateId === candidate.id;
            const rank = idx + 1;
            const businessScore = formatBusinessScore(candidate.score);
            const starCount = getStarRating(candidate.score);

            return (
              <div
                key={candidate.id}
                onClick={() => onSelectCandidate(candidate)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                {/* Highlight line on left */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${
                    rank === 1
                      ? 'bg-amber-400'
                      : candidate.score >= 0.62
                      ? 'bg-emerald-500'
                      : candidate.score >= 0.45
                      ? 'bg-amber-500'
                      : 'bg-slate-700'
                  }`}
                />

                {/* Top Row: Rank, District, Score & Stars */}
                <div className="flex items-start justify-between gap-2 pl-2">
                  <div className="flex items-center gap-2.5">
                    {getRankBadge(rank)}
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Kecamatan {candidate.district}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>Centroid: {candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}</span>
                      </div>
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                        <Radio className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <span>Zona Penyangga: Radius ±{radiusMeters}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <div className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < starCount ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-extrabold text-white">
                        {businessScore}
                        <span className="text-[10px] text-slate-400 font-normal">/100</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Vi: {candidate.score.toFixed(4)}
                      </span>
                      {getCategoryBadge(candidate.category, candidate.score)}
                    </div>
                  </div>
                </div>

                {/* Spatial Criteria Mini Grid */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/70 pl-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Compass className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-400">Jarak Kafe:</span>
                    <strong className="text-white ml-auto font-mono">
                      {Math.round(candidate.c1_dist_competitor)} m
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-slate-400">Populasi:</span>
                    <strong className="text-white ml-auto font-mono">
                      {Math.round(candidate.c2_population / 1000)}k jiwa
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Route className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="text-slate-400">Akses Jalan:</span>
                    <strong className="text-white ml-auto font-mono">
                      {Math.round(candidate.c3_dist_road)} m
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span className="text-slate-400">Keramaian:</span>
                    <strong className="text-white ml-auto font-mono">
                      {Math.round(candidate.c4_dist_crowd)} m
                    </strong>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="mt-2.5 pl-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 truncate max-w-[220px]">
                    {candidate.nearestCrowdName
                      ? `Dekat: ${candidate.nearestCrowdName}`
                      : `Ruas: ${candidate.nearestRoadName}`}
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Zoom ke Peta</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
