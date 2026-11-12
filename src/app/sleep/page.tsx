import { KpiCard } from '@/components/KpiCard';
import { NoData } from '@/components/NoData';
import { TrendChart } from '@/components/OverviewCharts';
import { NightLab, SleepNeedChart, SleepStagesChart, SleepWindowChart } from '@/components/SleepCharts';
import { C } from '@/lib/colors';
import { IS_MOCK } from '@/lib/db';
import { fmtHours, fmtNum } from '@/lib/format';
import { inRange, kpi, loadDays, parseRange } from '@/lib/metrics';

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export default async function SleepPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const all = await loadDays();
  if (!all.length) return <NoData mock={IS_MOCK} />;
  const rows = inRange(all, range);
  const nights = rows.filter((r) => r.sleepH != null);
  const restorative = avg(nights.map((r) => (r.sleepH ? ((r.deepH ?? 0) + (r.remH ?? 0)) / r.sleepH : null)));
  const n = `${nights.length} night${nights.length === 1 ? '' : 's'} in range`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Average sleep" value={fmtHours(avg(nights.map((r) => r.sleepH)))} delta={kpi(all, 'sleepH').delta} deltaUnit="h" />
        <KpiCard label="Average sleep score" value={fmtNum(avg(nights.map((r) => r.sleepScore)))} unit="/ 100" delta={kpi(all, 'sleepScore').delta} />
        <KpiCard label="Deep + REM share" value={restorative != null ? fmtNum(restorative * 100) : '–'} unit="%" note={n} />
        <KpiCard label="Average sleep stress" value={fmtNum(avg(nights.map((r) => r.sleepStress)), 1)} delta={kpi(all, 'sleepStress').delta} higherIsBetter={false} />
      </div>
      <SleepStagesChart rows={rows} />
      <NightLab rows={rows} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SleepNeedChart rows={rows} />
        <SleepWindowChart rows={rows} />
        <TrendChart rows={rows} dataKey="sleepScore" help="sleepScore" title="Sleep score" color={C.s7} />
        <TrendChart rows={rows} dataKey="sleepHr" title="Average sleeping heart rate" unit="bpm" color={C.s5} />
      </div>
    </div>
  );
}
