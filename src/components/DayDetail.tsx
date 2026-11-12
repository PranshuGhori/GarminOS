'use client';
import { Explain } from '@/components/Term';
import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bar, BarChart } from 'recharts';
import type { DayRow } from '@/lib/metrics';
import { fmtDate, fmtDuration } from '@/lib/format';
import { C, Card, Empty, Tip, axis, dateTick } from './charts/kit';

const STRESS = [
  { key: 'stressRestH', label: 'Rest', color: C.s1 },
  { key: 'stressLowH', label: 'Low', color: C.s3 },
  { key: 'stressMedH', label: 'Medium', color: C.s4 },
  { key: 'stressHighH', label: 'High', color: C.s5 },
] as const;

export function StressBreakdownChart({ rows }: { rows: DayRow[] }) {
  const has = rows.some((r) => r.stressLowH != null);
  return (
    <Card help="stress" title="Stress breakdown" subtitle="Hours per day at each stress level (time in activity or unmeasured is left out)" legend={STRESS.map((s) => ({ label: s.label, color: s.color }))}>
      {!has ? <Empty /> : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateTick} minTickGap={36} {...axis} />
            <YAxis {...axis} tickFormatter={(v) => `${v}h`} />
            <Tooltip content={<Tip valueFmt={(v: number) => fmtDuration(v * 3600)} />} cursor={{ fill: '#ffffff', fillOpacity: 0.04 }} />
            {STRESS.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="s" fill={s.color} stroke={C.surface} strokeWidth={rows.length > 120 ? 0 : 1} radius={i === 3 ? [3, 3, 0, 0] : 0} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

const EVENT_LABEL: Record<string, string> = { SLEEP: 'Sleep', NAP: 'Nap', ACTIVITY: 'Activity', RECOVERY: 'Recovery', STRESS: 'Stress' };
const pretty = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** One calendar day: 24-hour heart rate + what charged and drained Body Battery. */
export function DayDetail({ rows }: { rows: DayRow[] }) {
  const days = rows.filter((r) => r.restingHr != null || r.bbEvents.length).map((r) => r.date).reverse();
  const [date, setDate] = useState(days[1] ?? days[0] ?? ''); // default: last complete day
  const [hr, setHr] = useState<{ t: number; v: number }[] | null>(null);
  useEffect(() => { if (!days.includes(date)) setDate(days[1] ?? days[0] ?? ''); }, [days.join(',')]); // eslint-disable-line
  useEffect(() => {
    if (!date) return;
    let live = true;
    setHr(null);
    fetch(`/api/day?date=${date}`).then((r) => r.json()).then((j) => live && setHr((j.hr ?? []).map(([t, v]: number[]) => ({ t, v })))).catch(() => live && setHr([]));
    return () => { live = false; };
  }, [date]);
  const row = rows.find((r) => r.date === date);
  const events = row?.bbEvents ?? [];
  const maxImpact = Math.max(1, ...events.map((e) => Math.abs(e.impact ?? 0)));
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Day detail</h2>
          <p className="mt-0.5 text-xs text-ink-3"><Explain>24-hour heart rate and what charged or drained Body Battery</Explain></p>
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-3">
          Day
          <select value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-line bg-raised px-2 py-1.5 text-xs text-ink">
            {days.map((n) => <option key={n} value={n}>{fmtDate(n, { weekday: 'short', month: 'short', day: 'numeric' })}</option>)}
          </select>
        </label>
      </div>
      {!date ? <Empty /> : (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="mb-1 text-xs font-medium text-ink-2">Heart rate (bpm){row?.restingHr != null && ` · resting ${row.restingHr}, max ${row.maxHr ?? '–'}`}</div>
            {hr == null ? <Empty>Loading…</Empty> : !hr.length ? <Empty>No heart-rate samples for this day.</Empty> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={hr} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={clock} minTickGap={56} {...axis} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} {...axis} />
                  <Tooltip content={<Tip labelFmt={clock} valueFmt={(v: number) => `${v} bpm`} />} cursor={{ stroke: C.ink3, strokeDasharray: '3 3' }} />
                  <Line dataKey="v" name="Heart rate" stroke={C.s5} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="lg:col-span-2">
            <div className="mb-2 text-xs font-medium text-ink-2">Body Battery events{row?.bbCharged != null && ` · +${row.bbCharged} / −${row.bbDrained ?? 0} total`}</div>
            {!events.length ? <p className="text-xs text-ink-3">No events recorded.</p> : (
              <ul className="space-y-2.5">
                {events.map((e, i) => {
                  const up = (e.impact ?? 0) >= 0;
                  return (
                    <li key={i} className="text-xs">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-ink">{EVENT_LABEL[e.type] ?? pretty(e.type)}</span>
                        <span className="text-ink-3">{e.startLocal?.slice(11, 16)} · {fmtDuration(e.durationSec)}</span>
                        <span className="tnum ml-auto font-semibold text-ink">{up ? '+' : '−'}{Math.abs(e.impact ?? 0)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded bg-raised"><div className="h-1.5 rounded" style={{ width: `${(Math.abs(e.impact ?? 0) / maxImpact) * 100}%`, background: up ? C.s1 : C.s2 }} /></div>
                      {e.feedback && <div className="mt-1 text-ink-3">{pretty(e.feedback)}</div>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
