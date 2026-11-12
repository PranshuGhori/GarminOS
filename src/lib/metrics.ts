import { db } from '@/lib/db';
import { addDays, today } from '@/lib/dates';

export const RANGES = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: 100000 } as const;
export type RangeKey = keyof typeof RANGES;
export const parseRange = (v: unknown): RangeKey => (typeof v === 'string' && v in RANGES ? (v as RangeKey) : '30d');
export const rangeStart = (r: RangeKey) => addDays(today(), -(RANGES[r] - 1));

export type BbEvent = { type: string; startLocal: string | null; impact: number | null; durationSec: number | null; feedback: string | null };
export type DayRow = {
  date: string;
  restingHr: number | null; minHr: number | null; maxHr: number | null;
  avgStress: number | null; maxStress: number | null;
  bbCharged: number | null; bbDrained: number | null; bbHigh: number | null; bbLow: number | null;
  steps: number | null; distanceKm: number | null; floors: number | null;
  intensityMin: number | null;
  activeKcal: number | null; restingKcal: number | null; totalKcal: number | null;
  spo2Avg: number | null; respirationAvg: number | null; hydrationMl: number | null;
  hrv: number | null; hrvBaselineLow: number | null; hrvBaselineHigh: number | null; hrvStatus: string | null;
  sleepH: number | null; deepH: number | null; lightH: number | null; remH: number | null; awakeH: number | null;
  sleepScore: number | null; sleepStress: number | null; sleepHr: number | null;
  weightKg: number | null; bodyFatPct: number | null; bmi: number | null; vo2max: number | null;
  trainingLoad: number | null; activityMin: number | null;
  stressRestH: number | null; stressLowH: number | null; stressMedH: number | null; stressHighH: number | null;
  stepGoal: number | null; intensityGoal: number | null;
  sleepNeedH: number | null; bedH: number | null; wakeH: number | null; // clock hours; bedtime after midnight is 24+
  scoreParts: Record<string, string> | null;
  bbEvents: BbEvent[];
  // derived
  hrv7: number | null; hrv30: number | null; readiness: number | null;
  load7: number | null; load28: number | null; loadRatio: number | null;
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs: number[]) => {
  const m = mean(xs);
  return m == null || xs.length < 2 ? null : Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const h = (sec: number | null) => (sec == null ? null : +(sec / 3600).toFixed(2));
const r1 = (v: number | null) => (v == null ? null : +v.toFixed(1));

/** All days (continuous calendar, gaps filled with nulls) with rolling HRV + readiness computed over the full history. */
export async function loadDays(): Promise<DayRow[]> {
  const [daily, sleeps, body, acts] = await Promise.all([
    db.dailyMetric.findMany({ orderBy: { date: 'asc' }, omit: { raw: true } }),
    db.sleep.findMany({ omit: { raw: true } }),
    db.bodyComposition.findMany(),
    db.activity.findMany({ select: { startLocal: true, trainingLoad: true, durationSec: true, vo2max: true } }),
  ]);
  if (!daily.length && !sleeps.length) return [];
  const dm = new Map(daily.map((d) => [d.date, d]));
  const sm = new Map(sleeps.map((s) => [s.date, s]));
  const bm = new Map(body.map((b) => [b.date, b]));
  const am = new Map<string, { load: number; min: number; vo2: number | null }>();
  for (const a of acts) {
    const k = a.startLocal.slice(0, 10);
    const cur = am.get(k) ?? { load: 0, min: 0, vo2: null };
    if (a.vo2max) cur.vo2 = Math.max(cur.vo2 ?? 0, a.vo2max);
    cur.load += a.trainingLoad ?? 0;
    cur.min += (a.durationSec ?? 0) / 60;
    am.set(k, cur);
  }
  const first = [daily[0]?.date, ...sleeps.map((s) => s.date)].filter(Boolean).sort()[0]!;
  const rows: DayRow[] = [];
  for (let date = first; date <= today(); date = addDays(date, 1)) {
    const d = dm.get(date), s = sm.get(date), b = bm.get(date), a = am.get(date);
    rows.push({
      date,
      restingHr: d?.restingHr ?? null, minHr: d?.minHr ?? null, maxHr: d?.maxHr ?? null,
      avgStress: d?.avgStress ?? null, maxStress: d?.maxStress ?? null,
      bbCharged: d?.bbCharged ?? null, bbDrained: d?.bbDrained ?? null, bbHigh: d?.bbHigh ?? null, bbLow: d?.bbLow ?? null,
      steps: d?.steps ?? null, distanceKm: d?.distanceM != null ? +(d.distanceM / 1000).toFixed(2) : null, floors: r1(d?.floors ?? null),
      intensityMin: d && (d.intensityModerate != null || d.intensityVigorous != null) ? (d.intensityModerate ?? 0) + 2 * (d.intensityVigorous ?? 0) : null,
      activeKcal: d?.activeKcal != null ? Math.round(d.activeKcal) : null,
      restingKcal: d?.restingKcal != null ? Math.round(d.restingKcal) : null,
      totalKcal: d?.totalKcal != null ? Math.round(d.totalKcal) : null,
      spo2Avg: d?.spo2Avg ?? null, respirationAvg: r1(d?.respirationAvg ?? null), hydrationMl: d?.hydrationMl ?? null,
      hrv: d?.hrvLastNight ?? null, hrvBaselineLow: d?.hrvBaselineLow ?? null, hrvBaselineHigh: d?.hrvBaselineHigh ?? null, hrvStatus: d?.hrvStatus ?? null,
      sleepH: h(s?.totalSec ?? null), deepH: h(s?.deepSec ?? null), lightH: h(s?.lightSec ?? null), remH: h(s?.remSec ?? null), awakeH: h(s?.awakeSec ?? null),
      sleepScore: s?.score ?? null, sleepStress: r1(s?.avgStress ?? null), sleepHr: s?.avgHr ?? null,
      weightKg: r1(b?.weightKg ?? null), bodyFatPct: b?.bodyFatPct ?? null, bmi: r1(b?.bmi ?? null), vo2max: a?.vo2 ?? null,
      trainingLoad: a ? Math.round(a.load) : null, activityMin: a ? Math.round(a.min) : null,
      stressRestH: h(d?.stressRestSec ?? null), stressLowH: h(d?.stressLowSec ?? null), stressMedH: h(d?.stressMedSec ?? null), stressHighH: h(d?.stressHighSec ?? null),
      stepGoal: d?.stepGoal ?? null, intensityGoal: d?.intensityGoal ?? null,
      sleepNeedH: s?.needMin != null ? +(s.needMin / 60).toFixed(2) : null,
      bedH: s?.bedtimeMin != null ? +((s.bedtimeMin < 720 ? s.bedtimeMin + 1440 : s.bedtimeMin) / 60).toFixed(2) : null,
      wakeH: s?.wakeMin != null ? +((s.wakeMin + 1440) / 60).toFixed(2) : null,
      scoreParts: s?.scoreParts ? JSON.parse(s.scoreParts) : null,
      bbEvents: d?.bbEvents ? JSON.parse(d.bbEvents) : [],
      hrv7: null, hrv30: null, readiness: null, load7: null, load28: null, loadRatio: null,
    });
  }
  // Rolling windows + readiness
  for (let i = 0; i < rows.length; i++) {
    const win = (n: number, key: 'hrv' | 'restingHr', inclusive: boolean) =>
      rows.slice(Math.max(0, i - n + (inclusive ? 1 : 0)), inclusive ? i + 1 : i).map((r) => r[key]).filter((v): v is number => v != null);
    const h7 = win(7, 'hrv', true), h30 = win(30, 'hrv', true);
    rows[i].hrv7 = h7.length >= 3 ? r1(mean(h7)) : null;
    rows[i].hrv30 = h30.length >= 7 ? r1(mean(h30)) : null;
    // Training load: acute = last 7 days, chronic = weekly average of the last 28 days.
    const loadSum = (n: number) => rows.slice(Math.max(0, i - n + 1), i + 1).reduce((a, r) => a + (r.trainingLoad ?? 0), 0);
    if (i >= 6) rows[i].load7 = Math.round(loadSum(7));
    if (i >= 27) {
      rows[i].load28 = Math.round(loadSum(28) / 4);
      rows[i].loadRatio = rows[i].load28 ? +(rows[i].load7! / rows[i].load28!).toFixed(2) : null;
    }
    rows[i].readiness = readiness(rows[i], win(30, 'hrv', false), win(30, 'restingHr', false));
  }
  return rows;
}

/**
 * Morning Readiness (0–100) = 40% HRV + 35% sleep score + 25% resting HR.
 * HRV and RHR are scored as z-scores against your own trailing 30 days
 * (60 = at baseline, ±20 per standard deviation; lower RHR is better).
 */
function readiness(r: DayRow, hrvHist: number[], rhrHist: number[]): number | null {
  const parts: [number, number][] = [];
  const z = (v: number | null, hist: number[]) => {
    const m = mean(hist), s = sd(hist);
    return v == null || m == null || s == null || hist.length < 5 ? null : (v - m) / Math.max(s, 1);
  };
  const zh = z(r.hrv, hrvHist), zr = z(r.restingHr, rhrHist);
  if (zh != null) parts.push([clamp(60 + 20 * zh), 0.4]);
  if (r.sleepScore != null) parts.push([r.sleepScore, 0.35]);
  if (zr != null) parts.push([clamp(60 - 20 * zr), 0.25]);
  if (parts.length < 2) return null;
  const w = parts.reduce((a, p) => a + p[1], 0);
  return Math.round(parts.reduce((a, p) => a + p[0] * p[1], 0) / w);
}

export const inRange = (rows: DayRow[], range: RangeKey) => {
  const start = rangeStart(range);
  return rows.filter((r) => r.date >= start);
};

/** Latest non-null value + 7-day average vs the 7 days before it. */
export function kpi(rows: DayRow[], key: keyof DayRow) {
  const vals = rows.map((r) => ({ date: r.date, v: r[key] as number | null }));
  const latest = [...vals].reverse().find((x) => x.v != null) ?? null;
  const avg = (xs: typeof vals) => mean(xs.map((x) => x.v).filter((v): v is number => v != null));
  const cur = avg(vals.slice(-7)), prev = avg(vals.slice(-14, -7));
  return { value: latest?.v ?? null, date: latest?.date ?? null, avg7: cur, delta: cur != null && prev != null ? cur - prev : null };
}

export async function lastSync() {
  return db.syncLog.findFirst({ where: { status: { not: 'running' } }, orderBy: { id: 'desc' } });
}
