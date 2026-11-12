'use client';
import { Explain } from '@/components/Term';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DayRow } from '@/lib/metrics';
import { fmtDate, fmtHours } from '@/lib/format';
import { C, Card, Empty, Tip, axis, dateTick } from './charts/kit';

const STAGES = [
  { key: 'deepH', label: 'Deep', color: C.s1 },
  { key: 'remH', label: 'REM', color: C.s7 },
  { key: 'lightH', label: 'Light', color: C.s3 },
  { key: 'awakeH', label: 'Awake', color: C.s2 },
] as const;

export function SleepStagesChart({ rows }: { rows: DayRow[] }) {
  const has = rows.some((r) => r.sleepH != null);
  return (
    <Card help="sleepStages" title="Sleep stage architecture" subtitle="Hours per night by stage" legend={STAGES.map((s) => ({ label: s.label, color: s.color }))}>
      {!has ? <Empty /> : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateTick} minTickGap={36} {...axis} />
            <YAxis {...axis} tickFormatter={(v) => `${v}h`} />
            <Tooltip content={<Tip valueFmt={(v: number) => fmtHours(v)} />} cursor={{ fill: '#ffffff', fillOpacity: 0.04 }} />
            {STAGES.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="s" fill={s.color} stroke={C.surface} strokeWidth={rows.length > 120 ? 0 : 1}
                radius={i === STAGES.length - 1 ? [3, 3, 0, 0] : 0} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

const hourClock = (h: number) => {
  const m = Math.round(h * 60) % 1440, hh = Math.floor(m / 60), mm = m % 60;
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
};

export function SleepNeedChart({ rows }: { rows: DayRow[] }) {
  const pairs = rows.filter((r) => r.sleepH != null && r.sleepNeedH != null);
  const debt = pairs.reduce((a, r) => a + (r.sleepNeedH! - r.sleepH!), 0);
  return (
    <Card help="sleepDuration" title="Sleep need vs actual" subtitle={pairs.length ? `Garmin's recommended sleep for each night against what you got. Net ${debt >= 0 ? 'shortfall' : 'surplus'} in range: ${fmtHours(Math.abs(debt))}.` : undefined}
      legend={[{ label: 'Actual', color: C.s1 }, { label: 'Need', color: C.ink2, dashed: true }]}>
      {!pairs.length ? <Empty>No sleep-need data in this range.</Empty> : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateTick} minTickGap={36} {...axis} />
            <YAxis domain={[(min: number) => Math.floor(min), (max: number) => Math.ceil(max)]} allowDecimals={false} tickFormatter={(v) => `${v}h`} {...axis} />
            <Tooltip content={<Tip valueFmt={(v: number) => fmtHours(v)} />} cursor={{ stroke: C.ink3, strokeDasharray: '3 3' }} />
            <Line dataKey="sleepNeedH" name="Need" stroke={C.ink2} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="sleepH" name="Actual" stroke={C.s1} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export function SleepWindowChart({ rows }: { rows: DayRow[] }) {
  const data = rows.map((r) => ({ ...r, window: r.bedH != null && r.wakeH != null && r.wakeH > r.bedH ? [r.bedH, r.wakeH] : null }));
  const beds = data.filter((r) => r.window).map((r) => r.bedH!);
  const mean = beds.reduce((a, b) => a + b, 0) / Math.max(1, beds.length);
  const lo = Math.floor(Math.min(...beds, 99) / 2) * 2, hi = Math.ceil(Math.max(...data.filter((r) => r.window).map((r) => r.wakeH!), 0) / 2) * 2;
  const ticks = Array.from({ length: Math.max(1, (hi - lo) / 2 + 1) }, (_, i) => lo + i * 2);
  const sdMin = beds.length > 1 ? Math.round(Math.sqrt(beds.reduce((a, b) => a + (b - mean) ** 2, 0) / (beds.length - 1)) * 60) : null;
  return (
    <Card help="sleepConsistency" title="Bedtime and wake consistency" subtitle={beds.length ? `Each bar spans bedtime to wake-up. Average bedtime ${hourClock(mean)}${sdMin != null ? `, varying by about ±${sdMin} min` : ''}.` : undefined}>
      {!beds.length ? <Empty /> : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateTick} minTickGap={36} {...axis} />
            <YAxis reversed domain={[lo, hi]} ticks={ticks} tickFormatter={hourClock} width={68} {...axis} />
            <Tooltip content={<Tip valueFmt={(v: number[]) => `${hourClock(v[0])} → ${hourClock(v[1])}`} />} cursor={{ fill: '#ffffff', fillOpacity: 0.04 }} />
            <Bar dataKey="window" name="In bed" fill={C.s7} radius={3} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

const PART_LABEL: Record<string, string> = { duration: 'Duration', deep: 'Deep', rem: 'REM', light: 'Light', stress: 'Stress', awakeCount: 'Awakenings', restlessness: 'Restlessness' };

type Night = { hr: [number, number][]; hrv: [number, number][] };
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export function NightLab({ rows }: { rows: DayRow[] }) {
  const nights = rows.filter((r) => r.sleepH != null).map((r) => r.date).reverse();
  const [date, setDate] = useState(nights[0] ?? '');
  const [data, setData] = useState<Night | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!nights.includes(date)) setDate(nights[0] ?? ''); }, [nights.join(',')]); // eslint-disable-line
  useEffect(() => {
    if (!date) return;
    let live = true;
    setLoading(true);
    fetch(`/api/night?date=${date}`).then((r) => r.json()).then((j) => live && setData(j)).catch(() => live && setData({ hr: [], hrv: [] })).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [date]);

  const row = rows.find((r) => r.date === date);
  const hr = (data?.hr ?? []).map(([t, v]) => ({ t, v }));
  const hrv = (data?.hrv ?? []).map(([t, v]) => ({ t, v }));
  const low = hr.length ? hr.reduce((a, b) => (b.v < a.v ? b : a)) : null;
  const span = hr.length ? [hr[0].t, hr.at(-1)!.t] : hrv.length ? [hrv[0].t, hrv.at(-1)!.t] : null;
  const lowPos = low && span ? (low.t - span[0]) / Math.max(1, span[1] - span[0]) : null;

  const notes: string[] = [];
  if (low && lowPos != null) {
    notes.push(lowPos < 0.5
      ? `Heart rate bottomed out early (${low.v} bpm at ${clock(low.t)}), a sign your body settled into recovery quickly.`
      : `Heart rate did not reach its low (${low.v} bpm) until ${clock(low.t)}, late in the night. Late meals, alcohol, or hard evening training commonly cause this.`);
  }
  if (row?.hrv != null && row.hrvBaselineLow != null && row.hrvBaselineHigh != null) {
    notes.push(row.hrv < row.hrvBaselineLow ? `Average HRV ${row.hrv} ms was below your balanced range (${row.hrvBaselineLow}–${row.hrvBaselineHigh} ms).`
      : row.hrv > row.hrvBaselineHigh ? `Average HRV ${row.hrv} ms was above your balanced range (${row.hrvBaselineLow}–${row.hrvBaselineHigh} ms).`
      : `Average HRV ${row.hrv} ms sat inside your balanced range (${row.hrvBaselineLow}–${row.hrvBaselineHigh} ms).`);
  }
  if (row?.sleepStress != null) notes.push(`Average sleep stress ${row.sleepStress}.`);

  const xProps = { dataKey: 't', type: 'number' as const, domain: span ?? ['auto', 'auto'], tickFormatter: clock, minTickGap: 48, ...axis };
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold"><Explain>Overnight heart rate and HRV</Explain></h2>
          <p className="mt-0.5 text-xs text-ink-3">One night at a time, inside the sleep window</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-3">
          Night of
          <select value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-line bg-raised px-2 py-1.5 text-xs text-ink">
            {nights.map((n) => <option key={n} value={n}>{fmtDate(n, { weekday: 'short', month: 'short', day: 'numeric' })}</option>)}
          </select>
        </label>
      </div>
      {!date ? <Empty /> : loading && !data ? <Empty>Loading night…</Empty> : (
        <div className={loading ? 'opacity-50' : ''}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium text-ink-2">Heart rate (bpm)</div>
              {!hr.length ? <Empty>No heart-rate samples for this night.</Empty> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={hr} margin={{ top: 16, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis {...xProps} />
                    <YAxis domain={['dataMin - 8', 'dataMax + 3']} {...axis} />
                    <Tooltip content={<Tip labelFmt={clock} valueFmt={(v: number) => `${v} bpm`} />} cursor={{ stroke: C.ink3, strokeDasharray: '3 3' }} />
                    <Line dataKey="v" name="Heart rate" stroke={C.s5} strokeWidth={2} dot={false} isAnimationActive={false} />
                    {low && <ReferenceDot x={low.t} y={low.v} r={5} fill={C.s5} stroke={C.surface} strokeWidth={2} label={{ value: `Low ${low.v}`, position: 'bottom', fill: C.ink2, fontSize: 11 }} />}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-ink-2"><Explain>{`HRV, 5-minute readings (ms)${row?.hrvBaselineLow != null ? ' · band = balanced range' : ''}`}</Explain></div>
              {!hrv.length ? <Empty>No HRV readings for this night.</Empty> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={hrv} margin={{ top: 16, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis {...xProps} />
                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} {...axis} />
                    {row?.hrvBaselineLow != null && row.hrvBaselineHigh != null && <ReferenceArea y1={row.hrvBaselineLow} y2={row.hrvBaselineHigh} fill={C.s1} fillOpacity={0.12} stroke="none" />}
                    <Tooltip content={<Tip labelFmt={clock} valueFmt={(v: number) => `${v} ms`} />} cursor={{ stroke: C.ink3, strokeDasharray: '3 3' }} />
                    <Line dataKey="v" name="HRV" stroke={C.s1} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          {row?.scoreParts && (
            <div className="mt-3 border-t border-line pt-3">
              <div className="mb-2 text-xs font-medium text-ink-2"><Explain>{`What made up the sleep score${row.sleepScore != null ? ` of ${row.sleepScore}` : ''}`}</Explain></div>
              <ul className="flex flex-wrap gap-2 text-xs">
                {Object.entries(PART_LABEL).filter(([k]) => row.scoreParts![k]).map(([k, label]) => (
                  <li key={k} className="rounded-md bg-raised px-2.5 py-1.5"><span className="text-ink-3"><Explain>{label === 'Deep' ? 'Deep sleep' : label === 'Light' ? 'Light sleep' : label}</Explain></span> <span className="ml-1 font-medium text-ink">{row.scoreParts![k].charAt(0) + row.scoreParts![k].slice(1).toLowerCase()}</span></li>
                ))}
              </ul>
            </div>
          )}
          {notes.length > 0 && <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs leading-relaxed text-ink-2">{notes.map((n) => <li key={n}><Explain>{n}</Explain></li>)}</ul>}
        </div>
      )}
    </section>
  );
}
