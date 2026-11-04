import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/admin-auth';
import { LoginForm } from '@/components/admin/LoginForm';

export default async function LoginPage() {
  if (await getAdmin()) redirect('/admin');
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <LoginForm />
    </main>
  );
}
