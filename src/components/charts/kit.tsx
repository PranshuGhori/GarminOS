'use client';
import { Explain } from '@/components/Term';
import { fmtDate } from '@/lib/format';
import { C } from '@/lib/colors';
import { KB, type MetricKey } from '@/lib/knowledge';

export { C };

export const axis = { stroke: C.grid, tick: { fill: C.ink3, fontSize: 11 }, tickLine: false, axisLine: false } as const;
export const dateTick = (v: string) => fmtDate(v);

export function Card({ title, subtitle, legend, children, className = '', help }: {
  title: string; subtitle?: string; help?: MetricKey; legend?: { label: string; color: string; dashed?: boolean }[]; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-sm font-semibold text-ink"><Explain>{title}</Explain></h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-3"><Explain>{subtitle}</Explain></p>}
        </div>
        {legend && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
            {legend.map((l) => (
              <li key={l.label} className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3.5 rounded" style={l.dashed ? { borderTop: `2px dashed ${l.color}`, height: 0 } : { background: l.color, height: 3 }} />
                <Explain>{l.label}</Explain>
              </li>
            ))}
          </ul>
        )}
      </div>
      {children}
      {help && (
        <details className="mt-3 border-t border-line pt-2.5 text-xs">
          <summary className="cursor-pointer select-none font-medium text-ink-3 hover:text-ink-2">What this means and how to improve it</summary>
          <p className="mt-2 leading-relaxed text-ink-2">{KB[help].what}</p>
          <p className="mt-2 leading-relaxed text-ink-2"><span className="font-medium text-ink">Reading it: </span>{KB[help].read}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed text-ink-2">{KB[help].improve.map((t) => <li key={t}>{t}</li>)}</ul>
        </details>
      )}
    </section>
  );
}

export function Tip({ active, payload, label, labelFmt, valueFmt }: any) {
  if (!active || !payload?.length) return null;
  const head = labelFmt ? labelFmt(label, payload) : typeof label === 'string' ? fmtDate(label, { weekday: 'short', month: 'short', day: 'numeric' }) : label;
  return (
    <div className="rounded-lg border border-line bg-raised px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-ink">{head}</div>
      {payload.filter((p: any) => p.value != null && p.name).map((p: any) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color ?? p.fill }} />
          <span>{p.name}</span>
          <span className="tnum ml-auto pl-4 font-medium text-ink">{valueFmt ? valueFmt(p.value, p) : Array.isArray(p.value) ? p.value.join('–') : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Empty({ children = 'No data in this range yet.' }: { children?: React.ReactNode }) {
  return <div className="flex h-40 items-center justify-center text-sm text-ink-3">{children}</div>;
}
