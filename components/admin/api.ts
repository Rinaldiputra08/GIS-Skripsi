'use client';

/** fetch JSON untuk API admin: melempar Error(pesan) bila gagal; sesi berakhir -> kembali ke login */
export async function adminFetch<T = Record<string, unknown>>(path: string, init?: RequestInit & { json?: unknown }): Promise<T & { success: true }> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  let data: (T & { success: boolean; error?: string; duplicate?: boolean }) | null = null;
  try {
    data = await res.json();
  } catch {
    /* bukan JSON */
  }
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.assign('/admin/login?next=' + encodeURIComponent(window.location.pathname));
    throw new Error('Sesi berakhir. Silakan login kembali.');
  }
  if (!res.ok || !data || data.success === false) {
    const err = new Error(data?.error ?? `Permintaan gagal (${res.status})`) as Error & { duplicate?: boolean };
    err.duplicate = data?.duplicate;
    throw err;
  }
  return data as T & { success: true };
}

/** Beri tahu kerangka admin bahwa data berubah (memuat ulang banner "perubahan belum diterapkan") */
export const notifyChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('admin:changed'));
};
