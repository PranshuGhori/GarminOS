import { DayDetail, StressBreakdownChart } from '@/components/DayDetail';
import { BriefingCard } from '@/components/Briefing';
import { buildCoach } from '@/lib/coach';
import { loadProfile } from '@/lib/profile';
import { KpiCard } from '@/components/KpiCard';
import { NoData } from '@/components/NoData';
import { BodyBatteryChart, HrvChart, TrendChart } from '@/components/OverviewCharts';
import { C } from '@/lib/colors';
import { IS_MOCK } from '@/lib/db';
import { fmtDate, fmtNum } from '@/lib/format';
import { inRange, kpi, loadDays, parseRange } from '@/lib/metrics';

export default async function Overview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const all = await loadDays();
  if (!all.length) return <NoData mock={IS_MOCK} />;
  const rows = inRange(all, range);
  const { briefing } = await buildCoach(all, (await loadProfile()).units);

  const readiness = kpi(all, 'readiness'), bb = kpi(all, 'bbHigh'), rhr = kpi(all, 'restingHr'), hrv = kpi(all, 'hrv');
  const active = kpi(all, 'activeKcal'), resting = kpi(all, 'restingKcal');
  // calories: use the last *complete* day so a half-finished today does not look like a low day
  const calDay = [...all].reverse().find((r, i) => i > 0 && r.activeKcal != null) ?? all.at(-1)!;
  const activeShare = calDay.activeKcal != null && calDay.restingKcal ? calDay.activeKcal / (calDay.activeKcal + calDay.restingKcal) : null;
  const band = readiness.value == null ? '' : readiness.value >= 75 ? 'Primed' : readiness.value >= 55 ? 'Steady' : 'Take it easy';

  return (
    <div className="space-y-4">
      <BriefingCard b={briefing} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Morning Readiness" value={fmtNum(readiness.value)} unit={band ? `/ 100 · ${band}` : '/ 100'} delta={readiness.delta} />
        <KpiCard label="Body Battery (day high)" value={fmtNum(bb.value)} delta={bb.delta} />
        <KpiCard label="Resting Heart Rate" value={fmtNum(rhr.value)} unit="bpm" delta={rhr.delta} deltaUnit=" bpm" higherIsBetter={false} />
        <KpiCard label="Overnight HRV" value={fmtNum(hrv.value)} unit="ms" delta={hrv.delta} deltaUnit=" ms" />
        <div className="col-span-2 lg:col-span-1">
          <KpiCard label={`Active vs resting calories · ${fmtDate(calDay.date)}`} value={fmtNum(calDay.activeKcal)} unit={`/ ${fmtNum(calDay.restingKcal)} kcal`} delta={active.delta} deltaUnit=" active">
            {activeShare != null && (
              <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${Math.round(activeShare * 100)}% active`}>
                <div style={{ width: `${activeShare * 100}%`, background: C.s2 }} className="rounded-full" />
                <div className="flex-1 rounded-full bg-line" />
              </div>
            )}
          </KpiCard>
        </div>
      </div>

      <HrvChart rows={rows} />
      <DayDetail rows={rows} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart rows={rows} dataKey="readiness" help="readiness" title="Readiness score" subtitle="40% HRV · 35% sleep score · 25% resting HR, each vs your own 30-day norm" color={C.s3} />
        <TrendChart rows={rows} dataKey="restingHr" help="restingHr" title="Resting heart rate" unit="bpm" color={C.s5} />
        <BodyBatteryChart rows={rows} />
        <TrendChart rows={rows} dataKey="avgStress" help="stress" title="Average stress" subtitle="Garmin stress level, 0–100" color={C.s4} />
        <TrendChart rows={rows} dataKey="steps" help="steps" title="Steps" color={C.s1} />
        <TrendChart rows={rows} dataKey="intensityMin" help="intensity" title="Intensity minutes" subtitle="Moderate + 2 × vigorous" unit="min" color={C.s7} />
      </div>
      <StressBreakdownChart rows={rows} />
      <p className="text-xs text-ink-3">
        Latest values: readiness {readiness.date ? fmtDate(readiness.date) : '–'}, HRV {hrv.date ? fmtDate(hrv.date) : '–'}. Resting calories last 7 days average {fmtNum(resting.avg7)} kcal.
      </p>
    </div>
  );
}
