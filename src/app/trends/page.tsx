import { Explain } from '@/components/Term';
import { KpiCard } from '@/components/KpiCard';
import { NoData } from '@/components/NoData';
import { CalendarHeatmap, IntensityGoalChart, LoadChart, WeekdayPatterns } from '@/components/TrendsViews';
import { db, IS_MOCK } from '@/lib/db';
import { fmtDate, fmtHours, fmtNum } from '@/lib/format';
import { type DayRow, inRange, loadDays, parseRange } from '@/lib/metrics';

const weekStart = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const all = await loadDays();
  if (!all.length) return <NoData mock={IS_MOCK} />;
  const rows = inRange(all, range);
  const fit = await db.fitnessAge.findFirst({ orderBy: { date: 'desc' } });

  // weekly roll-up
  const byWeek = new Map<string, DayRow[]>();
  for (const r of rows) byWeek.set(weekStart(r.date), [...(byWeek.get(weekStart(r.date)) ?? []), r]);
  const weeks = [...byWeek.entries()].map(([week, d]) => ({
    week, days: d.length,
    steps: avg(d.map((r) => r.steps)), sleepH: avg(d.map((r) => r.sleepH)), sleepScore: avg(d.map((r) => r.sleepScore)),
    hrv: avg(d.map((r) => r.hrv)), rhr: avg(d.map((r) => r.restingHr)), stress: avg(d.map((r) => r.avgStress)), readiness: avg(d.map((r) => r.readiness)),
    workoutMin: sum(d.map((r) => r.activityMin)), load: sum(d.map((r) => r.trainingLoad)), intensityMin: sum(d.map((r) => r.intensityMin)),
  }));

  // step-goal streaks (today only counts once the goal is hit)
  const goalDays = all.filter((r) => r.steps != null && r.stepGoal != null);
  const hit = (r: DayRow) => r.steps! >= r.stepGoal!;
  let longest = 0, run = 0;
  for (const r of goalDays) { run = hit(r) ? run + 1 : 0; longest = Math.max(longest, run); }
  const tail = goalDays.length && !hit(goalDays.at(-1)!) ? goalDays.slice(0, -1) : goalDays;
  let current = 0;
  for (let i = tail.length - 1; i >= 0 && hit(tail[i]); i--) current++;
  const inRangeGoal = rows.filter((r) => r.steps != null && r.stepGoal != null);
  const goal = [...rows].reverse().find((r) => r.intensityGoal)?.intensityGoal ?? 150;
  const comp = fit?.components ? JSON.parse(fit.components) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Step-goal streak" value={fmtNum(current)} unit={current === 1 ? 'day' : 'days'} note={`Longest: ${longest} days`} />
        <KpiCard label="Step goal hit" value={inRangeGoal.length ? fmtNum((inRangeGoal.filter(hit).length / inRangeGoal.length) * 100) : '–'} unit="%" note={`${inRangeGoal.filter(hit).length} of ${inRangeGoal.length} days in range`} />
        <KpiCard label="Intensity goal hit" value={`${weeks.filter((w) => w.intensityMin >= goal).length} / ${weeks.length}`} unit="weeks" note={`Goal ${goal} min per week`} />
        <KpiCard label="Fitness age" value={fit?.fitnessAge != null ? fmtNum(fit.fitnessAge) : '–'} unit={fit?.chronologicalAge != null ? `vs actual ${fit.chronologicalAge}` : undefined}
          note={comp?.vigorousMinutesAvg?.value != null ? `Vigorous ${fmtNum(comp.vigorousMinutesAvg.value)} of ${fmtNum(comp.vigorousMinutesAvg.targetValue)} min/wk target` : fit ? `As of ${fmtDate(fit.date)}` : 'Not available yet'} />
      </div>
      <LoadChart rows={rows} />
      <CalendarHeatmap rows={rows} />
      <WeekdayPatterns rows={rows} />
      <IntensityGoalChart weeks={weeks.map((w) => ({ week: w.week, intensityMin: w.intensityMin }))} goal={goal} />

      <section className="rounded-xl border border-line bg-surface">
        <div className="border-b border-line p-4">
          <h2 className="text-sm font-semibold">Weekly summary</h2>
          <p className="mt-0.5 text-xs text-ink-3"><Explain>Averages per day, except workout time, training load and intensity minutes, which are weekly totals</Explain></p>
        </div>
        <div className="overflow-x-auto">
          <table className="tnum w-full min-w-[820px] text-right text-sm">
            <thead className="text-xs text-ink-3">
              <tr className="border-b border-line">
                {['Week of', 'Readiness', 'Sleep', 'Sleep score', 'HRV', 'Resting HR', 'Stress', 'Steps', 'Workouts', 'Load'].map((h, i) => <th key={h} className={`px-4 py-2 font-medium ${i === 0 ? 'text-left' : ''}`}><Explain>{h}</Explain></th>)}
              </tr>
            </thead>
            <tbody>
              {[...weeks].reverse().slice(0, 26).map((w) => (
                <tr key={w.week} className="border-b border-line/60 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-left text-ink-2">{fmtDate(w.week)}{w.days < 7 && <span className="ml-1.5 text-xs text-ink-3">({w.days}d)</span>}</td>
                  <td className="px-4 py-2.5">{fmtNum(w.readiness)}</td>
                  <td className="px-4 py-2.5">{fmtHours(w.sleepH)}</td>
                  <td className="px-4 py-2.5">{fmtNum(w.sleepScore)}</td>
                  <td className="px-4 py-2.5">{w.hrv != null ? `${fmtNum(w.hrv)} ms` : '–'}</td>
                  <td className="px-4 py-2.5">{fmtNum(w.rhr)}</td>
                  <td className="px-4 py-2.5">{fmtNum(w.stress)}</td>
                  <td className="px-4 py-2.5">{fmtNum(w.steps)}</td>
                  <td className="px-4 py-2.5">{fmtHours(w.workoutMin / 60)}</td>
                  <td className="px-4 py-2.5">{fmtNum(w.load)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
