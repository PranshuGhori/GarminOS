import { KpiCard } from '@/components/KpiCard';
import { NoData } from '@/components/NoData';
import { TrendChart } from '@/components/OverviewCharts';
import { IS_MOCK } from '@/lib/db';
import { C } from '@/lib/colors';
import { fmtNum, unitFmt } from '@/lib/format';
import { KB } from '@/lib/knowledge';
import { inRange, loadDays, parseRange } from '@/lib/metrics';
import { loadProfile } from '@/lib/profile';

const pretty = (s: unknown) => String(s).toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default async function BodyPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const all = await loadDays();
  if (!all.length) return <NoData mock={IS_MOCK} />;
  const { units, cycle } = await loadProfile();
  const u = unitFmt(units);
  const rows = inRange(all, range).map((r) => ({ ...r, weightKg: r.weightKg != null ? u.weightVal(r.weightKg) : null }));
  const last = (k: 'weightKg' | 'bodyFatPct' | 'bmi' | 'spo2Avg' | 'respirationAvg' | 'vo2max') => [...all].reverse().find((r) => r[k] != null)?.[k] ?? null;
  const needs = (k: keyof typeof KB) => `No data. Needs ${KB[k].needs}.`;
  // Cycle summary fields are read defensively: this endpoint could not be tested against an account that tracks cycles.
  const c = cycle?.daySummary ?? cycle;
  const cycleDay = c?.dayInCycle ?? c?.currentDayInCycle, cycleLen = c?.cycleLength ?? c?.predictedCycleLength, phase = c?.currentPhase ?? c?.phase;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Weight" value={last('weightKg') != null ? fmtNum(u.weightVal(last('weightKg')!), 1) : '–'} unit={u.weightUnit} note={last('bmi') != null ? `BMI ${fmtNum(last('bmi'), 1)}` : 'Latest weigh-in'} />
        <KpiCard label="Body fat" value={fmtNum(last('bodyFatPct'), 1)} unit="%" note="Smart-scale estimate" />
        <KpiCard label="VO2 max" value={fmtNum(last('vo2max'), 1)} unit="ml/kg/min" note="Latest estimate" />
        <KpiCard label="Blood oxygen" value={fmtNum(last('spo2Avg'))} unit="%" note="Latest daily average" />
      </div>
      {cycleDay != null && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">Menstrual cycle</h2>
          <p className="mt-1 text-sm text-ink-2">Day <span className="tnum font-semibold text-ink">{cycleDay}</span>{cycleLen ? ` of about ${cycleLen}` : ''}{phase != null ? ` · ${pretty(phase)}` : ''}</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-3">Resting heart rate typically rises and HRV falls slightly in the second half of the cycle (after ovulation), and skin temperature rises. A lower readiness score in that phase is expected physiology, not lost fitness; compare like phases with like.</p>
        </section>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart rows={rows} dataKey="weightKg" title="Weight" unit={u.weightUnit} color={C.s1} help="weight" empty={needs('weight')} />
        <TrendChart rows={rows} dataKey="bodyFatPct" title="Body fat" unit="%" color={C.s2} empty={needs('weight')} />
        <TrendChart rows={rows} dataKey="vo2max" title="VO2 max" subtitle="Estimate from qualifying runs, walks or power rides" unit="ml/kg/min" color={C.s3} help="vo2max" empty={needs('vo2max')} />
        <TrendChart rows={rows} dataKey="spo2Avg" title="Blood oxygen (SpO2)" unit="%" color={C.s5} help="spo2" empty={needs('spo2')} />
        <TrendChart rows={rows} dataKey="respirationAvg" title="Respiration rate" subtitle="Average breaths per minute" unit="brpm" color={C.s7} help="respiration" />
        <TrendChart rows={rows} dataKey="hydrationMl" title="Hydration logged" unit="ml" color={C.s1} help="hydration" empty={needs('hydration')} />
      </div>
    </div>
  );
}
