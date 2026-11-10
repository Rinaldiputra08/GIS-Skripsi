'use client';

import React from 'react';
import { X, Trophy, Check } from 'lucide-react';
import type { SurveyPointEvaluation } from '@/lib/types';
import { c1Effective, getSettings } from '@/lib/settings';
import { formatBusinessScore } from '@/lib/business-logic';

export interface CompareItem {
  id: string;
  name: string;
  evaluation: SurveyPointEvaluation;
}

interface Props {
  items: CompareItem[];
  onClose: () => void;
}

const CAT: Record<string, { l: string; cls: string }> = {
  high: { l: 'Tinggi', cls: 'bg-good-bg text-good' }, medium: { l: 'Sedang', cls: 'bg-mid-bg text-mid' }, low: { l: 'Rendah', cls: 'bg-bad-bg text-bad' },
  restricted: { l: 'Terlarang', cls: 'bg-bad-bg text-bad' }, outside: { l: 'Luar kota', cls: 'bg-oat-2 text-ink-2' },
};

type Row = {
  label: string;
  hint: string;
  /** nilai untuk menentukan yang terbaik (makin besar makin baik) */
  rankValue: (e: SurveyPointEvaluation) => number;
  show: (e: SurveyPointEvaluation) => string;
};

/**
 * Tabel perbandingan 2–3 lokasi tersimpan. Semua skor dihitung ulang dengan prioritas (bobot AHP)
 * yang sedang aktif, jadi bisa dibandingkan secara adil. Nilai terbaik tiap baris ditandai hijau.
 */
export const SurveyCompare: React.FC<Props> = ({ items, onClose }) => {
  const cap = getSettings().c1Cap;
  const rows: Row[] = [
    {
      label: 'Skor potensi',
      hint: 'dengan prioritas saat ini',
      rankValue: (e) => (e.isRestricted ? -1 : e.score),
      show: (e) => `${formatBusinessScore(e.score)}`,
    },
    {
      label: 'Jarak kompetitor',
      hint: cap > 0 ? `makin jauh makin baik (≥ ${cap} m sama baik)` : 'makin jauh makin baik',
      rankValue: (e) => c1Effective(e.c1_dist_competitor),
      show: (e) => `${Math.round(e.c1_dist_competitor).toLocaleString('id-ID')} m`,
    },
    {
      label: 'Kepadatan penduduk',
      hint: 'makin padat makin baik',
      rankValue: (e) => e.c2_density,
      show: (e) => `${Math.round(e.c2_density).toLocaleString('id-ID')} /km²`,
    },
    {
      label: 'Jarak jalan utama',
      hint: 'makin dekat makin baik',
      rankValue: (e) => -e.c3_dist_road,
      show: (e) => `${Math.round(e.c3_dist_road).toLocaleString('id-ID')} m`,
    },
    {
      label: 'Jarak keramaian',
      hint: 'makin dekat makin baik',
      rankValue: (e) => -e.c4_dist_crowd,
      show: (e) => `${Math.round(e.c4_dist_crowd).toLocaleString('id-ID')} m`,
    },
  ];

  const bestOf = (row: Row) => Math.max(...items.map((it) => row.rankValue(it.evaluation)));
  // Berapa kriteria (C1..C4) yang dimenangkan tiap lokasi
  const wins = items.map((it) => rows.slice(1).filter((r) => r.rankValue(it.evaluation) === bestOf(r)).length);
  const eligible = items.filter((it) => !it.evaluation.isRestricted);
  const winner = eligible.length ? eligible.reduce((a, b) => (b.evaluation.score > a.evaluation.score ? b : a)) : null;

  return (
    <div className="card animate-in overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-sm font-extrabold">Perbandingan {items.length} lokasi</h3>
        <button type="button" onClick={onClose} aria-label="Tutup perbandingan" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-oat-2">
          <X className="h-4 w-4" />
        </button>
      </div>

      {winner && (
        <p className="flex items-start gap-2 bg-good-bg px-4 py-3 text-sm text-good">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>{winner.name}</b> paling unggul secara keseluruhan (skor {formatBusinessScore(winner.evaluation.score)}).
          </span>
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[340px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-line bg-oat-2/60">
              <th className="w-[34%] px-3 py-2.5 text-left text-xs font-bold text-ink-3">Kriteria</th>
              {items.map((it) => (
                <th key={it.id} className="px-2 py-2.5 text-left align-top">
                  <span className="line-clamp-2 text-xs font-extrabold text-ink" title={it.name}>{it.name}</span>
                  {CAT[it.evaluation.category] && (
                    <span className={`chip mt-1 !text-[10px] ${CAT[it.evaluation.category].cls}`}>{CAT[it.evaluation.category].l}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, ri) => {
              const best = bestOf(row);
              const allSame = items.every((it) => row.rankValue(it.evaluation) === best);
              return (
                <tr key={row.label}>
                  <th scope="row" className="px-3 py-2.5 text-left align-top">
                    <span className="block text-xs font-bold text-ink">{row.label}</span>
                    <span className="block text-[10px] font-medium leading-tight text-ink-3">{row.hint}</span>
                  </th>
                  {items.map((it) => {
                    const isBest = !allSame && row.rankValue(it.evaluation) === best;
                    return (
                      <td key={it.id} className={`px-2 py-2.5 align-top ${isBest ? 'bg-good-bg' : ''}`}>
                        <span className={`tabular flex items-center gap-1 font-mono font-bold ${ri === 0 ? 'text-lg' : 'text-[13px]'} ${isBest ? 'text-good' : 'text-ink'}`}>
                          {row.show(it.evaluation)}
                          {isBest && <Check className="h-3.5 w-3.5 shrink-0" aria-label="terbaik" />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr>
              <th scope="row" className="px-3 py-2.5 text-left text-xs font-bold text-ink">Unggul di</th>
              {items.map((it, i) => (
                <td key={it.id} className="px-2 py-2.5 text-xs font-semibold text-ink-2">{wins[i]} dari 4 kriteria</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="border-t border-line px-4 py-3 text-[11px] leading-snug text-ink-3">
        Skor dihitung ulang dengan prioritas yang sedang aktif. Ubah prioritas di tab Prioritas, dan perbandingan ikut berubah.
        {items.some((it) => it.evaluation.isRestricted) && ' Lokasi di zona terlarang tidak bisa menjadi yang unggul.'}
      </p>
    </div>
  );
};
