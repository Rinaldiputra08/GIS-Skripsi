import { PageHeader } from '@/components/admin/ui';
import { HistoryView } from '@/components/admin/HistoryView';

export default function Page() {
  return (
    <>
      <PageHeader title="Riwayat" desc="Jejak setiap perubahan data dan hasil perbandingan peringkat tiap kali perubahan diterapkan. Cocok sebagai bukti pada pengujian sistem." />
      <HistoryView />
    </>
  );
}
