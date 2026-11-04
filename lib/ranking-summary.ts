/**
 * Ringkasan & perbandingan peringkat TOPSIS (dipakai CMS untuk menunjukkan dampak perubahan data
 * sebelum vs sesudah grid dibangun ulang). Murni fungsi, aman dipakai di server maupun klien.
 */
import type { TopsisCandidateResult } from './types';

export interface RankedPoint {
  lat: number;
  lng: number;
  district: string;
  score: number;
  c1: number;
  c3: number;
  c4: number;
  rank: number;
}

export interface RankingSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  c1Median: number;
  top10: RankedPoint[];
  topDistricts: Record<string, number>; // sebaran 50 titik teratas per kecamatan
  topScore: number;
}

export interface RankingDiff {
  overlapTop10: number;
  overlapTop50: number;
  /** 10 titik teratas sesudah, dengan peringkat lamanya (null = sebelumnya di luar 10 besar atau belum ada) */
  movers: (RankedPoint & { rankBefore: number | null })[];
}

const key = (lat: number, lng: number) => `${lat.toFixed(6)},${lng.toFixed(6)}`;

const toPoint = (c: TopsisCandidateResult, rank: number): RankedPoint => ({
  lat: c.lat, lng: c.lng, district: c.district, score: Math.round(c.score * 10000) / 10000,
  c1: c.c1_dist_competitor, c3: c.c3_dist_road, c4: c.c4_dist_crowd, rank,
});

/** Titik di zona terlarang tidak ikut peringkat */
export const eligible = (cands: TopsisCandidateResult[]) => cands.filter((c) => !c.isRestricted);

export function summarize(candidates: TopsisCandidateResult[]): RankingSummary {
  const list = eligible(candidates); // sudah terurut menurut skor
  const c1 = list.map((c) => c.c1_dist_competitor).sort((a, b) => a - b);
  const topDistricts: Record<string, number> = {};
  for (const c of list.slice(0, 50)) topDistricts[c.district] = (topDistricts[c.district] ?? 0) + 1;
  return {
    total: list.length,
    high: list.filter((c) => c.category === 'high').length,
    medium: list.filter((c) => c.category === 'medium').length,
    low: list.filter((c) => c.category === 'low').length,
    c1Median: c1.length ? c1[Math.floor(c1.length / 2)] : 0,
    top10: list.slice(0, 10).map((c, i) => toPoint(c, i + 1)),
    topDistricts,
    topScore: list[0] ? Math.round(list[0].score * 10000) / 10000 : 0,
  };
}

export function compareRankings(before: TopsisCandidateResult[] | null, after: TopsisCandidateResult[]): RankingDiff {
  const b = before ? eligible(before) : [];
  const a = eligible(after);
  const rankBefore = new Map(b.map((c, i) => [key(c.lat, c.lng), i + 1]));
  const top = (list: TopsisCandidateResult[], n: number) => new Set(list.slice(0, n).map((c) => key(c.lat, c.lng)));
  const b10 = top(b, 10), b50 = top(b, 50);
  return {
    overlapTop10: a.slice(0, 10).filter((c) => b10.has(key(c.lat, c.lng))).length,
    overlapTop50: a.slice(0, 50).filter((c) => b50.has(key(c.lat, c.lng))).length,
    movers: a.slice(0, 10).map((c, i) => ({ ...toPoint(c, i + 1), rankBefore: rankBefore.get(key(c.lat, c.lng)) ?? null })),
  };
}
