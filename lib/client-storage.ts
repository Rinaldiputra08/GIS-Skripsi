/** Utilitas sisi klien: id anonim perangkat + ekspor CSV. */

const KEY = 'kopispasial.ownerId';
let memoryId: string | null = null;

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

/**
 * Id anonim untuk perangkat ini. Dipakai agar skenario & riwayat survei hanya terlihat oleh
 * pembuatnya (tanpa akun). Disimpan di localStorage; bila tidak tersedia, berlaku selama tab terbuka.
 */
export function getOwnerId(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    const id = uuid();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return (memoryId ??= uuid());
  }
}

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Unduh baris sebagai CSV (BOM agar terbaca benar di Excel) */
export function downloadCsv(filename: string, columns: { key: string; label: string }[], rows: Record<string, unknown>[]) {
  const text = [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
