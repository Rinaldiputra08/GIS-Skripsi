import { PageHeader } from '@/components/admin/ui';
import { PopulationEditor } from '@/components/admin/PopulationEditor';

export default function Page() {
  return (
    <>
      <PageHeader title="Data penduduk" desc="Jumlah penduduk per kecamatan (BPS) untuk kriteria C2 (kepadatan). Aplikasi selalu memakai tahun terbaru." />
      <PopulationEditor />
    </>
  );
}
