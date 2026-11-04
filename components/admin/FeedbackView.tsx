'use client';

import React, { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { adminFetch } from './api';
import { useLoad } from '@/lib/use-load';
import { Chip } from './ui';

interface Scenario { id: string; name: string; weights: number[]; cr: number | null; created_at: string }
interface Survey { id: string; name: string | null; note: string | null; latitude: number; longitude: number; district: string | null; score: number | null; category: string | null; rank_estimate: number | null; total_candidates: number | null; created_at: string }

const dt = (s: string) => new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const CAT: Record<string, { l: string; t: 'good' | 'mid' | 'bad' | 'neutral' }> = {
  high: { l: 'Tinggi', t: 'good' }, medium: { l: 'Sedang', t: 'mid' }, low: { l: 'Rendah', t: 'bad' },
  restricted: { l: 'Terlarang', t: 'bad' }, outside: { l: 'Di luar kota', t: 'neutral' },
};

export function FeedbackView() {
  const feedback = useLoad(() => adminFetch<{ scenarios: Scenario[]; surveys: Survey[] }>('/api/admin/feedback'));
  const [actionError, setActionError] = useState('');
  const sc = feedback.data?.scenarios ?? [];
  const sv = feedback.data?.surveys ?? [];
  const loading = feedback.loading;
  const error = actionError || feedback.error;

  const del = async (type: 'scenario' | 'survey', id: string) => {
    if (!confirm('Hapus catatan ini?')) return;
    try { await adminFetch(`/api/admin/feedback?type=${type}&id=${id}`, { method: 'DELETE' }); setActionError(''); feedback.reload(); }
    catch (e) { setActionError((e as Error).message); }
  };

  if (loading) return <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-ink-3" />;
  return (
    <div className="space-y-8">
      {error && <p role="alert" className="rounded-2xl bg-bad-bg p-4 text-sm font-semibold text-bad">{error}</p>}

      <section aria-labelledby="sc-h">
        <h2 id="sc-h" className="mb-3 text-lg font-extrabold">Skenario analisis ({sc.length})</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line bg-oat-2/60 text-xs font-bold uppercase tracking-wide text-ink-3"><tr><th className="px-4 py-3 text-left">Nama</th><th className="px-4 py-3 text-left">Bobot C1 · C2 · C3 · C4</th><th className="px-4 py-3 text-left">Waktu</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {sc.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-3">Belum ada skenario tersimpan.</td></tr>}
              {sc.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5 font-bold">{s.name}</td>
                  <td className="tabular px-4 py-2.5 text-ink-2">{s.weights.map((w) => (w * 100).toFixed(0) + '%').join(' · ')}</td>
                  <td className="tabular px-4 py-2.5 text-xs text-ink-3">{dt(s.created_at)}</td>
                  <td className="px-2 text-right"><button onClick={() => del('scenario', s.id)} aria-label={`Hapus ${s.name}`} className="flex h-10 w-10 items-center justify-center rounded-full text-bad hover:bg-bad-bg"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="sv-h">
        <h2 id="sv-h" className="mb-3 text-lg font-extrabold">Riwayat survei lokasi ({sv.length})</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-oat-2/60 text-xs font-bold uppercase tracking-wide text-ink-3"><tr><th className="px-4 py-3 text-left">Lokasi</th><th className="px-4 py-3 text-left">Kecamatan</th><th className="px-4 py-3 text-right">Skor</th><th className="px-4 py-3 text-left">Kategori</th><th className="px-4 py-3 text-left">Waktu</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {sv.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-3">Belum ada survei tersimpan.</td></tr>}
              {sv.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5"><p className="font-bold">{s.name || 'Tanpa nama'}</p><p className="tabular text-xs text-ink-3">{s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}</p>{s.note && <p className="mt-0.5 text-xs text-ink-2">{s.note}</p>}</td>
                  <td className="px-4 py-2.5 text-ink-2">{s.district ?? '–'}</td>
                  <td className="tabular px-4 py-2.5 text-right font-bold">{s.score != null ? Math.round(s.score * 100) : '–'}</td>
                  <td className="px-4 py-2.5">{s.category && CAT[s.category] ? <Chip tone={CAT[s.category].t}>{CAT[s.category].l}</Chip> : '–'}</td>
                  <td className="tabular px-4 py-2.5 text-xs text-ink-3">{dt(s.created_at)}</td>
                  <td className="px-2 text-right"><button onClick={() => del('survey', s.id)} aria-label="Hapus survei" className="flex h-10 w-10 items-center justify-center rounded-full text-bad hover:bg-bad-bg"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
