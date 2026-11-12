'use client';
import { Explain } from '@/components/Term';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DayRow } from '@/lib/metrics';
import { fmtDate } from '@/lib/format';
import { C, Card, Empty, Tip, axis, dateTick } from './charts/kit';

export function LoadChart({ rows }: { rows: DayRow[] }) {
  const has = rows.some((r) => r.load7 != null);
  const last = [...rows].reverse().find((r) => r.loadRatio != null);
  const ratio = last?.loadRatio ?? null;
  const verdict = ratio == null ? null : ratio > 1.5 ? 'Ramping up fast: load is well above what you are used to' : ratio > 1.3 ? 'Building: above your usual load' : ratio >= 0.8 ? 'Steady: in line with your usual load' : 'Easing off: below your usual load';
  return (
    <Card help="load" title="Training load" subtitle="Acute load (last 7 days) against chronic load (weekly average of the last 28 days)"
      legend={[{ label: 'Acute (7 days)', color: C.s2 }, { label: 'Chronic (28-day weekly avg)', color: C.ink2, dashed: true }]}>
      {!has ? <Empty>Needs at least a week of activities.</Empty> : (
        <>
          {ratio != null && (
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <span className="tnum text-2xl font-semibold">{ratio.toFixed(2)}</span>
              <span className="text-xs text-ink-3"><Explain>acute-to-chronic ratio</Explain> · {verdict}</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="date" tickFormatter={dateTick} minTickGap={36} {...axis} />
              <YAxis {...axis} />
              <Tooltip content={<Tip />} cursor={{ stroke: C.ink3, strokeDasharray: '3 3' }} />
              <Line dataKey="load28" name="Chronic (28-day weekly avg)" stroke={C.ink2} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={false} />
              <Line dataKey="load7" name="Acute (7 days)" stroke={C.s2} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
}

// ---- calendar heatmap ------------------------------------------------------
const HEAT: { key: keyof DayRow; label: string; unit: string }[] = [
  { key: 'readiness', label: 'Readiness', unit: '' },
  { key: 'sleepScore', label: 'Sleep score', unit: '' },
  { key: 'hrv', label: 'HRV', unit: 'ms' },
  { key: 'trainingLoad', label: 'Training load', unit: '' },
  { key: 'steps', label: 'Steps', unit: '' },
  { key: 'avgStress', label: 'Stress', unit: '' },
];
const RAMP = ['#0d366b', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#b7d3f6']; // one hue; brighter = more
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dow = (ymd: string) => { const [y, m, d] = ymd.split('-').map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7; };

export function CalendarHeatmap({ rows }: { rows: DayRow[] }) {
  const [key, setKey] = useState<keyof DayRow>('readiness');
  const [hover, setHover] = useState<DayRow | null>(null);
  const meta = HEAT.find((h) => h.key === key)!;
  const { weeks, lo, hi } = useMemo(() => {
    const vals = rows.map((r) => r[key] as number | null).filter((v): v is number => v != null);
    const weeks: (DayRow | null)[][] = [];
    rows.forEach((r, i) => {
      const d = dow(r.date);
      if (i === 0 || d === 0) weeks.push(Array(7).fill(null));
      weeks.at(-1)![d] = r;
    });
    return { weeks, lo: Math.min(...vals), hi: Math.max(...vals) };
  }, [rows, key]);
  const color = (v: number | null) => (v == null ? '#232322' : RAMP[Math.min(RAMP.length - 1, Math.floor(((v - lo) / Math.max(1e-9, hi - lo)) * RAMP.length))]);
  const has = Number.isFinite(lo);
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Calendar</h2>
          <p className="tnum mt-0.5 h-4 text-xs text-ink-3">
            {hover ? <><span className="text-ink-2">{fmtDate(hover.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span> · {meta.label} {hover[key] != null ? `${(hover[key] as number).toLocaleString()} ${meta.unit}` : 'no data'}</> : 'One square per day. Hover for the value.'}
          </p>
        </div>
        <select value={key as string} onChange={(e) => setKey(e.target.value as keyof DayRow)} aria-label="Calendar metric" className="rounded-md border border-line bg-raised px-2 py-1.5 text-xs text-ink">
          {HEAT.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}
        </select>
      </div>
      {!has ? <Empty /> : (
        <>
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-[3px]" onMouseLeave={() => setHover(null)}>
              <div className="mr-1 flex flex-col gap-[3px] pt-4 text-[10px] leading-[14px] text-ink-3">{DOW.map((d, i) => <div key={d} className="h-[14px]">{i % 2 === 0 ? d : ''}</div>)}</div>
              {weeks.map((w, wi) => {
                const first = w.find(Boolean)!;
                const showMonth = wi === 0 || first.date.slice(5, 7) !== weeks[wi - 1].find(Boolean)!.date.slice(5, 7);
                return (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    <div className="h-[13px] whitespace-nowrap text-[10px] text-ink-3" style={{ width: 14, overflow: 'visible' }}>{showMonth ? fmtDate(first.date, { month: 'short' }) : ''}</div>
                    {w.map((r, di) => (
                      <div key={di} onMouseEnter={() => r && setHover(r)} className="h-[14px] w-[14px] rounded-[3px]"
                        style={{ background: r ? color(r[key] as number | null) : 'transparent', outline: hover && r && hover.date === r.date ? `1.5px solid ${C.ink}` : undefined }} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="tnum mt-3 flex items-center gap-1.5 text-[11px] text-ink-3">
            {lo.toLocaleString()} {RAMP.map((c) => <span key={c} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: c }} />)} {hi.toLocaleString()} {meta.unit}
            <span className="ml-3 h-[10px] w-[10px] rounded-[2px] bg-raised" /> no data
          </div>
        </>
      )}
    </section>
  );
}

// ---- weekday patterns ------------------------------------------------------
const PATTERNS: { key: keyof DayRow; label: string; unit: string; digits: number }[] = [
  { key: 'sleepH', label: 'Sleep', unit: 'h', digits: 1 },
  { key: 'avgStress', label: 'Stress', unit: '', digits: 0 },
  { key: 'steps', label: 'Steps', unit: '', digits: 0 },
  { key: 'activityMin', label: 'Workout minutes', unit: 'min', digits: 0 },
];

export function WeekdayPatterns({ rows }: { rows: DayRow[] }) {
  const data = useMemo(() => DOW.map((d, i) => {
    const out: any = { day: d };
    for (const p of PATTERNS) {
      // workout minutes: days without a workout count as zero; other metrics skip missing days
      const vals = rows.filter((r) => dow(r.date) === i).map((r) => (p.key === 'activityMin' ? (r.activityMin ?? 0) : (r[p.key] as number | null))).filter((v): v is number => v != null);
      out[p.key] = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(p.digits) : null;
    }
    return out;
  }), [rows]);
  return (
    <Card title="Day-of-week patterns" subtitle="Average per weekday across the selected range">
      {rows.length < 7 ? <Empty>Needs at least a week of data.</Empty> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PATTERNS.map((p) => (
            <div key={p.key as string}>
              <div className="mb-1 text-xs font-medium text-ink-2"><Explain>{p.label}</Explain>{p.unit && ` (${p.unit})`}</div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="day" tickFormatter={(v: string) => v[0]} interval={0} {...axis} />
                  <YAxis {...axis} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                  <Tooltip content={<Tip labelFmt={(l: string) => l} valueFmt={(v: number) => `${v.toLocaleString()} ${p.unit}`} />} cursor={{ fill: '#ffffff', fillOpacity: 0.04 }} />
                  <Bar dataKey={p.key as string} name={p.label} fill={C.s1} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function IntensityGoalChart({ weeks, goal }: { weeks: { week: string; intensityMin: number }[]; goal: number }) {
  return (
    <Card help="intensity" title="Weekly intensity minutes" subtitle={`Moderate + 2 × vigorous, against your ${goal}-minute weekly goal (dashed)`}>
      {!weeks.length ? <Empty /> : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="week" tickFormatter={dateTick} minTickGap={24} {...axis} />
            <YAxis {...axis} />
            <Tooltip content={<Tip labelFmt={(l: string) => `Week of ${fmtDate(l)}`} valueFmt={(v: number) => `${v} min`} />} cursor={{ fill: '#ffffff', fillOpacity: 0.04 }} />
            <ReferenceLine y={goal} stroke={C.ink2} strokeDasharray="5 4" />
            <Bar dataKey="intensityMin" name="Intensity minutes" fill={C.s7} radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
