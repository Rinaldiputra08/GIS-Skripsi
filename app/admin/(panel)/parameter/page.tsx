import { PageHeader } from '@/components/admin/ui';
import { SettingsEditor } from '@/components/admin/SettingsEditor';

export default function Page() {
  return (
    <>
      <PageHeader title="Parameter sistem" desc="Ambang kategori potensi, ukuran sel grid, dan batas bawah jarak. Sebelumnya tertanam di kode, kini dapat disesuaikan tanpa mengubah program." />
      <SettingsEditor />
    </>
  );
}
