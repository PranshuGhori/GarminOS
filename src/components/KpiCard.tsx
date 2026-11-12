import { Explain } from '@/components/Term';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export function KpiCard({ label, value, unit, delta, deltaUnit = '', higherIsBetter = true, note, children }: {
  label: string; value: string; unit?: string; delta?: number | null; deltaUnit?: string; higherIsBetter?: boolean | null; note?: string; children?: React.ReactNode;
}) {
  const flat = delta == null || Math.abs(delta) < 0.05;
  const up = (delta ?? 0) > 0;
  const good = higherIsBetter == null || flat ? null : up === higherIsBetter;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const tone = good == null ? 'text-ink-3' : good ? 'text-good' : 'text-bad';
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs font-medium text-ink-3"><Explain>{label}</Explain></div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="tnum text-3xl font-semibold tracking-tight text-ink">{value}</span>
        {unit && <span className="text-sm text-ink-3"><Explain>{unit}</Explain></span>}
      </div>
      {children}
      <div className="mt-2 flex flex-wrap items-center gap-x-1 text-xs text-ink-2">
        {delta !== undefined && (
          <>
            <Icon className={`h-3.5 w-3.5 shrink-0 ${tone}`} aria-hidden />
            <span className="tnum whitespace-nowrap">{flat ? 'Flat' : `${up ? '+' : '−'}${Math.abs(delta!).toFixed(Math.abs(delta!) < 10 ? 1 : 0)}${deltaUnit}`}</span>
            <span className="whitespace-nowrap text-ink-3"><Explain>7d avg vs prior 7d</Explain></span>
          </>
        )}
        {note && <span className="text-ink-3"><Explain>{note}</Explain></span>}
      </div>
    </div>
  );
}
