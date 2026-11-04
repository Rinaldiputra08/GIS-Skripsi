'use client';

import { PageHeader, SourceChip, Chip } from '@/components/admin/ui';
import { ResourceManager } from '@/components/admin/ResourceManager';

export default function CrowdCentersPage() {
  return (
    <>
      <PageHeader
        title="Pusat keramaian"
        desc="Simpul aktivitas (mal, pasar, terminal, kampus, taman, dll.) untuk kriteria C4. Semakin dekat ke simpul keramaian, semakin tinggi potensi pengunjung."
      />
      <ResourceManager
        resource="crowd-centers"
        noun="pusat keramaian"
        hasCityFlag
        afterSaveHint="Peringkat lokasi baru berubah setelah perubahan diterapkan di Dasbor."
        sources={[{ value: 'osm', label: 'OSM' }, { value: 'manual', label: 'Manual' }]}
        blank={{ name: '', category: '', latitude: '', longitude: '' }}
        columns={[
          { key: 'name', label: 'Nama', className: 'max-w-[9.5rem] sm:max-w-none', render: (r) => <p className="truncate font-bold">{r.name || '(tanpa nama)'}</p> },
          { key: 'category', label: 'Kategori', render: (r) => <Chip tone="info">{r.category}</Chip> },
          { key: 'source', label: 'Sumber', className: 'hidden sm:table-cell', render: (r) => <SourceChip source={r.source} /> },
          { key: 'inCity', label: 'Wilayah', className: 'hidden md:table-cell', render: (r) => r.inCity ? <span className="text-xs font-semibold text-ink-3">Dalam kota</span> : <Chip tone="mid">Di luar kota</Chip> },
        ]}
        fields={[
          { key: 'name', label: 'Nama tempat', type: 'text', required: true, placeholder: 'mis. Botani Square' },
          { key: 'category', label: 'Kategori', type: 'text', required: true, placeholder: 'mall / marketplace / station …',
            suggestions: ['mall', 'supermarket', 'marketplace', 'bus_station', 'station', 'university', 'school', 'hospital', 'park', 'attraction'] },
        ]}
      />
    </>
  );
}
