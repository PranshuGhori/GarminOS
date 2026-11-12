import { Explain } from '@/components/Term';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Briefing } from '@/lib/coach';
import { StatusPill } from './StatusPill';

export function BriefingCard({ b, link = true }: { b: Briefing; link?: boolean }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="mr-auto">
          <div className="text-xs font-medium text-ink-3">Today</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{b.verdict}</h2>
          {b.why.length > 0 && <p className="mt-1 text-xs text-ink-3"><Explain>{b.why.join(' · ')}</Explain></p>}
        </div>
        <StatusPill status={b.tone} label={b.tone === 'good' ? 'Go' : b.tone === 'attention' ? 'Recover' : b.tone === 'ok' ? 'Steady' : undefined} />
      </div>
      {b.priorities.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-2 text-xs font-semibold text-ink-2">Your top {b.priorities.length === 1 ? 'priority' : `${b.priorities.length} priorities`}</div>
          <ol className="grid gap-2 md:grid-cols-3">
            {b.priorities.map((p, i) => (
              <li key={p.key} className="rounded-lg bg-raised p-3">
                <div className="text-xs text-ink-3"><span className="tnum mr-1.5 font-semibold text-ink-2">{i + 1}</span>{p.title}</div>
                <p className="mt-1 text-sm leading-snug text-ink"><Explain>{p.action}</Explain></p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {link && <Link href="/coach" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-s1 hover:underline">Full coaching report <ArrowRight className="h-3 w-3" /></Link>}
    </section>
  );
}
