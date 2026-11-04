'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Sparkles, Minus } from 'lucide-react';
import type { RankingDiff, RankingSummary } from '@/lib/ranking-summary';

interface Props {
  before: RankingSummary | null;
  after: RankingSummary;
  diff: RankingDiff | null;
  nCompetitors?: number | null;
  prevCompetitors?: number | null;
}

const fmt = (n: number) => n.toLocaleString('id-ID');

function Delta({ a, b, invert }: { a: number | null; b: number; invert?: boolean }) {
  if (a === null || a === b) return <Minus className="inline h-3.5 w-3.5 text-ink-3" aria-label="tetap" />;
  const up = b > a;
  const good = invert ? !up : up;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold ${good ? 'text-good' : 'text-bad'}`}>
      {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}{fmt(Math.abs(b - a))}
    </span>
  );
}

export function RunResult({ before, after, diff, nCompetitors, prevCompetitors }: Props) {
  const rows: { label: string; a: number | null; b: number; unit?: string; note?: string }[] = [
    ...(nCompetitors != null ? [{ label: 'Kompetitor dalam kota', a: prevCompetitors ?? null, b: nCompetitors }] : []),
    { label: 'Titik kandidat', a: before?.total ?? null, b: after.total },
    { label: 'Potensi tinggi', a: before?.high ?? null, b: after.high },
    { label: 'Potensi sedang', a: before?.medium ?? null, b: after.medium },
    { label: 'Potensi rendah', a: before?.low ?? null, b: after.low },
    { label: 'Median jarak ke kompetitor (C1)', a: before?.c1Median ?? null, b: after.c1Median, unit: ' m' },
  ];
  const districts = Array.from(new Set([...Object.keys(before?.topDistricts ?? {}), ...Object.keys(after.topDistricts)])).sort(
    (x, y) => (after.topDistricts[y] ?? 0) - (after.topDistricts[x] ?? 0)
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Ringkasan */}
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-oat-2/60 text-xs font-bold uppercase tracking-wide text-ink-3">
              <tr><th className="px-4 py-2.5 text-left">Ringkasan</th><th className="px-3 py-2.5 text-right">Sebelum</th><th className="px-3 py-2.5 text-right">Sesudah</th><th className="px-3 py-2.5 text-right">Selisih</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="px-4 py-2.5 font-semibold">{r.label}</td>
                  <td className="tabular px-3 py-2.5 text-right text-ink-3">{r.a === null ? '–' : fmt(r.a) + (r.unit ?? '')}</td>
                  <td className="tabular px-3 py-2.5 text-right font-extrabold">{fmt(r.b)}{r.unit ?? ''}</td>
                  <td className="px-3 py-2.5 text-right"><Delta a={r.a} b={r.b} invert={r.label.includes('rendah')} /></td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2.5 font-semibold">Skor tertinggi (Vi)</td>
                <td className="tabular px-3 py-2.5 text-right text-ink-3">{before ? before.topScore.toFixed(4) : '–'}</td>
                <td className="tabular px-3 py-2.5 text-right font-extrabold">{after.topScore.toFixed(4)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Kestabilan + sebaran */}
        <div className="space-y-4">
          {diff && before && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-lime-2/60 p-4"><p className="tabular text-3xl font-extrabold">{diff.overlapTop10}<span className="text-lg text-ink-3">/10</span></p><p className="mt-0.5 text-xs font-semibold text-ink-2">titik 10 besar tetap sama</p></div>
              <div className="rounded-2xl bg-lime-2/60 p-4"><p className="tabular text-3xl font-extrabold">{diff.overlapTop50}<span className="text-lg text-ink-3">/50</span></p><p className="mt-0.5 text-xs font-semibold text-ink-2">titik 50 besar tetap sama</p></div>
            </div>
          )}
          <div className="rounded-2xl border border-line p-4">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-3">Sebaran 50 titik teratas per kecamatan</p>
            <ul className="space-y-1.5">
              {districts.map((d) => {
                const a = before?.topDistricts[d] ?? 0, b = after.topDistricts[d] ?? 0;
                return (
                  <li key={d} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 font-semibold">{d}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-oat-2"><div className="h-full rounded-full bg-espresso" style={{ width: `${(b / 50) * 100}%` }} /></div>
                    <span className="tabular w-16 shrink-0 text-right text-xs text-ink-3">{before ? `${a} → ` : ''}<b className="text-ink">{b}</b></span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* 10 besar */}
      {diff && (
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="border-b border-line bg-oat-2/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-3">10 lokasi teratas sesudah perubahan (bobot sama rata)</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-xs font-bold text-ink-3"><tr><th className="px-4 py-2 text-left">#</th><th className="px-3 py-2 text-left">Kecamatan</th><th className="px-3 py-2 text-right">Vi</th><th className="px-3 py-2 text-right">C1</th><th className="px-3 py-2 text-right">C3</th><th className="px-3 py-2 text-right">C4</th><th className="px-4 py-2 text-right">Peringkat lama</th></tr></thead>
              <tbody className="divide-y divide-line">
                {diff.movers.map((m) => (
                  <tr key={m.rank}>
                    <td className="tabular px-4 py-2 font-extrabold">{m.rank}</td>
                    <td className="px-3 py-2">{m.district}</td>
                    <td className="tabular px-3 py-2 text-right font-semibold">{m.score.toFixed(4)}</td>
                    <td className="tabular px-3 py-2 text-right text-ink-2">{fmt(m.c1)} m</td>
                    <td className="tabular px-3 py-2 text-right text-ink-2">{fmt(m.c3)} m</td>
                    <td className="tabular px-3 py-2 text-right text-ink-2">{fmt(m.c4)} m</td>
                    <td className="px-4 py-2 text-right">
                      {m.rankBefore === null ? (
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-info"><Sparkles className="h-3.5 w-3.5" />{before ? 'baru' : '–'}</span>
                      ) : m.rankBefore === m.rank ? (
                        <span className="tabular text-xs font-semibold text-ink-3">#{m.rankBefore} (tetap)</span>
                      ) : (
                        <span className={`tabular inline-flex items-center gap-0.5 text-xs font-extrabold ${m.rankBefore > m.rank ? 'text-good' : 'text-bad'}`}>
                          {m.rankBefore > m.rank ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}#{m.rankBefore}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
