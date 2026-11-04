import { PageHeader } from '@/components/admin/ui';
import { FeedbackView } from '@/components/admin/FeedbackView';

export default function Page() {
  return (
    <>
      <PageHeader title="Masukan pengguna" desc="Skenario analisis dan survei lokasi yang disimpan pengunjung. Admin dapat menghapus catatan yang tidak pantas." />
      <FeedbackView />
    </>
  );
}
