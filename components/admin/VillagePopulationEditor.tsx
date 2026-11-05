'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Check, Info } from 'lucide-react';
import { adminFetch, notifyChanged } from './api';
import { useLoad } from '@/lib/use-load';

interface VillageRow {
  code: string;
  name: string;
  district_name: string;
  population: number;
  population_period: string | null;
  population_source: string | null;
  official_area_km2: number | null;
  area_km2: number | null;
  density: number | null;
}

/** Penduduk per kelurahan: sumber nilai C2 (kepadatan) pada grid */
export function VillagePopulationEditor() {
  const loaded = useLoad(() => adminFetch<{ available: boolean; rows: VillageRow[] }>('/api/admin/villages'));
  const rows = useMemo(() => loaded.data?.rows ?? [], [loaded.data]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [periodEdit, setPeriodEdit] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [msg, setMsg] = useState('');

  const currentPeriod = rows[0]?.population_period ?? '';
  const period = periodEdit ?? currentPeriod;
  const source = rows[0]?.population_source ?? '';
  const districts = useMemo(() => Array.from(new Set(rows.map((r) => r.district_name))).sort(), [rows]);
  const shown = rows.filter((r) => filter === 'ALL' || r.district_name === filter);
  const dirty = Object.keys(edits).length > 0 || (periodEdit !== null && periodEdit !== currentPeriod);

  const save = async () => {
    setBusy(true); setSaveError(''); setMsg('');
    try {
      const values = Object.fromEntries(rows.map((r) => [r.code, Number(edits[r.code] ?? r.population)]));
      const res = await adminFetch<{ changed: number }>('/api/admin/villages', { method: 'PUT', json: { period, values } });
      setMsg(res.changed ? `${res.changed} kelurahan diperbarui. Terapkan perubahan di Dasbor agar C2 pada grid ikut berubah.` : 'Tidak ada perubahan.');
      notifyChanged();
      setEdits({}); setPeriodEdit(null);
      loaded.reload();
    } catch (e) { setSaveError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (loaded.loading) return <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-ink-3" />;
  if (loaded.data && !loaded.data.available) {
    return (
      <p className="rounded-2xl bg-mid-bg p-4 text-sm font-semibold text-mid">
        Tabel kelurahan belum tersedia. Jalankan supabase/villages.sql lalu scripts/import-kelurahan.mjs. Selama itu, C2 memakai kepadatan kecamatan.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block min-w-[240px] flex-1">
            <span className="mb-1 block text-sm font-bold">Periode data</span>
            <input value={period} onChange={(e) => setPeriodEdit(e.target.value)} placeholder="Semester 1 Tahun 2026"
              className="h-12 w-full rounded-xl border border-line-2 bg-paper px-4 text-base font-bold outline-none focus:border-espresso focus:ring-2 focus:ring-lime" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Kecamatan</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="h-12 rounded-xl border border-line-2 bg-paper px-3 text-base font-bold outline-none focus:border-espresso focus:ring-2 focus:ring-lime">
              <option value="ALL">Semua ({rows.length} kelurahan)</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>
        {source && <p className="mt-2 text-xs text-ink-3">Sumber: {source}</p>}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="border-b border-line bg-oat-2/60 text-xs font-bold uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-3 text-left">Kelurahan</th>
                <th className="px-4 py-3 text-right">Jumlah penduduk</th>
                <th className="px-4 py-3 text-right">Luas poligon</th>
                <th className="px-4 py-3 text-right">Kepadatan (C2)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((r) => {
                const v = edits[r.code] ?? String(r.population);
                const n = Number(v);
                const density = r.area_km2 && n > 0 ? Math.round(n / r.area_km2) : null;
                return (
                  <tr key={r.code}>
                    <td className="px-4 py-2.5">
                      <div className="font-bold">{r.name}</div>
                      <div className="text-xs text-ink-3">Kec. {r.district_name} · {r.code}</div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" inputMode="numeric" aria-label={`Penduduk ${r.name}`} value={v}
                        onChange={(e) => setEdits((x) => ({ ...x, [r.code]: e.target.value }))}
                        className="h-11 w-32 rounded-xl border border-line-2 bg-paper px-3 text-right text-base font-bold tabular outline-none focus:border-espresso focus:ring-2 focus:ring-lime" />
                    </td>
                    <td className="tabular px-4 py-2.5 text-right text-ink-2">
                      {r.area_km2 != null ? `${r.area_km2.toLocaleString('id-ID')} km²` : '–'}
                      {r.official_area_km2 != null && <div className="text-xs text-ink-3">resmi {Number(r.official_area_km2).toLocaleString('id-ID')} km²</div>}
                    </td>
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
        <p>Kepadatan = jumlah penduduk ÷ luas poligon kelurahan (OpenStreetMap). Setelah menyimpan, terapkan perubahan di Dasbor agar nilai C2 pada grid ikut diperbarui.</p>
      </div>

      {(saveError || loaded.error) && <p role="alert" className="rounded-xl bg-bad-bg px-3.5 py-3 text-sm font-semibold text-bad">{saveError || loaded.error}</p>}
      {msg && <p role="status" className="flex items-center gap-2 rounded-xl bg-good-bg px-3.5 py-3 text-sm font-semibold text-good"><Check className="h-4 w-4" />{msg}</p>}
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={save} disabled={busy || !dirty || !period.trim()}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan penduduk kelurahan
        </button>
      </div>
    </div>
  );
}
