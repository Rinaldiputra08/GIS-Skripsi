'use client';

import dynamic from 'next/dynamic';

export const LocationPicker = dynamic(() => import('./LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] w-full items-center justify-center rounded-2xl bg-oat-2 text-sm font-semibold text-ink-3">Memuat peta…</div>
  ),
});
