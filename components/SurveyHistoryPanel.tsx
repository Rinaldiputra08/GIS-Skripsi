'use client';

import React, { useMemo, useState } from 'react';
import { Save, Trash2, Download, Loader2, History, Eye, Check, Columns3 } from 'lucide-react';
import type { SurveyPointEvaluation } from '@/lib/types';
import { getOwnerId, downloadCsv } from '@/lib/client-storage';
import { useLoad } from '@/lib/use-load';
import { SurveyCompare, type CompareItem } from './SurveyCompare';

interface Log {
  id: string; name: string | null; note: string | null; latitude: number; longitude: number; district: string | null;
  score: number | null; category: string | null; rank_estimate: number | null; total_candidates: number | null;
  criteria: { c1: number; c2: number; c3: number; c4: number } | null; created_at: string;
}

export type SavedEvaluator = (
  lat: number,
  lng: number,
  criteria: { c1: number; c2: number; c3: number; c4: number },
  district: string | null
) => SurveyPointEvaluation;

interface Props {
  survey: SurveyPointEvaluation | null;
  weights: [number, number, number, number];
  onReview: (lat: number, lng: number) => void;
  /** Saran nama lokasi (mis. dari hasil pencarian alamat) */
  suggestedName?: string;
  /** Menilai ulang lokasi tersimpan dengan bobot saat ini; tanpa ini fitur perbandingan disembunyikan */
  evaluate?: SavedEvaluator;
  /** Status perbandingan disimpan oleh induk agar tidak hilang saat pindah tab */
  compare?: CompareState;
  onCompareChange?: (next: CompareState) => void;
}

export interface CompareState { picked: string[]; open: boolean }

const MAX_COMPARE = 3;

const CAT: Record<string, { l: string; cls: string }> = {
  high: { l: 'Tinggi', cls: 'bg-good-bg text-good' }, medium: { l: 'Sedang', cls: 'bg-mid-bg text-mid' }, low: { l: 'Rendah', cls: 'bg-bad-bg text-bad' },
  restricted: { l: 'Terlarang', cls: 'bg-bad-bg text-bad' }, outside: { l: 'Luar kota', cls: 'bg-oat-2 text-ink-2' },
};

/** Simpan hasil survei lokasi ke riwayat (per perangkat) + ekspor CSV (tab Survei) */
export const SurveyHistoryPanel: React.FC<Props> = ({ survey, weights, onReview, suggestedName = '', evaluate, compare, onCompareChange }) => {
  const loaded = useLoad(async () => {
    const res = await fetch(`/api/survey-logs?ownerId=${getOwnerId()}`);
    return (await res.json()) as { logs?: Log[]; available?: boolean };
  });
  const logs = useMemo(() => loaded.data?.logs ?? [], [loaded.data]);
  const available = loaded.error ? false : loaded.data?.available !== false;
  const canSave = survey && survey.isInsideBogor;

  // Perbandingan: pilih 2–3 lokasi tersimpan
  const [localCompare, setLocalCompare] = useState<CompareState>({ picked: [], open: false });
  const cmp = compare ?? localCompare;
  const setCmp = (fn: (c: CompareState) => CompareState) => {
    const next = fn(cmp);
    if (onCompareChange) onCompareChange(next); else setLocalCompare(next);
  };
  const picked = cmp.picked;
  const comparing = cmp.open;
  const setPicked = (fn: (p: string[]) => string[]) =>
    setCmp((c) => { const p = fn(c.picked); return { picked: p, open: c.open && p.length >= 2 }; });
  const setComparing = (open: boolean) => setCmp((c) => ({ ...c, open }));
  const comparable = (l: Log) => !!l.criteria && l.category !== 'outside';
  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX_COMPARE ? [...p, id] : p));
  const compareItems: CompareItem[] = useMemo(() => {
    if (!comparing || !evaluate) return [];
    return picked
      .map((id) => logs.find((l) => l.id === id))
      .filter((l): l is Log => !!l && comparable(l))
      .map((l) => ({
        id: l.id,
        name: l.name || `${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}`,
        evaluation: evaluate(l.latitude, l.longitude, l.criteria!, l.district),
      }));
  }, [comparing, evaluate, picked, logs]);

  const remove = async (id: string) => {
    await fetch(`/api/survey-logs?id=${id}&ownerId=${getOwnerId()}`, { method: 'DELETE' });
    setPicked((p) => p.filter((x) => x !== id));
    loaded.reload();
  };

  const exportCsv = () =>
    downloadCsv('riwayat-survei-lokasi.csv', [
      { key: 'name', label: 'Nama' }, { key: 'note', label: 'Catatan' }, { key: 'lat', label: 'Latitude' }, { key: 'lng', label: 'Longitude' },
      { key: 'district', label: 'Kecamatan' }, { key: 'score', label: 'Skor (0-100)' }, { key: 'category', label: 'Kategori' }, { key: 'rank', label: 'Peringkat' },
      { key: 'c1', label: 'C1 (m)' }, { key: 'c2', label: 'C2 (jiwa/km2)' }, { key: 'c3', label: 'C3 (m)' }, { key: 'c4', label: 'C4 (m)' }, { key: 'at', label: 'Waktu' },
    ], logs.map((l) => ({
      name: l.name, note: l.note, lat: l.latitude, lng: l.longitude, district: l.district, score: l.score != null ? Math.round(l.score * 100) : '',
      category: l.category, rank: l.rank_estimate ? `${l.rank_estimate}/${l.total_candidates}` : '', c1: l.criteria?.c1, c2: l.criteria?.c2, c3: l.criteria?.c3, c4: l.criteria?.c4,
      at: new Date(l.created_at).toLocaleString('id-ID'),
    })));

  if (!available) return null;

  return (
    <section className="space-y-3" aria-label="Riwayat survei">
      {canSave && <SaveForm key={`${survey.id}-${suggestedName}`} survey={survey} weights={weights} defaultName={suggestedName} onSaved={loaded.reload} />}

      {comparing && compareItems.length >= 2 && <SurveyCompare items={compareItems} onClose={() => setComparing(false)} />}

      {logs.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><History className="h-4 w-4" /> Riwayat survei ({logs.length})</h3>
            <button type="button" onClick={exportCsv} className="btn btn-soft !min-h-9 !px-3.5 !text-xs"><Download className="h-3.5 w-3.5" /> CSV</button>
          </div>
          {evaluate && logs.filter(comparable).length >= 2 && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-oat-2 px-3 py-2">
              <p className="text-xs text-ink-2">
                {picked.length < 2 ? `Centang 2–${MAX_COMPARE} lokasi untuk dibandingkan.` : `${picked.length} lokasi dipilih.`}
              </p>
              <button
                type="button"
                disabled={picked.length < 2}
                onClick={() => setComparing(true)}
                className="btn btn-primary shrink-0 !min-h-9 !px-3.5 !text-xs"
              >
                <Columns3 className="h-3.5 w-3.5" /> Bandingkan
              </button>
            </div>
          )}
          <ul className="mt-3 space-y-2">
            {logs.map((l) => {
              const c = l.category ? CAT[l.category] : null;
              const isPicked = picked.includes(l.id);
              const canPick = evaluate && comparable(l);
              return (
                <li key={l.id} className={`flex items-center gap-2 rounded-xl border p-3 ${isPicked ? 'border-espresso bg-oat' : 'border-line'}`}>
                  {canPick && (
                    <input
                      type="checkbox"
                      checked={isPicked}
                      disabled={!isPicked && picked.length >= MAX_COMPARE}
                      onChange={() => togglePick(l.id)}
                      aria-label={`Pilih ${l.name || 'lokasi ini'} untuk dibandingkan`}
                      className="h-5 w-5 shrink-0 cursor-pointer accent-espresso disabled:cursor-not-allowed"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{l.name || `${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}`}</p>
                    <p className="truncate text-xs text-ink-3">{l.district ?? '–'} · {new Date(l.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  {l.score != null && <span className="tabular text-lg font-extrabold">{Math.round(l.score * 100)}</span>}
                  {c && <span className={`chip ${c.cls}`}>{c.l}</span>}
                  <button type="button" onClick={() => onReview(l.latitude, l.longitude)} aria-label="Lihat kembali di peta" title="Evaluasi ulang dengan prioritas saat ini" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-oat-2"><Eye className="h-4 w-4" /></button>
                  <button type="button" onClick={() => remove(l.id)} aria-label="Hapus dari riwayat" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-bad hover:bg-bad-bg"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

/** Formulir simpan: `key` = id survei, sehingga isian otomatis kosong untuk titik survei baru */
const SaveForm: React.FC<{ survey: SurveyPointEvaluation; weights: [number, number, number, number]; defaultName?: string; onSaved: () => void }> = ({ survey, weights, defaultName = '', onSaved }) => {
  const [name, setName] = useState(defaultName);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/survey-logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: getOwnerId(), name, note, latitude: survey.lat, longitude: survey.lng, district: survey.districtName,
          score: survey.score, category: survey.category, rankEstimate: survey.rankEstimate, totalCandidates: survey.totalCandidates,
          criteria: { c1: survey.c1_dist_competitor, c2: survey.c2_density, c3: survey.c3_dist_road, c4: survey.c4_dist_crowd },
          weights,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Gagal menyimpan.');
      setSaved(true);
      onSaved();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="card p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Save className="h-4 w-4" /> Simpan hasil survei ini</h3>
      {saved ? (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-good"><Check className="h-4 w-4" /> Tersimpan di riwayat.</p>
      ) : (
        <>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nama lokasi (mis. Ruko Jl. Pajajaran)" aria-label="Nama lokasi"
            className="mt-2.5 h-11 w-full rounded-xl border border-line-2 bg-paper px-3 text-sm outline-none focus:border-espresso focus:ring-2 focus:ring-lime" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} rows={2} placeholder="Catatan (opsional): sewa, kondisi bangunan, dll." aria-label="Catatan"
            className="mt-2 w-full rounded-xl border border-line-2 bg-paper px-3 py-2 text-sm outline-none focus:border-espresso focus:ring-2 focus:ring-lime" />
          {error && <p role="alert" className="mt-1.5 text-xs font-semibold text-bad">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary mt-2.5 w-full !text-[13px]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan ke riwayat
          </button>
        </>
      )}
    </form>
  );
};
