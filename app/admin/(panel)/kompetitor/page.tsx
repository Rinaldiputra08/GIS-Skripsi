'use client';

import { PageHeader, SourceChip, Chip } from '@/components/admin/ui';
import { ResourceManager } from '@/components/admin/ResourceManager';

export default function CompetitorsPage() {
  return (
    <>
      <PageHeader
        title="Kompetitor"
        desc="Kedai kopi eksisting yang menjadi dasar kriteria C1 (jarak ke kompetitor). Tambah kedai yang baru buka, perbaiki lokasi yang keliru, atau hapus yang sudah tutup."
      />
      <ResourceManager
        resource="competitors"
        noun="kompetitor"
        hasCityFlag
        afterSaveHint="Peringkat lokasi baru berubah setelah perubahan diterapkan di Dasbor."
        sources={[{ value: 'kaggle', label: 'Kaggle' }, { value: 'osm', label: 'OSM' }, { value: 'manual', label: 'Manual' }]}
        blank={{ name: '', address: '', category: 'Coffee shop', latitude: '', longitude: '', rating: '' }}
        columns={[
          { key: 'name', label: 'Nama', className: 'max-w-[9.5rem] sm:max-w-none', render: (r) => (
            <div className="min-w-0"><p className="truncate font-bold">{r.name}</p><p className="truncate text-xs text-ink-3">{r.address || 'Tanpa alamat'}</p></div>
          ) },
          { key: 'category', label: 'Kategori', className: 'hidden sm:table-cell', render: (r) => <span className="text-ink-2">{r.category ?? 'Coffee shop'}</span> },
          { key: 'source', label: 'Sumber', render: (r) => <SourceChip source={r.source} /> },
          { key: 'inCity', label: 'Wilayah', className: 'hidden md:table-cell', render: (r) => r.inCity ? <span className="text-xs font-semibold text-ink-3">Dalam kota</span> : <Chip tone="mid">Di luar kota</Chip> },
        ]}
        fields={[
          { key: 'name', label: 'Nama kedai', type: 'text', required: true, placeholder: 'mis. Kopi Tuku Bogor' },
          { key: 'address', label: 'Alamat', type: 'textarea' },
          { key: 'category', label: 'Kategori', type: 'select', required: true, options: [{ value: 'Coffee shop', label: 'Coffee shop (jelas kedai kopi)' }, { value: 'Cafe', label: 'Cafe (kafe umum)' }] },
          { key: 'rating', label: 'Rating (0–5, opsional)', type: 'number', step: 0.1 },
        ]}
      />
    </>
  );
}
