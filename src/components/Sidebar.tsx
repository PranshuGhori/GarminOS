'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Activity, LayoutDashboard, Moon, HeartPulse, ScatterChart, Sparkles, TrendingUp, Watch } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/coach', label: 'Coach', icon: Sparkles },
  { href: '/sleep', label: 'Sleep & Recovery', icon: Moon },
  { href: '/activities', label: 'Activities', icon: Activity },
  { href: '/trends', label: 'Trends', icon: TrendingUp },
  { href: '/body', label: 'Body & Health', icon: HeartPulse },
  { href: '/explorer', label: 'Explorer', icon: ScatterChart },
];

export function Sidebar() {
  const path = usePathname();
  const range = useSearchParams().get('range');
  const q = range ? `?range=${range}` : '';
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <div className="mb-7 flex items-center gap-2 px-2 text-[15px] font-semibold">
          <Watch className="h-5 w-5 text-s1" /> GarminOS
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            return (
              <Link key={href} href={href + q} aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-raised text-ink' : 'text-ink-3 hover:bg-raised/60 hover:text-ink-2'}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto px-2 text-xs leading-relaxed text-ink-3">Data stays on this machine in a local SQLite file.</p>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <Link key={href} href={href + q} className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${active ? 'text-ink' : 'text-ink-3'}`}>
              <Icon className="h-5 w-5" /> {label.split(' ')[0]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
