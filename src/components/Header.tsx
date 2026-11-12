'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const RANGES = [['7d', '7D'], ['30d', '30D'], ['90d', '90D'], ['1y', '1Y'], ['all', 'All']] as const;
const TITLES: Record<string, string> = { '/': 'Overview', '/sleep': 'Sleep & Recovery Lab', '/activities': 'Activity & Performance', '/trends': 'Trends & Patterns', '/coach': 'Coach', '/body': 'Body & Health', '/explorer': 'All-Metrics Explorer' };

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
}

export function Header({ lastSync, mock }: { lastSync: { at: string; ok: boolean; message: string | null } | null; mock: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const range = useSearchParams().get('range') ?? '30d';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const j = await res.json();
      if (!j.ok) setError(j.message ?? 'Sync failed');
      router.refresh();
    } catch {
      setError('Sync request failed');
    } finally {
      setBusy(false);
    }
  }

  const failed = error ?? (lastSync && !lastSync.ok ? lastSync.message : null);
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-page/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6">
        <h1 className="mr-auto text-lg font-semibold">{TITLES[path] ?? 'Garmin'}</h1>
        {path !== '/coach' && <div role="group" aria-label="Date range" className="flex rounded-lg border border-line bg-surface p-0.5 text-xs">
          {RANGES.map(([key, label]) => (
            <Link key={key} href={`${path}?range=${key}`} scroll={false} aria-current={range === key ? 'true' : undefined}
              className={`rounded-md px-2.5 py-1.5 font-medium ${range === key ? 'bg-raised text-ink' : 'text-ink-3 hover:text-ink-2'}`}>
              {label}
            </Link>
          ))}
        </div>}
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-ink-3 sm:block">
            {mock ? 'Demo data' : busy ? 'Syncing with Garmin…' : lastSync ? `Synced ${ago(lastSync.at)}` : 'Never synced'}
          </span>
          <button onClick={sync} disabled={busy || mock} title={mock ? 'Sync is disabled in demo mode' : undefined}
            className="flex items-center gap-2 rounded-lg bg-s1 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Syncing' : 'Sync Now'}
          </button>
        </div>
      </div>
      {failed && !busy && (
        <div className="flex items-center gap-2 border-t border-line bg-bad/10 px-4 py-2 text-xs text-ink-2 md:px-6">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-bad" /> Last sync failed: {failed}
        </div>
      )}
    </header>
  );
}
