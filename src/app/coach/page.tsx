import { Explain } from '@/components/Term';
import { BriefingCard } from '@/components/Briefing';
import { NoData } from '@/components/NoData';
import { StatusPill } from '@/components/StatusPill';
import { buildCoach, type Report } from '@/lib/coach';
import { IS_MOCK } from '@/lib/db';
import { KB } from '@/lib/knowledge';
import { loadDays } from '@/lib/metrics';
import { loadProfile } from '@/lib/profile';

const GROUPS = ['Recovery', 'Sleep', 'Training', 'Body'] as const;

function ReportCard({ r }: { r: Report }) {
  const k = KB[r.key];
  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{k.title}</h3>
        <StatusPill status={r.status} />
      </div>
      <div className="tnum mt-2 text-2xl font-semibold tracking-tight">{r.value}</div>
      <p className="mt-1 text-sm font-medium text-ink">{r.headline}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-2"><Explain>{r.detail}</Explain></p>
      <div className="mt-3">
        <div className="text-xs font-semibold text-ink-2">{r.status === 'good' ? 'How to keep improving' : 'How to improve'}</div>
        <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-ink-2">
          {r.focus.slice(0, 4).map((t) => <li key={t} className="flex gap-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-s1" /><span><Explain>{t}</Explain></span></li>)}
        </ul>
      </div>
      <details className="mt-auto pt-3 text-xs">
        <summary className="cursor-pointer select-none font-medium text-ink-3 hover:text-ink-2">What it means and how to read it</summary>
        <p className="mt-2 leading-relaxed text-ink-2"><Explain>{k.what}</Explain></p>
        <p className="mt-2 leading-relaxed text-ink-2"><span className="font-medium text-ink">Reading it: </span><Explain>{k.read}</Explain></p>
        {k.improve.length > r.focus.slice(0, 4).length && (
          <>
            <p className="mt-2 font-medium text-ink">Everything that moves it</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 leading-relaxed text-ink-2">{k.improve.map((t) => <li key={t}>{t}</li>)}</ul>
          </>
        )}
      </details>
    </article>
  );
}

export default async function CoachPage() {
  const all = await loadDays();
  if (!all.length) return <NoData mock={IS_MOCK} />;
  const { units } = await loadProfile();
  const { reports, levers, briefing } = await buildCoach(all, units);
  const live = reports.filter((r) => r.status !== 'nodata'), missing = reports.filter((r) => r.status === 'nodata');
  const count = (s: string) => live.filter((r) => r.status === s).length;
  return (
    <div className="space-y-6">
      <BriefingCard b={briefing} link={false} />

      <p className="text-xs text-ink-3">
        {live.length} metrics assessed from your own data: {count('good')} on track, {count('ok')} with room to improve, {count('attention')} needing attention.
        Judgements compare you with your own baseline wherever possible. This is general wellness guidance, not medical advice.
      </p>

      {levers.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">What moves your numbers</h2>
          <p className="mt-0.5 text-xs text-ink-3">The strongest patterns in your own last 120 days. These are associations, not proof of cause, but they show where an experiment is most likely to pay off.</p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {levers.map((l) => (
              <li key={l.target + l.driver} className="rounded-lg bg-raised p-3">
                <div className="text-xs text-ink-3">{l.driver} → {l.target}</div>
                <p className="mt-1 text-sm leading-snug text-ink"><Explain>{l.text}</Explain></p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {GROUPS.map((g) => {
        const rs = live.filter((r) => KB[r.key].group === g);
        return rs.length ? (
          <section key={g}>
            <h2 className="mb-3 text-sm font-semibold text-ink-2">{g}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rs.map((r) => <ReportCard key={r.key} r={r} />)}</div>
          </section>
        ) : null;
      })}

      {missing.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">Not available yet</h2>
          <p className="mt-0.5 text-xs text-ink-3">These fill in automatically once your device or account records them.</p>
          <ul className="mt-3 divide-y divide-line/60 text-xs">
            {missing.map((r) => (
              <li key={r.key} className="py-2.5">
                <details>
                  <summary className="flex cursor-pointer select-none flex-wrap items-baseline gap-x-3"><span className="font-medium text-ink">{KB[r.key].title}</span><span className="text-ink-3">{r.detail}</span></summary>
                  <p className="mt-2 leading-relaxed text-ink-2">{KB[r.key].what}</p>
                  <p className="mt-2 leading-relaxed text-ink-2"><span className="font-medium text-ink">Reading it: </span>{KB[r.key].read}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
