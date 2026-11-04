'use client';

import React, { useState } from 'react';
import { Loader2, RotateCcw, Check, Info } from 'lucide-react';
import { adminFetch, notifyChanged } from './api';
import { DEFAULT_SETTINGS, SETTING_META, type AppSettings } from '@/lib/settings';
import { Chip } from './ui';
import { useLoad } from '@/lib/use-load';

export function SettingsEditor() {
  const loaded = useLoad(() => adminFetch<{ settings: AppSettings }>('/api/admin/settings'));
  const [override, setOverride] = useState<AppSettings | null>(null); // hasil simpan terbaru
  const saved = override ?? loaded.data?.settings ?? null;
  const [edits, setEdits] = useState<Record<string, string>>({});     // hanya nilai yang diketik pengguna
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [msg, setMsg] = useState('');
  const error = saveError || loaded.error;
  const form: Record<string, string> = saved ? Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, edits[k] ?? String(v)])) : {};
  const setForm = (fn: (f: Record<string, string>) => Record<string, string>) => setEdits(fn(form));

  const dirty = saved && SETTING_META.some((m) => Number(form[m.key]) !== saved[m.key]);
  const gridDirty = saved && SETTING_META.some((m) => m.affectsGrid && Number(form[m.key]) !== saved[m.key]);

  const save = async () => {
    setBusy(true); setSaveError(''); setMsg('');
    try {
      const payload = Object.fromEntries(SETTING_META.map((m) => [m.key, Number(form[m.key])]));
      const d = await adminFetch<{ settings: AppSettings; changed: string[] }>('/api/admin/settings', { method: 'PUT', json: payload });
      setOverride(d.settings);
      setEdits({});
      setMsg(gridDirty ? 'Tersimpan. Ukuran sel / batas jarak baru berlaku setelah perubahan diterapkan di Dasbor.' : 'Tersimpan dan langsung berlaku di peta.');
      notifyChanged();
    } catch (e) { setSaveError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (!saved) return error ? <p role="alert" className="rounded-2xl bg-bad-bg p-4 text-sm font-semibold text-bad">{error}</p> : <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-ink-3" />;

  return (
    <div className="space-y-4">
      <div className="card divide-y divide-line">
        {SETTING_META.map((m) => {
          const id = `s-${m.key}`;
          const changed = Number(form[m.key]) !== saved[m.key];
          return (
            <div key={m.key} className="grid items-center gap-3 p-4 sm:grid-cols-[1fr_14rem] sm:p-5">
              <div className="min-w-0">
                <label htmlFor={id} className="flex flex-wrap items-center gap-2 font-extrabold">
                  {m.label}
                  {m.affectsGrid ? <Chip tone="mid">perlu diterapkan</Chip> : <Chip tone="good">langsung berlaku</Chip>}
                </label>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{m.hint}</p>
                <p className="mt-1 text-xs text-ink-3">Bawaan skripsi: {DEFAULT_SETTINGS[m.key]} {m.unit} · rentang {m.min}–{m.max}</p>
              </div>
              <div className="flex items-center gap-2">
                <input id={id} type="number" inputMode="decimal" min={m.min} max={m.max} step={m.step} value={form[m.key] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [m.key]: e.target.value }))}
                  className={`h-12 w-full rounded-xl border bg-paper px-4 text-right text-base font-bold tabular outline-none focus:ring-2 focus:ring-lime ${changed ? 'border-espresso' : 'border-line-2'}`} />
                <span className="w-16 shrink-0 text-xs font-semibold text-ink-3">{m.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl bg-info-bg p-3.5 text-sm text-info">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Mengubah parameter berarti mengubah metode penilaian. Catat nilai yang dipakai pada penelitian: bawaan (0,62 / 0,45 / grid 300 m) adalah yang dipakai pada dokumen skripsi.</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-bad-bg px-3.5 py-3 text-sm font-semibold text-bad">{error}</p>}
      {msg && <p role="status" className="flex items-center gap-2 rounded-xl bg-good-bg px-3.5 py-3 text-sm font-semibold text-good"><Check className="h-4 w-4" />{msg}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <button className="btn btn-soft" onClick={() => setEdits(Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([k, v]) => [k, String(v)])))}>
          <RotateCcw className="h-4 w-4" /> Kembalikan ke bawaan
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy || !dirty}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan parameter
        </button>
      </div>
    </div>
  );
}
