'use client';

import React, { useState } from 'react';
import { Search, Loader2, MapPin, X } from 'lucide-react';

interface Place { name: string; address: string; lat: number; lng: number }

interface Props {
  /** Dipanggil saat pengguna memilih hasil: titik itu langsung disurvei */
  onPick: (lat: number, lng: number, label: string) => void;
}

/** Kotak "cari alamat atau tempat" (Nominatim/OSM, dibatasi Kota Bogor). Mencari saat Enter ditekan. */
export const PlaceSearch: React.FC<Props> = ({ onPick }) => {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Place[] | null>(null);
  const [error, setError] = useState('');

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 3) { setError('Ketik minimal 3 huruf.'); return; }
    setBusy(true); setError(''); setResults(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Pencarian gagal.');
      setResults(data.results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => { setQ(''); setResults(null); setError(''); };

  return (
    <div>
      <form onSubmit={search} role="search" className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Cari alamat atau tempat</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setError(''); // pesan lama tidak relevan lagi begitu kata kunci diubah
              if (!e.target.value.trim()) setResults(null);
            }}
            maxLength={120}
            placeholder="Cari alamat / tempat, mis. Botani Square"
            className="h-12 w-full rounded-2xl border border-line-2 bg-paper pl-10 pr-9 text-sm text-ink outline-none focus:border-espresso focus:ring-2 focus:ring-lime"
          />
          {q && (
            <button type="button" onClick={clear} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 hover:bg-oat-2">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary shrink-0 !px-4">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cari'}
        </button>
      </form>

      {error && <p role="alert" className="mt-2 text-xs font-semibold text-bad">{error}</p>}

      {results && (
        <div className="mt-2">
          {results.length === 0 ? (
            <p className="rounded-xl bg-oat-2 px-3.5 py-3 text-xs text-ink-2">
              Tidak ditemukan di Kota Bogor. Coba nama jalan atau tempat terkenal di dekatnya (mis. &quot;Jalan Pajajaran&quot;), atau pilih langsung di peta.
            </p>
          ) : (
            <ul className="card divide-y divide-line overflow-hidden p-0">
              {results.map((r, i) => (
                <li key={`${r.lat},${r.lng},${i}`}>
                  <button
                    type="button"
                    onClick={() => { onPick(r.lat, r.lng, r.name); setResults(null); }}
                    className="flex w-full cursor-pointer items-start gap-3 px-3.5 py-3 text-left hover:bg-oat"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{r.name}</span>
                      <span className="block truncate text-xs text-ink-3">{r.address}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-[11px] text-ink-3">Data alamat © kontributor OpenStreetMap</p>
        </div>
      )}
    </div>
  );
};
