import { AlertTriangle, CheckCircle2, CircleDashed, MinusCircle } from 'lucide-react';
import type { Status } from '@/lib/coach';

const MAP = {
  good: { label: 'On track', icon: CheckCircle2, tone: 'text-good' },
  ok: { label: 'Room to improve', icon: MinusCircle, tone: 'text-warn' },
  attention: { label: 'Needs attention', icon: AlertTriangle, tone: 'text-bad' },
  nodata: { label: 'No data', icon: CircleDashed, tone: 'text-ink-3' },
} as const;

export function StatusPill({ status, label }: { status: Status; label?: string }) {
  const s = MAP[status], Icon = s.icon;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-[11px] font-medium text-ink-2">
      <Icon className={`h-3.5 w-3.5 ${s.tone}`} aria-hidden /> {label ?? s.label}
    </span>
  );
}
