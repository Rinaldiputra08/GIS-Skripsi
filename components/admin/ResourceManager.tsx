'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, Loader2, MapPin, Check, AlertTriangle } from 'lucide-react';
import { adminFetch, notifyChanged } from './api';
import { LocationPicker } from './LocationPicker';
import { useLoad } from '@/lib/use-load';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
  step?: number | string;
  help?: string;
  placeholder?: string;
  suggestions?: string[]; // datalist untuk text
}

export interface Column {
  key: string;
  label: string;
  render?: (row: Row) => React.ReactNode;
  className?: string; // mis. 'hidden md:table-cell'
}

interface Props {
  resource: 'competitors' | 'crowd-centers' | 'zones';
  noun: string;                 // "kompetitor"
  columns: Column[];
  fields: FormField[];
  /** nilai awal formulir tambah */
  blank: Row;
  /** key radius untuk menggambar lingkaran di peta (zona) */
  radiusKey?: string;
  /** filter sumber data (kolom `source`) */
  sources?: { value: string; label: string }[];
  /** tampilkan penanda "di luar kota" */
  hasCityFlag?: boolean;
  /** pesan setelah menyimpan */
  afterSaveHint?: string;
  /** apakah baris ini boleh diubah/dihapus */
  canEdit?: (row: Row) => boolean;
}

const PAGE_SIZE = 20;

export function ResourceManager({ resource, noun, columns, fields, blank, radiusKey, sources, hasCityFlag, afterSaveHint, canEdit }: Props) {
  const list = useLoad(() => adminFetch<{ rows: Row[] }>(`/api/admin/${resource}`), [resource]);
  const rows = useMemo(() => list.data?.rows ?? [], [list.data]);
  const loading = list.loading;
  const error = list.error;
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Row | null>(null);   // baris yang diedit / formulir baru
  const [isNew, setIsNew] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? '' : t)), 6000);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (source !== 'all' && r.source !== source) return false;
      if (!q) return true;
      return [r.name, r.address, r.category, r.type_label, r.description].some((v) => String(v ?? '').toLowerCase().includes(q));
    });
  }, [rows, query, source]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, pages - 1);
  const view = filtered.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE);

  const afterSave = (msg: string) => {
    showToast(`${msg}${afterSaveHint ? ' ' + afterSaveHint : ''}`);
    notifyChanged();
    list.reload();
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[String(r.source ?? '')] = (c[String(r.source ?? '')] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Bilah alat */}
      <div className="card flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder={`Cari ${noun}…`} aria-label={`Cari ${noun}`}
            className="h-11 w-full rounded-full border border-line-2 bg-paper pl-10 pr-4 text-sm outline-none focus:border-espresso focus:ring-2 focus:ring-lime"
          />
        </div>
        {sources && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter sumber data">
            {[{ value: 'all', label: `Semua (${rows.length})` }, ...sources.map((s) => ({ ...s, label: `${s.label} (${counts[s.value] ?? 0})` }))].map((s) => (
              <button key={s.value} onClick={() => { setSource(s.value); setPage(0); }} aria-pressed={source === s.value}
                className={`min-h-10 rounded-full px-3.5 text-xs font-bold transition-colors ${source === s.value ? 'bg-espresso text-lime' : 'bg-oat-2 text-ink-2 hover:bg-line'}`}>
                {s.label}
              </button>
            ))}
          </div>
        )}
        <button className="btn btn-primary" onClick={() => { setIsNew(true); setEditing({ ...blank }); }}>
          <Plus className="h-4 w-4" /> Tambah {noun}
        </button>
      </div>

      {toast && (
        <div role="status" className="flex items-start gap-2.5 rounded-2xl bg-good-bg p-3.5 text-sm font-semibold text-good">
          <Check className="mt-0.5 h-4 w-4 shrink-0" /> <span>{toast}</span>
        </div>
      )}
      {error && <div role="alert" className="rounded-2xl bg-bad-bg p-3.5 text-sm font-semibold text-bad">{error}</div>}

      {/* Tabel */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-oat-2/60 text-xs font-bold uppercase tracking-wide text-ink-3">
              <tr>
                {columns.map((c) => <th key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>{c.label}</th>)}
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && (
                <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center text-ink-3"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              )}
              {!loading && view.length === 0 && (
                <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center text-ink-3">Tidak ada data yang cocok.</td></tr>
              )}
              {view.map((r) => {
                const editable = canEdit ? canEdit(r) : true;
                return (
                  <tr key={r.id} className="hover:bg-oat/60">
                    {columns.map((c) => (
                      <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>
                        {c.render ? c.render(r) : <span className="text-ink-2">{String(r[c.key] ?? '–')}</span>}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-right align-middle">
                      <div className="inline-flex gap-1">
                        <button onClick={() => { setIsNew(false); setEditing({ ...r }); }} aria-label={`Ubah ${r.name}`}
                          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-oat-2" disabled={!editable}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(r)} aria-label={`Hapus ${r.name}`}
                          className="flex h-10 w-10 items-center justify-center rounded-full text-bad hover:bg-bad-bg">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs font-semibold text-ink-3">
          <span>{filtered.length.toLocaleString('id-ID')} data{hasCityFlag ? '' : ''}</span>
          <div className="flex items-center gap-2">
            <button disabled={curPage === 0} onClick={() => setPage(curPage - 1)} className="btn btn-soft !min-h-9 !px-3.5 text-xs">Sebelumnya</button>
            <span className="tabular">{curPage + 1} / {pages}</span>
            <button disabled={curPage >= pages - 1} onClick={() => setPage(curPage + 1)} className="btn btn-soft !min-h-9 !px-3.5 text-xs">Berikutnya</button>
          </div>
        </div>
      </div>

      {editing && (
        <EditorDialog
          resource={resource} noun={noun} fields={fields} initial={editing} isNew={isNew} radiusKey={radiusKey}
          context={rows.filter((r) => r.id !== editing.id).map((r) => ({ lat: r.latitude, lng: r.longitude }))}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); afterSave(msg); }}
        />
      )}
      {deleting && (
        <ConfirmDelete
          resource={resource} row={deleting} noun={noun}
          onClose={() => setDeleting(null)}
          onDeleted={() => { const n = deleting.name; setDeleting(null); afterSave(`"${n}" dihapus.`); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
function EditorDialog({ resource, noun, fields, initial, isNew, radiusKey, context, onClose, onSaved }: {
  resource: Props['resource']; noun: string; fields: FormField[]; initial: Row; isNew: boolean; radiusKey?: string;
  context: { lat: number; lng: number }[]; onClose: () => void; onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState<Row>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dup, setDup] = useState('');

  const lat = Number(form.latitude), lng = Number(form.longitude);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng) && form.latitude !== '' && form.longitude !== '' && form.latitude != null;
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async (force = false) => {
    setBusy(true); setError(''); setDup('');
    try {
      const payload: Row = {};
      for (const f of fields) payload[f.key] = form[f.key] ?? '';
      if (isNew) {
        await adminFetch(`/api/admin/${resource}`, { method: 'POST', json: { ...payload, force } });
        onSaved(`${capitalize(noun)} "${payload.name}" ditambahkan.`);
      } else {
        await adminFetch(`/api/admin/${resource}/${initial.id}`, { method: 'PUT', json: payload });
        onSaved(`${capitalize(noun)} "${payload.name}" diperbarui.`);
      }
    } catch (e) {
      const err = e as Error & { duplicate?: boolean };
      if (err.duplicate) setDup(err.message);
      else setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={isNew ? `Tambah ${noun}` : `Ubah ${noun}`}
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col rounded-t-[1.75rem] bg-paper shadow-[var(--shadow-float)] sm:rounded-[1.75rem]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-extrabold">{isNew ? `Tambah ${noun}` : `Ubah ${noun}`}</h2>
          <button onClick={onClose} aria-label="Tutup" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-oat-2"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
          <div className="space-y-3.5">
            {fields.filter((f) => f.key !== 'latitude' && f.key !== 'longitude').map((f) => (
              <FieldInput key={f.key} f={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold"><MapPin className="h-4 w-4" /> Lokasi <span className="text-bad">*</span></p>
              <LocationPicker
                value={hasPoint ? { lat, lng } : null}
                onChange={(la, ln) => setForm((f) => ({ ...f, latitude: Math.round(la * 1e6) / 1e6, longitude: Math.round(ln * 1e6) / 1e6 }))}
                context={context}
                radius={radiusKey && Number(form[radiusKey]) > 0 ? Number(form[radiusKey]) : undefined}
              />
              <p className="mt-1.5 text-xs text-ink-3">Klik peta untuk menaruh titik, atau isi koordinat di bawah.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldInput f={{ key: 'latitude', label: 'Latitude', type: 'number', step: 'any', required: true }} value={form.latitude} onChange={(v) => set('latitude', v)} />
              <FieldInput f={{ key: 'longitude', label: 'Longitude', type: 'number', step: 'any', required: true }} value={form.longitude} onChange={(v) => set('longitude', v)} />
            </div>
          </div>
        </div>

        {(error || dup) && (
          <div className="px-5 pb-1">
            {error && <p role="alert" className="rounded-xl bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
            {dup && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-mid-bg px-3 py-2 text-sm font-semibold text-mid">
                <AlertTriangle className="h-4 w-4 shrink-0" /> <span className="min-w-0 flex-1">{dup} Tetap simpan?</span>
                <button onClick={() => save(true)} className="btn btn-primary !min-h-9 !px-4 text-xs">Ya, simpan</button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button onClick={onClose} className="btn btn-soft">Batal</button>
          <button onClick={() => save(false)} disabled={busy} className="btn btn-primary">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ f, value, onChange }: { f: FormField; value: unknown; onChange: (v: string) => void }) {
  const id = `f-${f.key}`;
  const cls = 'w-full rounded-xl border border-line-2 bg-paper px-3.5 text-base outline-none focus:border-espresso focus:ring-2 focus:ring-lime';
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-bold">{f.label}{f.required && <span className="text-bad"> *</span>}</span>
      {f.type === 'select' ? (
        <select id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={`${cls} h-11`}>
          {!f.required && <option value="">–</option>}
          {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : f.type === 'textarea' ? (
        <textarea id={id} rows={3} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} className={`${cls} py-2.5`} />
      ) : (
        <>
          <input id={id} type={f.type === 'number' ? 'number' : 'text'} step={f.step} inputMode={f.type === 'number' ? 'decimal' : undefined}
            list={f.suggestions ? `${id}-list` : undefined}
            value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} className={`${cls} h-11`} />
          {f.suggestions && <datalist id={`${id}-list`}>{f.suggestions.map((s) => <option key={s} value={s} />)}</datalist>}
        </>
      )}
      {f.help && <span className="mt-1 block text-xs text-ink-3">{f.help}</span>}
    </label>
  );
}

function ConfirmDelete({ resource, row, noun, onClose, onDeleted }: { resource: string; row: Row; noun: string; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const del = async () => {
    setBusy(true);
    try { await adminFetch(`/api/admin/${resource}/${row.id}`, { method: 'DELETE' }); onDeleted(); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="alertdialog" aria-modal="true" aria-label="Konfirmasi hapus" className="w-full max-w-sm rounded-[1.5rem] bg-paper p-6 shadow-[var(--shadow-float)]">
        <h2 className="text-lg font-extrabold">Hapus {noun}?</h2>
        <p className="mt-2 text-sm text-ink-2"><b>{row.name}</b> akan dihapus dari database. Perubahan ini tercatat di riwayat, tetapi data tidak bisa dikembalikan otomatis.</p>
        {error && <p role="alert" className="mt-3 rounded-xl bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-soft">Batal</button>
          <button onClick={del} disabled={busy} className="btn !bg-bad !text-white">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Hapus</button>
        </div>
      </div>
    </div>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
