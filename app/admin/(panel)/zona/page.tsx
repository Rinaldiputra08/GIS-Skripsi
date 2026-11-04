'use client';

import { PageHeader, Chip } from '@/components/admin/ui';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { ZONE_TYPES } from '@/lib/zone-types';

export default function ZonesPage() {
  return (
    <>
      <PageHeader
        title="Zona terlarang"
        desc="Area yang tidak layak untuk usaha kedai kopi (makam, instansi keamanan, kawasan kenegaraan, sempadan sungai). Titik rekomendasi di dalam radius zona ditandai terlarang dan disaring dari peringkat. Perubahan zona langsung berlaku tanpa membangun ulang grid."
      />
      <ResourceManager
        resource="zones"
        noun="zona"
        radiusKey="radius_m"
        afterSaveHint="Berlaku langsung di peta dan peringkat."
        blank={{ name: '', zone_type: 'cemetery', description: '', latitude: '', longitude: '', radius_m: 300 }}
        columns={[
          { key: 'name', label: 'Nama', className: 'max-w-[9.5rem] sm:max-w-none', render: (r) => (
            <div className="min-w-0"><p className="truncate font-bold">{r.name}</p><p className="truncate text-xs text-ink-3">{r.description || '–'}</p></div>
          ) },
          { key: 'type_label', label: 'Jenis', className: 'hidden sm:table-cell', render: (r) => <Chip tone="bad">{r.type_label}</Chip> },
          { key: 'radius_m', label: 'Radius', render: (r) => <span className="tabular font-semibold text-ink-2">{r.radius_m} m</span> },
        ]}
        fields={[
          { key: 'name', label: 'Nama zona', type: 'text', required: true },
          { key: 'zone_type', label: 'Jenis zona', type: 'select', required: true, options: Object.entries(ZONE_TYPES).map(([value, label]) => ({ value, label })) },
          { key: 'radius_m', label: 'Radius (meter)', type: 'number', required: true, step: 10, help: 'Lingkaran merah di peta akan menyesuaikan.' },
          { key: 'description', label: 'Keterangan', type: 'textarea' },
        ]}
      />
    </>
  );
}
