'use client';
import { Explain, Term } from '@/components/Term';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { DayRow } from '@/lib/metrics';
import { fmtDate } from '@/lib/format';
import { useUnits } from './ProfileContext';
import { C, Empty, Tip, axis, dateTick } from './charts/kit';

const BASE_METRICS: { key: keyof DayRow; label: string; unit: string; group: string }[] = [
  { key: 'readiness', label: 'Readiness score', unit: '', group: 'Recovery' },
  { key: 'hrv', label: 'Overnight HRV', unit: 'ms', group: 'Recovery' },
  { key: 'restingHr', label: 'Resting HR', unit: 'bpm', group: 'Recovery' },
  { key: 'bbHigh', label: 'Body Battery high', unit: '', group: 'Recovery' },
  { key: 'bbCharged', label: 'Body Battery charged', unit: '', group: 'Recovery' },
  { key: 'bbDrained', label: 'Body Battery drained', unit: '', group: 'Recovery' },
  { key: 'avgStress', label: 'Daily stress (avg)', unit: '', group: 'Recovery' },
  { key: 'respirationAvg', label: 'Respiration', unit: 'brpm', group: 'Recovery' },
  { key: 'spo2Avg', label: 'SpO2', unit: '%', group: 'Recovery' },
  { key: 'sleepH', label: 'Total sleep', unit: 'h', group: 'Sleep' },
  { key: 'deepH', label: 'Deep sleep', unit: 'h', group: 'Sleep' },
  { key: 'remH', label: 'REM sleep', unit: 'h', group: 'Sleep' },
  { key: 'lightH', label: 'Light sleep', unit: 'h', group: 'Sleep' },
  { key: 'awakeH', label: 'Awake time', unit: 'h', group: 'Sleep' },
  { key: 'sleepScore', label: 'Sleep score', unit: '', group: 'Sleep' },
  { key: 'sleepStress', label: 'Sleep stress', unit: '', group: 'Sleep' },
  { key: 'sleepHr', label: 'Sleeping HR', unit: 'bpm', group: 'Sleep' },
  { key: 'steps', label: 'Steps', unit: '', group: 'Activity' },
  { key: 'distanceKm', label: 'Distance', unit: 'km', group: 'Activity' },
  { key: 'floors', label: 'Floors climbed', unit: '', group: 'Activity' },
  { key: 'intensityMin', label: 'Intensity minutes', unit: 'min', group: 'Activity' },
  { key: 'activeKcal', label: 'Active calories', unit: 'kcal', group: 'Activity' },
  { key: 'restingKcal', label: 'Resting calories', unit: 'kcal', group: 'Activity' },
  { key: 'totalKcal', label: 'Total calories', unit: 'kcal', group: 'Activity' },
  { key: 'trainingLoad', label: 'Training load', unit: '', group: 'Activity' },
  { key: 'activityMin', label: 'Workout minutes', unit: 'min', group: 'Activity' },
  { key: 'maxHr', label: 'Max HR', unit: 'bpm', group: 'Activity' },
  { key: 'vo2max', label: 'VO2 max', unit: '', group: 'Body' },
  { key: 'hydrationMl', label: 'Hydration', unit: 'ml', group: 'Body' },
  { key: 'weightKg', label: 'Weight', unit: 'kg', group: 'Body' },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%', group: 'Body' },
];
const GROUPS = ['Recovery', 'Sleep', 'Activity', 'Body'];

function describe(r: number) {
  const a = Math.abs(r);
  const s = a < 0.1 ? 'no' : a < 0.3 ? 'a weak' : a < 0.5 ? 'a moderate' : a < 0.7 ? 'a strong' : 'a very strong';
  return a < 0.1 ? 'no linear relationship' : `${s} ${r > 0 ? 'positive' : 'negative'} relationship`;
}

export function Explorer({ rows: raw }: { rows: DayRow[] }) {
  const u = useUnits();
  // imperial accounts: convert the two stored-in-SI columns once, then everything downstream is unit-agnostic
  const rows = useMemo(() => (u.imperial ? raw.map((r) => ({ ...r, distanceKm: r.distanceKm != null ? +(r.distanceKm * 0.621371).toFixed(2) : null, weightKg: r.weightKg != null ? u.weightVal(r.weightKg) : null })) : raw), [raw, u]);
  const METRICS = useMemo(() => BASE_METRICS.map((m) => (u.imperial && m.key === 'distanceKm' ? { ...m, unit: 'mi' } : u.imperial && m.key === 'weightKg' ? { ...m, unit: 'lb' } : m)), [u]);
  const [xk, setXk] = useState<keyof DayRow>('avgStress');
  const [yk, setYk] = useState<keyof DayRow>('deepH');
  const [lag, setLag] = useState(1);
  const [view, setView] = useState<'scatter' | 'time'>('scatter');
  const available = useMemo(() => new Set(BASE_METRICS.filter((m) => rows.some((r) => r[m.key] != null)).map((m) => m.key)), [rows]);
  const mx = METRICS.find((m) => m.key === xk)!, my = METRICS.find((m) => m.key === yk)!;

  const { pts, r, fit } = useMemo(() => {
    const pts: { x: number; y: number; date: string }[] = [];
    for (let i = 0; i + lag < rows.length; i++) {
      const x = rows[i][xk] as number | null, y = rows[i + lag][yk] as number | null;
      if (x != null && y != null) pts.push({ x, y, date: rows[i].date });
    }
    const n = pts.length;
    if (n < 3) return { pts, r: null, fit: null };
    const mxv = pts.reduce((a, p) => a + p.x, 0) / n, myv = pts.reduce((a, p) => a + p.y, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (const p of pts) { sxy += (p.x - mxv) * (p.y - myv); sxx += (p.x - mxv) ** 2; syy += (p.y - myv) ** 2; }
    if (!sxx || !syy) return { pts, r: null, fit: null };
    const slope = sxy / sxx, icpt = myv - slope * mxv;
    const xs = pts.map((p) => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
    return { pts, r: sxy / Math.sqrt(sxx * syy), fit: [{ x: x0, y: slope * x0 + icpt }, { x: x1, y: slope * x1 + icpt }] };
  }, [rows, xk, yk, lag]);

  const select = (value: keyof DayRow, on: (k: keyof DayRow) => void, label: string) => (
    <label className="flex flex-col gap-1 text-xs text-ink-3">
      {label}
      <select value={value as string} onChange={(e) => on(e.target.value as keyof DayRow)} className="rounded-md border border-line bg-raised px-2 py-1.5 text-sm text-ink">
        {GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {METRICS.filter((m) => m.group === g).map((m) => <option key={m.key} value={m.key} disabled={!available.has(m.key)}>{m.label}{available.has(m.key) ? '' : ' (no data)'}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
  const withUnit = (m: typeof mx) => `${m.label}${m.unit ? ` (${m.unit})` : ''}`;
  const fmtTick = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(+v.toFixed(1)));

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-surface p-4">
        {select(xk, setXk, 'X axis')}
        {select(yk, setYk, 'Y axis')}
        <label className="flex flex-col gap-1 text-xs text-ink-3">
          Y timing
          <select value={lag} onChange={(e) => setLag(Number(e.target.value))} className="rounded-md border border-line bg-raised px-2 py-1.5 text-sm text-ink">
            <option value={0}>Same day</option>
            <option value={1}>Next day</option>
            <option value={2}>Two days later</option>
          </select>
        </label>
        <div role="group" aria-label="View" className="ml-auto flex rounded-lg border border-line bg-raised p-0.5 text-xs">
          {(['scatter', 'time'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 font-medium ${view === v ? 'bg-surface text-ink' : 'text-ink-3'}`}>{v === 'scatter' ? 'Scatter' : 'Over time'}</button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-sm font-semibold"><Explain>{my.label}</Explain> vs <Explain>{mx.label}</Explain>{lag ? ` (${lag === 1 ? 'next day' : 'two days later'})` : ''}</h2>
          {r != null && <p className="text-xs text-ink-2"><span className="tnum font-semibold text-ink"><Term k="correlation">r = {r.toFixed(2)}</Term></span> · {describe(r)} across {pts.length} days</p>}
        </div>
        {pts.length < 3 ? <Empty>Not enough overlapping days for these two metrics in this range.</Empty> : view === 'scatter' ? (
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 4 }}>
              <CartesianGrid stroke={C.grid} />
              <XAxis dataKey="x" type="number" name={mx.label} domain={['auto', 'auto']} tickFormatter={fmtTick} {...axis}
                label={{ value: withUnit(mx), position: 'insideBottom', offset: -14, fill: C.ink2, fontSize: 12 }} />
              <YAxis dataKey="y" type="number" name={my.label} domain={['auto', 'auto']} tickFormatter={fmtTick} {...axis}
                label={{ value: withUnit(my), angle: -90, position: 'insideLeft', fill: C.ink2, fontSize: 12, style: { textAnchor: 'middle' } }} />
              <Tooltip cursor={{ strokeDasharray: '3 3', stroke: C.ink3 }} content={({ active, payload }: any) => {
                const p = payload?.[0]?.payload;
                return !active || !p?.date ? null : (
                  <div className="rounded-lg border border-line bg-raised px-3 py-2 text-xs shadow-xl">
                    <div className="mb-1 font-medium text-ink">{fmtDate(p.date, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div className="text-ink-2">{mx.label}: <span className="tnum font-medium text-ink">{p.x.toLocaleString()} {mx.unit}</span></div>
                    <div className="text-ink-2">{my.label}: <span className="tnum font-medium text-ink">{p.y.toLocaleString()} {my.unit}</span></div>
                  </div>
                );
              }} />
              {fit && <ReferenceLine segment={fit as any} stroke={C.ink2} strokeDasharray="5 4" strokeWidth={1.5} />}
              <Scatter data={pts} fill={C.s1} fillOpacity={0.75} stroke={C.surface} strokeWidth={1} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="space-y-4">
            {[{ m: mx, color: C.s1 }, { m: my, color: C.s2 }].map(({ m, color }) => (
              <div key={m.key + color}>
                <div className="mb-1 text-xs font-medium text-ink-2">{withUnit(m)}</div>
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={rows} syncId="explorer" margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={dateTick} minTickGap={36} {...axis} />
                    <YAxis domain={['auto', 'auto']} tickFormatter={fmtTick} {...axis} />
                    <Tooltip content={<Tip valueFmt={(v: number) => `${v.toLocaleString()} ${m.unit}`} />} cursor={{ stroke: C.ink3, strokeDasharray: '3 3' }} />
                    <Line dataKey={m.key as string} name={m.label} stroke={color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-ink-3">Correlation shows that two metrics move together, not that one causes the other. Dashed line is the least-squares trend.</p>
      </section>
    </div>
  );
}
