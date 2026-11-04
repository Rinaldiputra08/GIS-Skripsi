import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const email = await getAdmin();
  if (!email) redirect('/admin/login');
  return <AdminShell email={email}>{children}</AdminShell>;
}
