'use client';

import React, { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { adminFetch } from './api';
import { useLoad } from '@/lib/use-load';
import { Chip } from './ui';
import { RunResult } from './RunResult';
import type { RankingDiff, RankingSummary } from '@/lib/ranking-summary';

interface AuditRow { id: number; at: string; actor: string | null; action: string; entity: string; label: string | null; before: unknown; after: unknown; affects_grid: boolean }
interface RunRow {
  id: number; at: string; actor: string | null; cell_m: number; duration_ms: number; n_points: number; n_competitors: number | null;
  before: { summary: RankingSummary } | null; after: { summary: RankingSummary; diff: RankingDiff } | null;
}

const ENTITY: Record<string, string> = { competitors: 'Kompetitor', crowd_centers: 'Pusat keramaian', restricted_zones: 'Zona terlarang', population: 'Data penduduk', settings: 'Parameter', grid: 'Grid' };
const ACTION: Record<string, { label: string; tone: 'good' | 'info' | 'bad' | 'mid' }> = {
  create: { label: 'Tambah', tone: 'good' }, update: { label: 'Ubah', tone: 'info' }, delete: { label: 'Hapus', tone: 'bad' }, apply: { label: 'Terapkan', tone: 'mid' },
};
const dt = (s: string) => new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

function Json({ v }: { v: unknown }) {
  if (v === null || v === undefined) return <span className="text-ink-3">–</span>;
  return <pre className="max-h-48 overflow-auto rounded-xl bg-oat-2 p-3 font-mono text-[11px] leading-relaxed">{JSON.stringify(v, null, 2)}</pre>;
}

export function HistoryView() {
  const [tab, setTab] = useState<'audit' | 'runs'>('runs');
  const hist = useLoad(() => adminFetch<{ audit: AuditRow[]; runs: RunRow[] }>('/api/admin/history'));
  const audit = hist.data?.audit ?? [];
  const runs = hist.data?.runs ?? [];
  const loading = hist.loading;
  const error = hist.error;
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5" role="tablist">
        {([['runs', `Penerapan grid (${runs.length})`], ['audit', `Perubahan data (${audit.length})`]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setOpenId(null); }}
            className={`min-h-11 rounded-full px-5 text-sm font-bold ${tab === k ? 'bg-espresso text-lime' : 'bg-paper text-ink-2 hover:bg-oat-2'}`}>{l}</button>
        ))}
      </div>

      {loading && <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-ink-3" />}
      {error && <p role="alert" className="rounded-2xl bg-bad-bg p-4 text-sm font-semibold text-bad">{error}</p>}

      {!loading && tab === 'runs' && (
        <div className="space-y-3">
          {runs.length === 0 && <p className="card p-8 text-center text-sm text-ink-3">Belum ada penerapan. Gunakan tombol “Terapkan & bandingkan” di Dasbor setelah mengubah data.</p>}
          {runs.map((r) => (
            <div key={r.id} className="card overflow-hidden">
              <button onClick={() => setOpenId(openId === r.id ? null : r.id)} aria-expanded={openId === r.id} className="flex w-full items-center gap-3 p-4 text-left">
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{dt(r.at)}</p>
                  <p className="text-xs text-ink-3">{r.n_points.toLocaleString('id-ID')} titik · sel {r.cell_m} m · {r.n_competitors ?? '–'} kompetitor · {(r.duration_ms / 1000).toFixed(1)} dtk{r.actor ? ` · ${r.actor}` : ''}</p>
                </div>
                {r.after?.diff && r.before && <Chip tone="info">{r.after.diff.overlapTop10}/10 tetap</Chip>}
                <ChevronDown className={`h-5 w-5 shrink-0 text-ink-3 transition-transform ${openId === r.id ? 'rotate-180' : ''}`} />
              </button>
              {openId === r.id && r.after && (
                <div className="border-t border-line p-4 sm:p-5">
                  <RunResult before={r.before?.summary ?? null} after={r.after.summary} diff={r.after.diff ?? null} nCompetitors={r.n_competitors} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'audit' && (
        <div className="card divide-y divide-line overflow-hidden">
          {audit.length === 0 && <p className="p-8 text-center text-sm text-ink-3">Belum ada perubahan tercatat.</p>}
          {audit.map((a) => {
            const act = ACTION[a.action] ?? { label: a.action, tone: 'info' as const };
            const open = openId === a.id;
            return (
              <div key={a.id}>
                <button onClick={() => setOpenId(open ? null : a.id)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-oat/60">
                  <Chip tone={act.tone}>{act.label}</Chip>
                  <span className="text-sm font-bold">{ENTITY[a.entity] ?? a.entity}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{a.label}</span>
                  <span className="tabular text-xs text-ink-3">{dt(a.at)}</span>
                </button>
                {open && (
                  <div className="grid gap-3 bg-oat/50 px-4 pb-4 pt-1 md:grid-cols-2">
                    <div><p className="mb-1 text-xs font-bold uppercase text-ink-3">Sebelum</p><Json v={a.before} /></div>
                    <div><p className="mb-1 text-xs font-bold uppercase text-ink-3">Sesudah</p><Json v={a.after} /></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
