import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { lastSync } from '@/lib/metrics';
import { IS_MOCK } from '@/lib/db';
import { ProfileProvider } from '@/components/ProfileContext';
import { loadProfile } from '@/lib/profile';

export const metadata: Metadata = { title: 'GarminOS', description: 'Personal health & fitness dashboard' };
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sync = await lastSync().catch(() => null);
  const profile = await loadProfile();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen">
          <Suspense>
            <Sidebar />
          </Suspense>
          <div className="flex min-w-0 flex-1 flex-col">
            <Suspense>
              <Header
                mock={IS_MOCK}
                lastSync={sync ? { at: (sync.finishedAt ?? sync.startedAt).toISOString(), ok: sync.status === 'ok', message: sync.message } : null}
              />
            </Suspense>
            <ProfileProvider units={profile.units} zones={profile.zones}>
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10">{children}</main>
            </ProfileProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
