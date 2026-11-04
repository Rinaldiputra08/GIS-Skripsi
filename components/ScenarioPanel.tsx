'use client';

import React, { useState } from 'react';
import { Save, Trash2, Play, Download, Loader2, Bookmark } from 'lucide-react';
import type { AhpResult, TopsisCandidateResult } from '@/lib/types';
import { getOwnerId, downloadCsv } from '@/lib/client-storage';
import { summarize } from '@/lib/ranking-summary';
import { formatBusinessScore } from '@/lib/business-logic';
import { useLoad } from '@/lib/use-load';

interface Scenario { id: string; name: string; weights: number[]; pairs: Record<string, number> | null; cr: number | null; created_at: string }

interface Props {
  ahpResult: AhpResult;
  pairs: Record<string, number>;
  candidates: TopsisCandidateResult[];
  onLoadScenario: (pairs: Record<string, number>) => void;
}

const LABELS = ['C1', 'C2', 'C3', 'C4'];
const COLORS = ['#7c5cff', '#ff6b8b', '#1fa2b8', '#f2a93b'];

/** Simpan/muat skenario bobot AHP + ekspor peringkat ke CSV (tab Hasil) */
export const ScenarioPanel: React.FC<Props> = ({ ahpResult, pairs, candidates, onLoadScenario }) => {
  const loaded = useLoad(async () => {
    const res = await fetch(`/api/scenarios?ownerId=${getOwnerId()}`);
    return (await res.json()) as { scenarios?: Scenario[]; available?: boolean };
  });
  const list = loaded.data?.scenarios ?? [];
  const available = loaded.error ? false : loaded.data?.available !== false;
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ahpResult.isConsistent) return;
    setBusy(true); setError('');
    try {
      const s = summarize(candidates);
      const res = await fetch('/api/scenarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: getOwnerId(), name: name.trim(), weights: ahpResult.weightsArray, pairs, cr: ahpResult.cr,
          summary: { high: s.high, medium: s.medium, low: s.low, topScore: s.topScore, top5: s.top10.slice(0, 5) },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Gagal menyimpan.');
      setName('');
      loaded.reload();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    await fetch(`/api/scenarios?id=${id}&ownerId=${getOwnerId()}`, { method: 'DELETE' });
    loaded.reload();
  };

  const exportCsv = () => {
    const rows = candidates.filter((c) => !c.isRestricted).slice(0, 100).map((c) => ({
      rank: c.rank, district: c.district, lat: c.lat, lng: c.lng, vi: c.score.toFixed(4), skor: formatBusinessScore(c.score), kategori: c.category,
      c1: c.c1_dist_competitor, c2: c.c2_density, c3: c.c3_dist_road, c4: c.c4_dist_crowd,
      kompetitor: c.nearestCompetitorName, jalan: c.nearestRoadName, keramaian: c.nearestCrowdName,
    }));
    downloadCsv('rekomendasi-lokasi-kopi-bogor.csv', [
      { key: 'rank', label: 'Peringkat' }, { key: 'district', label: 'Kecamatan' }, { key: 'lat', label: 'Latitude' }, { key: 'lng', label: 'Longitude' },
      { key: 'vi', label: 'Skor Vi' }, { key: 'skor', label: 'Skor (0-100)' }, { key: 'kategori', label: 'Kategori' },
      { key: 'c1', label: 'C1 Jarak kompetitor (m)' }, { key: 'c2', label: 'C2 Kepadatan (jiwa/km2)' }, { key: 'c3', label: 'C3 Jarak jalan (m)' }, { key: 'c4', label: 'C4 Jarak keramaian (m)' },
      { key: 'kompetitor', label: 'Kompetitor terdekat' }, { key: 'jalan', label: 'Jalan terdekat' }, { key: 'keramaian', label: 'Keramaian terdekat' },
    ], rows);
  };

  return (
    <section className="space-y-3" aria-label="Skenario dan ekspor">
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold">Ekspor hasil</h3>
            <p className="text-xs text-ink-3">100 lokasi teratas beserta nilai tiap kriteria (CSV, bisa dibuka di Excel).</p>
          </div>
          <button type="button" onClick={exportCsv} className="btn btn-soft shrink-0 !px-4 !text-[13px]"><Download className="h-4 w-4" /> CSV</button>
        </div>
      </div>

      {available && (
        <div className="card p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Bookmark className="h-4 w-4" /> Skenario tersimpan</h3>
          <p className="mt-0.5 text-xs text-ink-3">Simpan pengaturan prioritas saat ini untuk dibandingkan nanti. Hanya terlihat di perangkat ini.</p>
          <form onSubmit={save} className="mt-3 flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="mis. Fokus dekat keramaian" aria-label="Nama skenario"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line-2 bg-paper px-3 text-sm outline-none focus:border-espresso focus:ring-2 focus:ring-lime" />
            <button type="submit" disabled={busy || !name.trim() || !ahpResult.isConsistent} className="btn btn-primary shrink-0 !px-4 !text-[13px]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
            </button>
          </form>
          {!ahpResult.isConsistent && <p className="mt-1.5 text-xs font-semibold text-bad">Perbaiki konsistensi AHP (CR ≤ 0,1) sebelum menyimpan.</p>}
          {error && <p role="alert" className="mt-1.5 text-xs font-semibold text-bad">{error}</p>}

          {list.length > 0 && (
            <ul className="mt-3 space-y-2">
              {list.map((s) => (
                <li key={s.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">{s.name}</p>
                    {s.pairs && (
                      <button type="button" onClick={() => onLoadScenario(s.pairs!)} title="Pakai skenario ini" aria-label={`Pakai skenario ${s.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-lime text-espresso hover:brightness-95"><Play className="h-4 w-4" /></button>
                    )}
                    <button type="button" onClick={() => remove(s.id)} aria-label={`Hapus skenario ${s.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-bad hover:bg-bad-bg"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-oat-2" aria-hidden>
                    {s.weights.map((w, i) => <div key={i} style={{ width: `${w * 100}%`, background: COLORS[i] }} />)}
                  </div>
                  <p className="tabular mt-1.5 text-[11px] text-ink-3">{s.weights.map((w, i) => `${LABELS[i]} ${Math.round(w * 100)}%`).join(' · ')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
