import { ActivityFeed, BestEfforts, PolarizedChart, type ActivityRow } from '@/components/ActivityViews';
import { KpiCard } from '@/components/KpiCard';
import { NoData } from '@/components/NoData';
import { db, IS_MOCK } from '@/lib/db';
import { fmtDuration, fmtNum } from '@/lib/format';
import { parseRange, rangeStart } from '@/lib/metrics';
import { unitFmt } from '@/lib/format';
import { loadProfile } from '@/lib/profile';

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const rows = await db.activity.findMany({ where: { startLocal: { gte: rangeStart(range) } }, orderBy: { startLocal: 'desc' }, omit: { raw: true } });
  if (!rows.length && !(await db.activity.count())) return <NoData mock={IS_MOCK} />;
  const activities: ActivityRow[] = rows.map(({ startGmt, updatedAt, movingSec, locationName, fitStatus, ...a }) => a);
  const u = unitFmt((await loadProfile()).units);
  const sum = (f: (a: ActivityRow) => number | null) => activities.reduce((t, a) => t + (f(a) ?? 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Activities" value={fmtNum(activities.length)} note="in selected range" />
        <KpiCard label="Total time" value={fmtDuration(sum((a) => a.durationSec))} note="h:mm:ss" />
        <KpiCard label="Total distance" value={fmtNum(u.distVal(sum((a) => a.distanceM)) ?? 0, 1)} unit={u.distUnit} />
        <KpiCard label="Training load" value={fmtNum(sum((a) => a.trainingLoad))} note="sum of activity load" />
      </div>
      <PolarizedChart activities={activities} />
      <BestEfforts activities={activities} />
      <ActivityFeed activities={activities} />
    </div>
  );
}
