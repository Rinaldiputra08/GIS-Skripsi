'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Check, Info } from 'lucide-react';
import { adminFetch, notifyChanged } from './api';
import { useLoad } from '@/lib/use-load';

interface PopRow { id: number; bps_nama_kecamatan: string; jumlah_penduduk: number; tahun: number }
interface DistrictRow { name: string; population: number; area_km2: number; density: number; population_year: number }

export function PopulationEditor() {
  const loaded = useLoad(() => adminFetch<{ rows: PopRow[]; districts: DistrictRow[] }>('/api/admin/population'));
  const rows = useMemo(() => loaded.data?.rows ?? [], [loaded.data]);
  const districts = loaded.data?.districts ?? [];
  const [yearEdit, setYearEdit] = useState<number | null>(null);      // tahun yang dipilih pengguna
  const [edits, setEdits] = useState<Record<string, string>>({});     // hanya angka yang diketik
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [msg, setMsg] = useState('');
  const error = saveError || loaded.error;
  const loading = loaded.loading;

  const latest = useMemo(() => rows.reduce((m, r) => Math.max(m, r.tahun), 0), [rows]);
  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.tahun))).sort((a, b) => b - a), [rows]);
  const year = yearEdit ?? latest;

  // Nilai dasar: data tahun terpilih, atau data tahun terbaru bila tahun baru
  const base = useMemo(() => {
    const src = rows.filter((r) => r.tahun === year);
    return Object.fromEntries((src.length ? src : rows.filter((r) => r.tahun === latest)).map((r) => [r.bps_nama_kecamatan, String(r.jumlah_penduduk)]));
  }, [rows, year, latest]);
  const vals: Record<string, string> = { ...base, ...edits };
  const pickYear = (y: number) => { setYearEdit(y); setEdits({}); };

  const isNewYear = year > 0 && !years.includes(year);
  const dens = (name: string) => districts.find((d) => d.name.toUpperCase().replace('SEREAL', 'SAREAL') === name.toUpperCase().replace('SEREAL', 'SAREAL'));

  const save = async () => {
    setBusy(true); setSaveError(''); setMsg('');
    try {
      await adminFetch('/api/admin/population', { method: 'PUT', json: { year, values: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, Number(v)])) } });
      setMsg(isNewYear ? `Data tahun ${year} dibuat dan kini dipakai aplikasi.` : `Data tahun ${year} diperbarui.`);
      notifyChanged();
      setEdits({});
      setYearEdit(year);
      loaded.reload();
    } catch (e) { setSaveError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (loading) return <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-ink-3" />;

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Tahun data</span>
            <input type="number" min={2000} max={2100} value={year || ''} onChange={(e) => pickYear(Number(e.target.value))}
              className="h-12 w-32 rounded-xl border border-line-2 bg-paper px-4 text-base font-bold tabular outline-none focus:border-espresso focus:ring-2 focus:ring-lime" />
          </label>
          <div className="flex flex-wrap gap-1.5 pb-1">
            {years.slice(0, 6).map((y) => (
              <button key={y} onClick={() => pickYear(y)} aria-pressed={year === y}
                className={`min-h-9 rounded-full px-3.5 text-xs font-bold ${year === y ? 'bg-espresso text-lime' : 'bg-oat-2 text-ink-2 hover:bg-line'}`}>{y}{y === latest ? ' · dipakai' : ''}</button>
            ))}
          </div>
        </div>
        {isNewYear && <p className="mt-3 rounded-xl bg-mid-bg px-3.5 py-2.5 text-sm font-semibold text-mid">Tahun {year} belum ada. Menyimpan akan membuat data tahun baru dan menjadikannya acuan aplikasi (tahun terbaru selalu dipakai).</p>}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b border-line bg-oat-2/60 text-xs font-bold uppercase tracking-wide text-ink-3">
              <tr><th className="px-4 py-3 text-left">Kecamatan</th><th className="px-4 py-3 text-right">Jumlah penduduk</th><th className="px-4 py-3 text-right">Luas</th><th className="px-4 py-3 text-right">Kepadatan (C2)</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Object.keys(vals).sort().map((name) => {
                const d = dens(name);
                const n = Number(vals[name]);
                const density = d && n > 0 ? Math.round(n / d.area_km2) : null;
                return (
                  <tr key={name}>
                    <td className="px-4 py-2.5 font-bold">{name.split(' ').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ')}</td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" inputMode="numeric" aria-label={`Penduduk ${name}`} value={vals[name]} onChange={(e) => setEdits((v) => ({ ...v, [name]: e.target.value }))}
                        className="h-11 w-36 rounded-xl border border-line-2 bg-paper px-3 text-right text-base font-bold tabular outline-none focus:border-espresso focus:ring-2 focus:ring-lime" />
                    </td>
                    <td className="tabular px-4 py-2.5 text-right text-ink-2">{d ? `${d.area_km2.toLocaleString('id-ID')} km²` : '–'}</td>
                    <td className="tabular px-4 py-2.5 text-right font-bold">{density ? `${density.toLocaleString('id-ID')} /km²` : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl bg-info-bg p-3.5 text-sm text-info">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Kepadatan dihitung dari jumlah penduduk ÷ luas poligon kecamatan. Setelah menyimpan, terapkan perubahan di Dasbor agar nilai C2 pada grid ikut diperbarui.</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-bad-bg px-3.5 py-3 text-sm font-semibold text-bad">{error}</p>}
      {msg && <p role="status" className="flex items-center gap-2 rounded-xl bg-good-bg px-3.5 py-3 text-sm font-semibold text-good"><Check className="h-4 w-4" />{msg}</p>}
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={save} disabled={busy || !year}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan data penduduk</button>
      </div>
    </div>
  );
}
