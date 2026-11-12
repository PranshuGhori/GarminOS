'use client';
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DayRow } from '@/lib/metrics';
import type { MetricKey } from '@/lib/knowledge';
import { C, Card, Empty, Tip, axis, dateTick } from './charts/kit';

export function HrvChart({ rows }: { rows: DayRow[] }) {
  const data = rows.map((r) => ({ ...r, band: r.hrvBaselineLow != null && r.hrvBaselineHigh != null ? [r.hrvBaselineLow, r.hrvBaselineHigh] : null }));
  const has = rows.some((r) => r.hrv != null);
  return (
    <Card help="hrv" title="Overnight HRV vs baseline" subtitle="7-day rolling average against your 30-day baseline (ms). Shaded band is Garmin's balanced range."
      legend={[{ label: '7-day average', color: C.s1 }, { label: '30-day baseline', color: C.ink2, dashed: true }, { label: 'Nightly', color: C.ink3 }]}>
      {!has ? <Empty /> : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateTick} minTickGap={36} {...axis} />
            <YAxis domain={['dataMin - 5', 'dataMax + 5']} tickFormatter={(v) => String(Math.round(v))} {...axis} />
            <Tooltip content={<Tip valueFmt={(v: any) => (Array.isArray(v) ? `${v[0]}–${v[1]} ms` : `${v} ms`)} />} cursor={{ stroke: C.ink3, strokeDasharray: '3 3' }} />
            <Area dataKey="band" name="Balanced range" stroke="none" fill={C.s1} fillOpacity={0.1} isAnimationActive={false} connectNulls />
            <Line dataKey="hrv" name="Nightly" stroke="none" dot={{ r: 2, fill: C.ink3, stroke: 'none' }} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Line dataKey="hrv30" name="30-day baseline" stroke={C.ink2} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="hrv7" name="7-day average" stroke={C.s1} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export function TrendChart({ rows, dataKey, title, subtitle, unit = '', color = C.s1, height = 180, help, empty }: {
  rows: DayRow[]; dataKey: keyof DayRow; title: string; subtitle?: string; unit?: string; color?: string; height?: number; help?: MetricKey; empty?: string;
}) {
  const has = rows.some((r) => r[dataKey] != null);
  return (
    <Card title={title} subtitle={subtitle} help={help}>
      {!has ? <Empty>{empty}</Empty> : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateTick} minTickGap={36} {...axis} />
            <YAxis domain={['auto', 'auto']} {...axis} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))} />
            <Tooltip content={<Tip valueFmt={(v: number) => `${v.toLocaleString()}${unit ? ' ' + unit : ''}`} />} cursor={{ stroke: C.ink3, strokeDasharray: '3 3' }} />
            <Line dataKey={dataKey as string} name={title} stroke={color} strokeWidth={2} dot={rows.length <= 31 ? { r: 2, fill: color, stroke: 'none' } : false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export function BodyBatteryChart({ rows }: { rows: DayRow[] }) {
  const has = rows.some((r) => r.bbCharged != null);
  return (
    <Card help="bodyBattery" title="Body Battery" subtitle="Points charged and drained each day" legend={[{ label: 'Charged', color: C.s1 }, { label: 'Drained', color: C.s2 }]}>
      {!has ? <Empty /> : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={1}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateTick} minTickGap={36} {...axis} />
            <YAxis {...axis} />
            <Tooltip content={<Tip />} cursor={{ fill: '#ffffff', fillOpacity: 0.04 }} />
            <Bar dataKey="bbCharged" name="Charged" fill={C.s1} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="bbDrained" name="Drained" fill={C.s2} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
