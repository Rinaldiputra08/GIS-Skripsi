'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, CheckCircle2, Store, MapPinned, ShieldAlert, Grid3x3, Users, History } from 'lucide-react';
import { adminFetch, notifyChanged } from './api';
import { useLoad } from '@/lib/use-load';
import { PageHeader, StatCard } from './ui';
import { RunResult } from './RunResult';
import type { RankingDiff, RankingSummary } from '@/lib/ranking-summary';

interface Stats {
  cmsReady: boolean;
  competitors: { total: number; inCity: number | null; kaggle: number | null; osm: number | null; manual: number | null };
  crowd: { total: number | null; inCity: number | null };
  zones: number | null;
  gridPoints: number | null;
  populationYear: number | null;
  scenarios: number | null;
  surveys: number | null;
  lastRun: { at: string; n_points: number; duration_ms: number; n_competitors: number } | null;
  pending: number;
  pendingItems: { at: string; action: string; entity: string; label: string | null }[];
}
interface ApplyRes { durationMs: number; nPoints: number; nCompetitors: number; prevCompetitors: number | null; before: RankingSummary | null; after: RankingSummary; diff: RankingDiff }

const ENTITY: Record<string, string> = { competitors: 'Kompetitor', crowd_centers: 'Pusat keramaian', restricted_zones: 'Zona', population: 'Penduduk', settings: 'Parameter', grid: 'Grid' };
const ACTION: Record<string, string> = { create: 'ditambah', update: 'diubah', delete: 'dihapus', apply: 'diterapkan' };
const dt = (s: string) => new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export function Dashboard() {
  const stats = useLoad(() => adminFetch<Stats>('/api/admin/stats'));
  const s = stats.data;
  const error = stats.error;
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<ApplyRes | null>(null);
  const [applyError, setApplyError] = useState('');

  const apply = async () => {
    setApplying(true); setApplyError(''); setResult(null);
    try {
      const r = await adminFetch<ApplyRes>('/api/admin/apply', { method: 'POST' });
      setResult(r);
      notifyChanged();
      stats.reload();
    } catch (e) { setApplyError((e as Error).message); }
    finally { setApplying(false); }
  };

  return (
    <>
      <PageHeader title="Dasbor" desc="Ringkasan data yang menjadi dasar rekomendasi lokasi, dan tempat menerapkan perubahan ke peringkat." />
      {error && <div role="alert" className="rounded-2xl bg-bad-bg p-4 text-sm font-semibold text-bad">{error}</div>}
      {!s && !error && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink-3" /></div>}

      {s && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Kompetitor" value={s.competitors.inCity ?? s.competitors.total}
              sub={`Kaggle ${s.competitors.kaggle ?? 0} · OSM ${s.competitors.osm ?? 0} · Manual ${s.competitors.manual ?? 0}`} />
            <StatCard label="Pusat keramaian" value={s.crowd.inCity ?? s.crowd.total ?? '–'} sub="dalam batas kota" />
            <StatCard label="Zona terlarang" value={s.zones ?? '–'} sub={s.zones === null ? 'jalankan cms.sql' : 'lingkaran terlarang'} />
            <StatCard label="Titik grid" value={(s.gridPoints ?? 0).toLocaleString('id-ID')} sub={`penduduk BPS ${s.populationYear ?? '–'}`} />
          </div>

          {/* Terapkan perubahan */}
          <section className="card p-5 sm:p-6" aria-labelledby="apply-h">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 id="apply-h" className="text-lg font-extrabold">Terapkan perubahan ke peringkat</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">
                  Perubahan kompetitor, pusat keramaian, data penduduk, dan batas jarak baru memengaruhi peringkat setelah grid dihitung ulang
                  oleh PostGIS. Sistem lalu membandingkan peringkat sebelum dan sesudah (bobot sama rata).
                </p>
              </div>
              <button onClick={apply} disabled={applying || !s.cmsReady} className="btn btn-primary shrink-0">
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {applying ? 'Menghitung ulang…' : 'Terapkan & bandingkan'}
              </button>
            </div>

            <div className="mt-4">
              {s.pending > 0 ? (
                <div className="rounded-2xl bg-mid-bg p-4 text-sm text-mid">
                  <p className="font-extrabold">{s.pending} perubahan belum diterapkan</p>
                  <ul className="mt-2 space-y-1">
                    {s.pendingItems.map((p, i) => (
                      <li key={i} className="flex gap-2"><span className="tabular shrink-0 opacity-70">{dt(p.at)}</span><span className="min-w-0 truncate">{ENTITY[p.entity] ?? p.entity} {ACTION[p.action] ?? p.action}{p.label ? `: ${p.label}` : ''}</span></li>
                    ))}
                    {s.pending > s.pendingItems.length && <li className="opacity-70">…dan {s.pending - s.pendingItems.length} lainnya</li>}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm font-semibold text-good"><CheckCircle2 className="h-4 w-4" /> Peringkat sudah sesuai dengan data terbaru.</p>
              )}
              {s.lastRun && <p className="mt-2 text-xs text-ink-3">Terakhir diterapkan {dt(s.lastRun.at)} · {s.lastRun.n_points.toLocaleString('id-ID')} titik · {(s.lastRun.duration_ms / 1000).toFixed(1)} dtk</p>}
            </div>

            {applyError && <p role="alert" className="mt-4 rounded-xl bg-bad-bg px-3.5 py-3 text-sm font-semibold text-bad">{applyError}</p>}
            {result && (
              <div className="mt-5 border-t border-line pt-5">
                <p className="mb-4 flex items-center gap-2 text-sm font-extrabold text-good"><CheckCircle2 className="h-4 w-4" /> Selesai dalam {(result.durationMs / 1000).toFixed(1)} detik. Peta publik sudah memakai peringkat baru.</p>
                <RunResult before={result.before} after={result.after} diff={result.diff} nCompetitors={result.nCompetitors} prevCompetitors={result.prevCompetitors} />
              </div>
            )}
          </section>

          {/* Pintasan */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: '/admin/kompetitor', icon: Store, t: 'Kompetitor', d: 'Tambah kedai baru atau perbaiki lokasi' },
              { href: '/admin/keramaian', icon: MapPinned, t: 'Pusat keramaian', d: 'Mal, pasar, terminal, kampus' },
              { href: '/admin/zona', icon: ShieldAlert, t: 'Zona terlarang', d: 'Gambar area yang tak boleh direkomendasikan' },
              { href: '/admin/penduduk', icon: Users, t: 'Data penduduk', d: 'Perbarui angka BPS per kecamatan' },
              { href: '/admin/parameter', icon: Grid3x3, t: 'Parameter sistem', d: 'Ambang kategori, ukuran grid, batas jarak' },
              { href: '/admin/riwayat', icon: History, t: 'Riwayat', d: 'Jejak perubahan & perbandingan ranking' },
            ].map(({ href, icon: Icon, t, d }) => (
              <Link key={href} href={href} className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-float)]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime-2 text-espresso"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block font-extrabold">{t}</span><span className="block text-xs text-ink-3">{d}</span></span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
