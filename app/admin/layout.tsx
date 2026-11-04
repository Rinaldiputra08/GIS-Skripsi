import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin · KopiSpasial Bogor',
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 overflow-y-auto overscroll-contain bg-oat font-sans text-ink">{children}</div>;
}
