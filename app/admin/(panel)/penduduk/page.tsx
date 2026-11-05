import { PageHeader } from '@/components/admin/ui';
import { PopulationEditor } from '@/components/admin/PopulationEditor';
import { VillagePopulationEditor } from '@/components/admin/VillagePopulationEditor';

export default function Page() {
  return (
    <>
      <PageHeader
        title="Data penduduk"
        desc="Jumlah penduduk per kelurahan (SIMDATA Disdukcapil) adalah sumber kriteria C2 (kepadatan) pada grid."
      />
      <VillagePopulationEditor />

      <section className="mt-10 space-y-3">
        <div>
          <h2 className="text-lg font-extrabold text-ink">Penduduk per kecamatan (BPS)</h2>
          <p className="text-sm text-ink-3">
            Dipakai untuk tampilan poligon kecamatan di peta dan sebagai cadangan C2 bila data kelurahan tidak tersedia. Aplikasi memakai tahun terbaru.
          </p>
        </div>
        <PopulationEditor />
      </section>
    </>
  );
}
