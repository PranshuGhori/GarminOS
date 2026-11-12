import { db } from '@/lib/db';
import { fmtHours, isPaceSport, type Units, unitFmt } from '@/lib/format';
import { KB, type MetricKey } from '@/lib/knowledge';
import type { DayRow } from '@/lib/metrics';

export type Status = 'good' | 'ok' | 'attention' | 'nodata';
export type Report = {
  key: MetricKey; status: Status;
  value: string;       // the headline number
  headline: string;    // one-line verdict
  detail: string;      // the evidence, with your numbers
  focus: string[];     // personalised next steps, most relevant first (falls back to the general list)
};
export type Lever = { target: string; driver: string; r: number; n: number; text: string };
export type Briefing = { verdict: string; tone: Status; why: string[]; priorities: { key: MetricKey; title: string; action: string }[] };

type N = number | null;
const vals = (rows: DayRow[], k: keyof DayRow) => rows.map((r) => r[k] as N).filter((v): v is number => v != null);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const avg = (rows: DayRow[], k: keyof DayRow) => mean(vals(rows, k));
const sd = (xs: number[]) => { const m = mean(xs); return m == null || xs.length < 2 ? null : Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };
const f0 = (v: N) => (v == null ? '–' : Math.round(v).toLocaleString());
const f1 = (v: N) => (v == null ? '–' : v.toFixed(1));
const signed = (v: number, digits = 0) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`;
const none = (key: MetricKey): Report => ({ key, status: 'nodata', value: '–', headline: 'No data', detail: KB[key].needs ? `Needs ${KB[key].needs}.` : 'Nothing recorded yet.', focus: [] });

export async function buildCoach(all: DayRow[], units: Units) {
  const u = unitFmt(units);
  // Day-level metrics that accumulate through the day ignore today, which is still in progress.
  const done = all.slice(0, -1);
  const wk = done.slice(-7), base = done.slice(-35, -7), mo = done.slice(-28);
  const nights7 = all.slice(-7), nights28 = all.slice(-28), nightsBase = all.slice(-35, -7);
  const today = all.at(-1);
  const since = all.at(-56)?.date ?? all[0]?.date ?? '';
  const [acts, fit] = await Promise.all([
    db.activity.findMany({ where: { startLocal: { gte: since } }, orderBy: { startLocal: 'asc' }, omit: { raw: true } }),
    db.fitnessAge.findFirst({ orderBy: { date: 'desc' } }),
  ]);
  const R: Report[] = [];
  const push = (r: Report) => R.push(r);

  // ---------- Recovery ----------
  {
    const cur = today?.readiness ?? [...all].reverse().find((r) => r.readiness != null)?.readiness ?? null;
    const a7 = avg(nights7, 'readiness');
    if (cur == null || a7 == null) push(none('readiness'));
    else {
      const lowDays = nights7.filter((r) => r.readiness != null && r.readiness < 55).length;
      const hrvLow = today?.hrv != null && today.hrv30 != null && today.hrv < today.hrv30 * 0.93;
      const sleepLow = today?.sleepScore != null && today.sleepScore < 70;
      const rhrHigh = today?.restingHr != null && avg(base, 'restingHr') != null && today.restingHr >= avg(base, 'restingHr')! + 3;
      const weak = [hrvLow && 'HRV below your norm', sleepLow && `sleep score ${today!.sleepScore}`, rhrHigh && 'resting HR elevated'].filter(Boolean) as string[];
      push({
        key: 'readiness', status: cur >= 75 ? 'good' : cur >= 55 ? 'ok' : 'attention', value: `${cur}`,
        headline: cur >= 75 ? 'Recovered and ready for a demanding day' : cur >= 55 ? 'Normal: train as planned' : 'Under-recovered today',
        detail: `7-day average ${f0(a7)}; ${lowDays} of the last 7 days below 55.${weak.length ? ` Holding it back today: ${weak.join(', ')}.` : ' No single component stands out as weak.'}`,
        focus: cur < 55 ? ['Make today easy: a walk, mobility or a short zone 1–2 session only.', ...(hrvLow || rhrHigh ? ['Prioritise an early night; HRV and resting HR recover fastest with sleep.'] : []), ...KB.readiness.improve.slice(0, 1)]
          : cur >= 75 ? ['Use days like this for your hardest or longest session of the week.', ...KB.readiness.improve.slice(1)] : KB.readiness.improve,
      });
    }
  }
  {
    const a7 = avg(nights7, 'hrv'), b = avg(nightsBase, 'hrv');
    const lo = today?.hrvBaselineLow ?? [...all].reverse().find((r) => r.hrvBaselineLow != null)?.hrvBaselineLow ?? null;
    const hi = today?.hrvBaselineHigh ?? [...all].reverse().find((r) => r.hrvBaselineHigh != null)?.hrvBaselineHigh ?? null;
    if (a7 == null) push(none('hrv'));
    else {
      const bandLo = lo ?? (b != null ? b * 0.92 : null), bandHi = hi ?? (b != null ? b * 1.08 : null);
      const below = bandLo != null && a7 < bandLo, above = bandHi != null && a7 > bandHi;
      const first = avg(all.slice(-56, -28), 'hrv'), last = avg(nights28, 'hrv');
      const trend = first != null && last != null ? last - first : null;
      push({
        key: 'hrv', status: below ? 'attention' : 'good', value: `${f0(a7)} ms`,
        headline: below ? 'Below your balanced range: strain is outpacing recovery' : above ? 'Above your usual range' : 'Balanced: inside your normal range',
        detail: `7-day average ${f0(a7)} ms${bandLo != null ? ` against a ${lo != null ? 'Garmin balanced' : 'personal'} range of ${f0(bandLo)}–${f0(bandHi)} ms` : ''}.${trend != null ? ` Over the last 4 weeks it is ${Math.abs(trend) < 1.5 ? 'stable' : `${trend > 0 ? 'up' : 'down'} ${Math.abs(trend).toFixed(0)} ms`} compared with the 4 weeks before.` : ''}${above ? ' A higher reading is usually positive; if you also feel flat, treat it as fatigue.' : ''}`,
        focus: below ? [KB.hrv.improve[5], KB.hrv.improve[2], KB.hrv.improve[1], KB.hrv.improve[3]] : KB.hrv.improve,
      });
    }
  }
  {
    const a7 = avg(nights7, 'restingHr'), b = avg(nightsBase, 'restingHr');
    if (a7 == null) push(none('restingHr'));
    else {
      const d = b != null ? a7 - b : null;
      const long = avg(all.slice(-90, -60), 'restingHr');
      push({
        key: 'restingHr', status: d != null && d >= 3 ? 'attention' : d != null && d >= 1.5 ? 'ok' : 'good', value: `${f0(a7)} bpm`,
        headline: d == null ? 'Building a baseline' : d >= 3 ? 'Elevated against your baseline' : d <= -1.5 ? 'Trending down: a sign of improving fitness or recovery' : 'Steady at your baseline',
        detail: `7-day average ${f1(a7)} bpm${b != null ? `, ${signed(d!, 1)} bpm against the previous 4 weeks (${f1(b)})` : ''}.${long != null ? ` Two to three months ago it averaged ${f1(long)}.` : ''} ${a7 < 60 ? 'This is in the range typical of regularly active people.' : a7 <= 100 ? 'This is within the normal adult range of 60–100.' : 'A resting rate above 100 is worth discussing with a doctor.'}`,
        focus: d != null && d >= 3 ? [KB.restingHr.improve[3], KB.restingHr.improve[1], KB.restingHr.improve[2]] : KB.restingHr.improve,
      });
    }
  }
  {
    const hi7 = avg(wk, 'bbHigh'), ch = avg(wk, 'bbCharged'), dr = avg(wk, 'bbDrained'), low = avg(wk, 'bbLow');
    if (hi7 == null) push(none('bodyBattery'));
    else {
      const deficit = ch != null && dr != null ? ch - dr : null;
      push({
        key: 'bodyBattery', status: hi7 >= 75 && (deficit ?? 0) > -5 ? 'good' : hi7 >= 50 ? 'ok' : 'attention', value: `${f0(hi7)} peak`,
        headline: hi7 >= 75 ? 'Recharging fully most nights' : hi7 >= 50 ? 'Only partly recharging overnight' : 'Starting most days low on reserves',
        detail: `Average daily peak ${f0(hi7)} and low ${f0(low)} this week. You charged ${f0(ch)} and drained ${f0(dr)} points a day on average${deficit != null ? ` (${deficit >= 0 ? 'a surplus' : 'a deficit'} of ${Math.abs(Math.round(deficit))})` : ''}.`,
        focus: hi7 < 75 ? [KB.bodyBattery.improve[0], KB.bodyBattery.improve[3], KB.bodyBattery.improve[1]] : KB.bodyBattery.improve,
      });
    }
  }
  {
    const s = avg(wk, 'avgStress'), rest = avg(wk, 'stressRestH'), high = mean(wk.map((r) => (r.stressMedH ?? 0) + (r.stressHighH ?? 0)).filter((_, i) => wk[i].stressMedH != null));
    const sl = avg(nights7, 'sleepStress');
    if (s == null) push(none('stress'));
    else push({
      key: 'stress', status: s <= 35 ? 'good' : s <= 50 ? 'ok' : 'attention', value: `${f0(s)} avg`,
      headline: s <= 25 ? 'Mostly restful days' : s <= 35 ? 'Low overall stress' : s <= 50 ? 'Moderate: more stress time than ideal' : 'High sustained stress',
      detail: `Daily average ${f0(s)} this week${rest != null ? `, with ${fmtHours(rest)} a day in the rest state and ${fmtHours(high)} at medium or high stress` : ''}.${sl != null ? ` Stress during sleep averaged ${f0(sl)} (${sl <= 15 ? 'excellent' : sl <= 25 ? 'fine' : 'elevated: your nights are less restorative than they could be'}).` : ''}`,
      focus: sl != null && sl > 25 ? [KB.stress.improve[4], KB.stress.improve[2], KB.stress.improve[0]] : KB.stress.improve,
    });
  }
  {
    const a = avg(nights7, 'respirationAvg'), b = avg(nightsBase, 'respirationAvg');
    if (a == null) push(none('respiration'));
    else {
      const d = b != null ? a - b : 0;
      push({
        key: 'respiration', status: d >= 1.5 ? 'attention' : 'good', value: `${f1(a)} brpm`,
        headline: d >= 1.5 ? 'Higher than your baseline' : 'Stable at your baseline',
        detail: `7-day average ${f1(a)} breaths per minute${b != null ? ` against ${f1(b)} over the previous 4 weeks` : ''}. ${a >= 12 && a <= 20 ? 'Within the typical adult range of 12–20.' : a < 12 ? 'Lower than the typical 12–20; common in fit people and during sleep.' : 'Above the typical 12–20 range.'}`,
        focus: KB.respiration.improve,
      });
    }
  }
  {
    const a = avg(nights28, 'spo2Avg');
    if (a == null) push(none('spo2'));
    else push({
      key: 'spo2', status: a >= 95 ? 'good' : a >= 92 ? 'ok' : 'attention', value: `${f0(a)} %`,
      headline: a >= 95 ? 'Normal' : a >= 92 ? 'Slightly below the usual 95–100%' : 'Persistently low readings',
      detail: `28-day average ${f1(a)}%. ${a < 92 ? 'If you are not at altitude and this persists, mention it to a doctor; check the watch fit first.' : 'Wrist readings vary with fit and movement, so occasional dips are expected.'}`,
      focus: KB.spo2.improve,
    });
  }

  // ---------- Sleep ----------
  {
    const a = avg(nights7, 'sleepH'), a28 = avg(nights28, 'sleepH');
    const pairs = nights7.filter((r) => r.sleepH != null && r.sleepNeedH != null);
    const debt = pairs.reduce((t, r) => t + (r.sleepNeedH! - r.sleepH!), 0);
    const need = mean(pairs.map((r) => r.sleepNeedH!));
    const short = nights7.filter((r) => r.sleepH != null && r.sleepH < 7).length;
    if (a == null) push(none('sleepDuration'));
    else {
      const target = need ?? 7.5;
      const gap = target - a;
      push({
        key: 'sleepDuration', status: a >= 7 && gap <= 0.25 ? 'good' : a >= 6.5 && gap <= 0.75 ? 'ok' : 'attention', value: fmtHours(a),
        headline: gap <= 0.25 && a >= 7 ? 'Meeting your sleep need' : gap <= 0.75 ? `About ${Math.round(Math.max(gap, 7 - a) * 60)} minutes a night short` : 'Running a meaningful sleep debt',
        detail: `7-night average ${fmtHours(a)} (28-night ${fmtHours(a28)})${need != null ? ` against an average Garmin sleep need of ${fmtHours(need)}; net ${debt > 0 ? 'shortfall' : 'surplus'} this week ${fmtHours(Math.abs(debt))}` : '; adults generally need 7–9 hours'}. ${short} of the last 7 nights were under 7 hours.`,
        focus: gap > 0.25 || a < 7 ? [`Move bedtime ${Math.min(60, Math.max(15, Math.round((Math.max(gap, 7 - a) * 60) / 15) * 15))} minutes earlier while keeping the same wake time.`, ...KB.sleepDuration.improve.slice(1, 4)] : KB.sleepDuration.improve,
      });
    }
  }
  {
    const a = avg(nights7, 'sleepScore');
    if (a == null) push(none('sleepScore'));
    else {
      const counts: Record<string, number> = {};
      for (const r of nights28) for (const [k, q] of Object.entries(r.scoreParts ?? {})) if (q === 'FAIR' || q === 'POOR') counts[k] = (counts[k] ?? 0) + 1;
      const worst = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
      const label: Record<string, string> = { duration: 'duration', deep: 'deep sleep', rem: 'REM sleep', light: 'light sleep', stress: 'overnight stress', awakeCount: 'awakenings', restlessness: 'restlessness' };
      const tip: Record<string, string> = { duration: KB.sleepScore.improve[3], stress: KB.sleepScore.improve[1], awakeCount: KB.sleepScore.improve[2], restlessness: KB.sleepScore.improve[2], deep: KB.sleepStages.improve[0], rem: KB.sleepStages.improve[1], light: KB.sleepStages.improve[2] };
      push({
        key: 'sleepScore', status: a >= 80 ? 'good' : a >= 60 ? 'ok' : 'attention', value: f0(a),
        headline: a >= 90 ? 'Excellent sleep quality' : a >= 80 ? 'Good sleep quality' : a >= 60 ? 'Fair: room to improve' : 'Poor sleep quality',
        detail: `7-night average ${f0(a)}; best ${f0(Math.max(...vals(nights7, 'sleepScore')))}, worst ${f0(Math.min(...vals(nights7, 'sleepScore')))}.${worst ? ` The component most often rated fair or poor in the last 4 weeks is ${label[worst[0]] ?? worst[0]} (${worst[1]} nights).` : ' No component has been rated below good recently.'}`,
        focus: worst ? [tip[worst[0]] ?? KB.sleepScore.improve[0], ...KB.sleepScore.improve.slice(0, 2)] : KB.sleepScore.improve,
      });
    }
  }
  {
    const n = nights28.filter((r) => r.sleepH);
    const deep = mean(n.filter((r) => r.deepH != null).map((r) => (r.deepH! / r.sleepH!) * 100)), rem = mean(n.filter((r) => r.remH != null).map((r) => (r.remH! / r.sleepH!) * 100));
    if (deep == null || rem == null || (deep === 0 && rem === 0)) push(none('sleepStages'));
    else {
      const lowDeep = deep < 13, lowRem = rem < 18;
      push({
        key: 'sleepStages', status: lowDeep || lowRem ? (deep < 10 || rem < 14 ? 'attention' : 'ok') : 'good', value: `${f0(deep)}% deep · ${f0(rem)}% REM`,
        headline: lowDeep && lowRem ? 'Both deep and REM are on the low side' : lowDeep ? 'Deep sleep is on the low side' : lowRem ? 'REM sleep is on the low side' : 'Healthy stage balance',
        detail: `Over 28 nights: deep ${f1(deep)}% (${fmtHours(avg(n, 'deepH'))} a night; typical 13–23%) and REM ${f1(rem)}% (${fmtHours(avg(n, 'remH'))}; typical 20–25%). Watch-based staging is approximate, so act on persistent patterns only.`,
        focus: lowDeep && !lowRem ? [KB.sleepStages.improve[0], KB.sleepStages.improve[2]] : lowRem && !lowDeep ? [KB.sleepStages.improve[1], KB.sleepStages.improve[2]] : KB.sleepStages.improve,
      });
    }
  }
  {
    const beds = vals(nights28, 'bedH'), wakes = vals(nights28, 'wakeH');
    const sb = sd(beds), sw = sd(wakes);
    if (sb == null || beds.length < 7) push(none('sleepConsistency'));
    else {
      const m = Math.round(sb * 60), wm = sw != null ? Math.round(sw * 60) : null;
      const clock = (h: number) => { const t = Math.round(h * 60) % 1440, hh = Math.floor(t / 60); return `${hh % 12 || 12}:${String(t % 60).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`; };
      push({
        key: 'sleepConsistency', status: m <= 30 ? 'good' : m <= 60 ? 'ok' : 'attention', value: `±${m} min`,
        headline: m <= 30 ? 'Very regular schedule' : m <= 60 ? 'Somewhat irregular bedtime' : 'Irregular schedule',
        detail: `Over 28 nights your average bedtime was ${clock(mean(beds)!)}, varying by about ±${m} minutes${wm != null ? `, and wake time ${clock(mean(wakes)!)} ±${wm} minutes` : ''}. Under ±30 minutes is the target.`,
        focus: m > 30 ? [`Pick a target bedtime near ${clock(mean(beds)!)} and set a wind-down alarm 45 minutes before it.`, KB.sleepConsistency.improve[0], KB.sleepConsistency.improve[2]] : KB.sleepConsistency.improve,
      });
    }
  }

  // ---------- Training ----------
  {
    const a = avg(wk, 'steps'), goal = [...done].reverse().find((r) => r.stepGoal)?.stepGoal ?? null;
    const hit = wk.filter((r) => r.steps != null && r.stepGoal != null && r.steps >= r.stepGoal).length;
    if (a == null) push(none('steps'));
    else push({
      key: 'steps', status: a >= 8000 || (goal != null && a >= goal) ? 'good' : a >= 5000 ? 'ok' : 'attention', value: f0(a),
      headline: a >= 10000 ? 'Highly active through the day' : a >= 8000 ? 'Solid daily movement' : a >= 5000 ? 'Moderate: a little more would pay off' : 'Low daily movement',
      detail: `7-day average ${f0(a)} steps${goal ? `; goal of ${goal.toLocaleString()} met on ${hit} of 7 days` : ''}. 28-day average ${f0(avg(mo, 'steps'))}.`,
      focus: a < 8000 ? [`Adding about ${f0(Math.min(3000, 8000 - a))} steps a day (roughly ${Math.round(Math.min(3000, 8000 - a) / 100)} minutes of walking) reaches the range where most of the health benefit is captured.`, ...KB.steps.improve] : KB.steps.improve,
    });
  }
  {
    const w1 = done.slice(-7).reduce((t, r) => t + (r.intensityMin ?? 0), 0), w4 = done.slice(-28).reduce((t, r) => t + (r.intensityMin ?? 0), 0) / 4;
    const goal = [...done].reverse().find((r) => r.intensityGoal)?.intensityGoal ?? 150;
    if (!done.some((r) => r.intensityMin != null)) push(none('intensity'));
    else push({
      key: 'intensity', status: w4 >= goal ? 'good' : w4 >= goal * 0.6 ? 'ok' : 'attention', value: `${f0(w1)} min`,
      headline: w4 >= 300 ? 'Well above the health guideline' : w4 >= goal ? 'Meeting the weekly guideline' : 'Below the weekly guideline',
      detail: `${f0(w1)} intensity minutes in the last 7 days; ${f0(w4)} a week on average over 4 weeks, against a goal of ${goal}.`,
      focus: w4 < goal ? [`You are about ${f0(goal - w4)} minutes a week short: one extra 30-minute brisk session plus ${Math.max(0, Math.round((goal - w4 - 30) / 2))} vigorous minutes closes the gap.`, ...KB.intensity.improve] : KB.intensity.improve,
    });
  }
  {
    const r = today?.loadRatio ?? [...all].reverse().find((x) => x.loadRatio != null)?.loadRatio ?? null;
    const l7 = today?.load7 ?? null, l28 = today?.load28 ?? null;
    if (r == null || !l28) push(none('load'));
    else push({
      key: 'load', status: r > 1.5 ? 'attention' : r > 1.3 || r < 0.8 ? 'ok' : 'good', value: r.toFixed(2),
      headline: r > 1.5 ? 'Load has jumped sharply' : r > 1.3 ? 'Building quickly' : r >= 0.8 ? 'Productive, sustainable load' : 'Below your usual load',
      detail: `Last 7 days: ${f0(l7)} load against a 4-week weekly average of ${f0(l28)}, a ratio of ${r.toFixed(2)}. The sustainable range is 0.8–1.3.`,
      focus: r > 1.3 ? [KB.load.improve[2], KB.load.improve[0]] : r < 0.8 ? ['If this is not a planned easy week, add one session to bring the week back toward your average.', KB.load.improve[1]] : KB.load.improve,
    });
  }
  {
    const recent = acts.filter((a) => a.startLocal >= (all.at(-28)?.date ?? ''));
    const z = [0, 0, 0, 0, 0];
    for (const a of recent) [a.z1Sec, a.z2Sec, a.z3Sec, a.z4Sec, a.z5Sec].forEach((v, i) => (z[i] += v ?? 0));
    const tot = z.reduce((x, y) => x + y, 0);
    if (tot < 3 * 3600) push(none('polarization'));
    else {
      const low = ((z[0] + z[1]) / tot) * 100, mod = (z[2] / tot) * 100, high = ((z[3] + z[4]) / tot) * 100;
      const highMin = (z[3] + z[4]) / 60 / 4;
      push({
        key: 'polarization', status: low >= 70 && low <= 92 ? 'good' : 'ok', value: `${f0(low)}% easy`,
        headline: low > 92 ? 'Almost all easy: little high-intensity stimulus' : low >= 70 ? 'Well balanced' : mod > high ? 'Too much time in the moderate middle' : 'Hard-heavy: little easy volume',
        detail: `Last 4 weeks of heart-rate zone time (${fmtHours(tot / 3600)}): ${f0(low)}% low (Z1–2), ${f0(mod)}% moderate (Z3), ${f0(high)}% high (Z4–5), about ${f0(highMin)} minutes a week above zone 3. The usual target is roughly 80 / 20.`,
        focus: low > 92 ? [`You have a strong easy base and almost no hard work. Add one session a week with 12–20 minutes in zones 4–5 (for example 4 × 4 minutes hard, 3 minutes easy); this is the fastest route to a higher VO2 max.`, KB.polarization.improve[3]]
          : low < 70 ? [KB.polarization.improve[0], KB.polarization.improve[2], KB.polarization.improve[3]] : KB.polarization.improve,
      });
    }
  }
  {
    // Compare like with like: the sport with the most qualifying sessions, steady efforts of 15+ minutes.
    const ok = acts.filter((a) => a.avgHr && a.avgHr > 80 && (a.durationSec ?? 0) >= 900 && ((isPaceSport(a.type) && a.avgSpeed) || a.normPower || a.avgPower));
    const byType = new Map<string, typeof ok>();
    for (const a of ok) byType.set(a.type, [...(byType.get(a.type) ?? []), a]);
    const best = [...byType.entries()].sort((x, y) => y[1].length - x[1].length)[0];
    // Efficiency only compares fairly at similar effort, so keep sessions within ±10 bpm of the sport's median heart rate.
    const sortedHr = (best?.[1] ?? []).map((a) => a.avgHr!).sort((x, y) => x - y), medHr = sortedHr[Math.floor(sortedHr.length / 2)];
    const list = (best?.[1] ?? []).filter((a) => Math.abs(a.avgHr! - medHr) <= 10);
    if (!best || list.length < 6) push({ ...none('efficiency'), detail: best ? 'Needs six or more sessions of one sport at a similar heart rate in the last 8 weeks to compare fairly.' : `Needs ${KB.efficiency.needs}.` });
    else {
      const type = best[0];
      const power = !isPaceSport(type), indoor = /treadmill|indoor|virtual/i.test(type);
      const ef = (a: (typeof list)[number]) => (power ? (a.normPower ?? a.avgPower!) / a.avgHr! : (a.avgSpeed! * 60) / a.avgHr!);
      const half = Math.floor(list.length / 2);
      const e1 = mean(list.slice(0, half).map(ef))!, e2 = mean(list.slice(half).map(ef))!;
      const pct = ((e2 - e1) / e1) * 100;
      push({
        key: 'efficiency', status: pct >= 2 ? 'good' : 'ok', value: `${signed(pct, 1)}%`,
        headline: pct >= 2 ? 'Improving: more output per heartbeat' : pct > -5 ? 'Holding steady' : 'Lower in recent sessions',
        detail: `Across ${list.length} ${type.replace(/_/g, ' ')} sessions at a similar heart rate (around ${Math.round(medHr)} bpm) in the last 8 weeks, efficiency went from ${e1.toFixed(2)} to ${e2.toFixed(2)} ${power ? 'W' : 'm/min'} per bpm (older half vs recent half). ${indoor ? 'Indoor distance is estimated by the watch, and incline is not captured, so treat this as a rough guide. ' : ''}Terrain, heat and session type all affect it: read the direction over many sessions.`,
        focus: pct < 2 ? KB.efficiency.improve : [KB.efficiency.improve[1], KB.efficiency.improve[0]],
      });
    }
  }
  {
    const v = acts.filter((a) => a.vo2max).map((a) => a.vo2max!);
    if (!v.length) push(none('vo2max'));
    else {
      const cur = v.at(-1)!, d = cur - v[0];
      push({
        key: 'vo2max', status: d >= 0 ? 'good' : d > -1.5 ? 'ok' : 'attention', value: f1(cur),
        headline: d >= 1 ? 'Rising' : d > -1 ? 'Stable' : 'Falling',
        detail: `Latest estimate ${f1(cur)} ml/kg/min, ${signed(d, 1)} over the last 8 weeks (${v.length} readings). See Garmin Connect for your age- and sex-based category.`,
        focus: KB.vo2max.improve,
      });
    }
  }
  {
    if (!fit?.fitnessAge || !fit.chronologicalAge) push(none('fitnessAge'));
    else {
      const gap = fit.chronologicalAge - fit.fitnessAge;
      const c = fit.components ? JSON.parse(fit.components) : {};
      const names: Record<string, string> = { vigorousDaysAvg: 'days per week with vigorous activity', vigorousMinutesAvg: 'vigorous minutes per week', bmi: 'BMI', bodyFat: 'body fat', rhr: 'resting heart rate' };
      const top = Object.entries(c).filter(([, x]: any) => x?.priority != null && x.targetValue != null).sort((x: any, y: any) => x[1].priority - y[1].priority)[0] as [string, any] | undefined;
      push({
        key: 'fitnessAge', status: gap >= 0 ? 'good' : gap >= -3 ? 'ok' : 'attention', value: `${f0(fit.fitnessAge)}`,
        headline: gap > 0 ? `${f0(gap)} year${Math.round(gap) === 1 ? '' : 's'} younger than your actual age` : gap === 0 ? 'Equal to your actual age' : `${f0(-gap)} years older than your actual age`,
        detail: `Fitness age ${f0(fit.fitnessAge)} against an actual age of ${fit.chronologicalAge}.${top ? ` Garmin's top lever for you: ${names[top[0]] ?? top[0]}, currently ${f1(top[1].value)} against a target of ${f1(top[1].targetValue)}.` : ''}`,
        focus: top ? [`Close the gap on ${names[top[0]] ?? top[0]}: ${f1(top[1].value)} now, ${f1(top[1].targetValue)} target.`, ...KB.fitnessAge.improve] : KB.fitnessAge.improve,
      });
    }
  }
  {
    const runs = acts.filter((a) => /run/i.test(a.type) && a.gctMs && a.avgCadence && (a.avgSpeed ?? 0) >= 2.2); // true running pace only (faster than ~7:35/km)
    const any = acts.some((a) => a.gctMs);
    if (runs.length < 3) push({ ...none('runningForm'), detail: any ? 'Your recorded sessions with running dynamics are at walking or run-walk pace, where running norms do not apply. This fills in after three or more runs faster than about 7:30 per km (12:00 per mile).' : `Needs ${KB.runningForm.needs}.` });
    else {
      const cad = mean(runs.map((a) => a.avgCadence!))!, gct = mean(runs.map((a) => a.gctMs!))!, vr = mean(runs.filter((a) => a.vertRatio).map((a) => a.vertRatio!));
      const flags = [cad < 160 && 'low cadence', gct > 300 && 'long ground contact', vr != null && vr > 10 && 'high vertical ratio'].filter(Boolean) as string[];
      push({
        key: 'runningForm', status: flags.length === 0 ? 'good' : flags.length === 1 ? 'ok' : 'attention', value: `${f0(cad)} spm`,
        headline: flags.length ? `Worth working on: ${flags.join(', ')}` : 'Economical form for your pace',
        detail: `Across ${runs.length} runs (average pace ${u.pace(mean(runs.map((a) => a.avgSpeed!)))}): cadence ${f0(cad)} spm, ground contact ${f0(gct)} ms${vr != null ? `, vertical ratio ${f1(vr)}%` : ''}.`,
        focus: cad < 160 ? [KB.runningForm.improve[0], KB.runningForm.improve[1], KB.runningForm.improve[3]] : KB.runningForm.improve.slice(1),
      });
    }
  }

  // ---------- Body ----------
  {
    const w = all.filter((r) => r.weightKg != null);
    if (w.length < 2) push(none('weight'));
    else {
      const cur = w.at(-1)!, prev = w.find((r) => r.date >= (all.at(-28)?.date ?? '')) ?? w[0];
      const d = cur.weightKg! - prev.weightKg!;
      push({
        key: 'weight', status: 'ok', value: u.weight(cur.weightKg),
        headline: Math.abs(d) < 0.4 ? 'Stable over the last 4 weeks' : `${d > 0 ? 'Up' : 'Down'} ${u.weight(Math.abs(d))} over the last 4 weeks`,
        detail: `Latest ${u.weight(cur.weightKg)}${cur.bmi ? `, BMI ${f1(cur.bmi)} (18.5–24.9 is the standard healthy range; it overstates fatness in muscular people)` : ''}${cur.bodyFatPct ? `, body fat ${f1(cur.bodyFatPct)}%` : ''}. ${w.length} weigh-ins on record.`,
        focus: KB.weight.improve,
      });
    }
  }
  {
    const h = vals(wk, 'hydrationMl').filter((v) => v > 0);
    if (!h.length) push(none('hydration'));
    else push({ key: 'hydration', status: 'ok', value: `${f0(mean(h))} ml`, headline: `Logged on ${h.length} of the last 7 days`, detail: `Average ${f0(mean(h))} ml on logged days.`, focus: KB.hydration.improve });
  }

  return { reports: R, levers: findLevers(all), briefing: brief(R, today, all) };
}

// ---------- personal levers: which of your own behaviours move your recovery ----------
const DRIVERS: { key: keyof DayRow; label: string; lag: 0 | 1 }[] = [
  { key: 'avgStress', label: 'daytime stress', lag: 1 },
  { key: 'trainingLoad', label: 'training load', lag: 1 },
  { key: 'activityMin', label: 'workout time', lag: 1 },
  { key: 'steps', label: 'steps', lag: 1 },
  { key: 'intensityMin', label: 'intensity minutes', lag: 1 },
  { key: 'bbDrained', label: 'Body Battery drained', lag: 1 },
  { key: 'bedH', label: 'bedtime', lag: 0 },
  { key: 'sleepH', label: 'sleep duration', lag: 0 },
  { key: 'sleepStress', label: 'stress during sleep', lag: 0 },
];
const TARGETS: { key: keyof DayRow; label: string; unit: string; digits: number }[] = [
  { key: 'sleepScore', label: 'sleep score', unit: '', digits: 0 },
  { key: 'hrv', label: 'overnight HRV', unit: ' ms', digits: 0 },
  { key: 'deepH', label: 'deep sleep', unit: ' h', digits: 1 },
  { key: 'restingHr', label: 'resting HR', unit: ' bpm', digits: 0 },
];

function findLevers(all: DayRow[]): Lever[] {
  const rows = all.slice(-120);
  const out: Lever[] = [];
  for (const t of TARGETS) for (const d of DRIVERS) {
    if (d.key === t.key || (t.key === 'sleepScore' && (d.key === 'sleepH' || d.key === 'sleepStress'))) continue; // those are inputs to the score itself
    if (d.key === 'sleepStress' && (t.key === 'hrv' || t.key === 'restingHr')) continue; // Garmin derives sleep stress from the same night's HRV and heart rate: circular
    const pts: [number, number][] = [];
    for (let i = d.lag; i < rows.length; i++) {
      const x = rows[i - d.lag][d.key] as N, y = rows[i][t.key] as N;
      if (x != null && y != null) pts.push([x, y]);
    }
    if (pts.length < 21) continue;
    const mx = mean(pts.map((p) => p[0]))!, my = mean(pts.map((p) => p[1]))!;
    let sxy = 0, sxx = 0, syy = 0;
    for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
    if (!sxx || !syy) continue;
    const r = sxy / Math.sqrt(sxx * syy);
    if (Math.abs(r) < 0.25) continue;
    const sorted = [...pts].sort((a, b) => a[0] - b[0]), third = Math.floor(sorted.length / 3);
    const lo = mean(sorted.slice(0, third).map((p) => p[1]))!, hi = mean(sorted.slice(-third).map((p) => p[1]))!;
    const when = d.lag ? 'the day before' : 'that night';
    const word = d.key === 'bedH' ? ['earliest bedtimes', 'latest bedtimes'] : [`lowest ${d.label}`, `highest ${d.label}`];
    out.push({
      target: t.label, driver: d.label, r, n: pts.length,
      text: `Your ${t.label} averages ${lo.toFixed(t.digits)}${t.unit} after your ${word[0]} and ${hi.toFixed(t.digits)}${t.unit} after your ${word[1]} (${d.label} ${when}; ${pts.length} days, r = ${r.toFixed(2)}).`,
    });
  }
  // keep the strongest driver per target first, then the rest
  const perDriver = new Map<string, number>(), perTarget = new Map<string, number>();
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).filter((l) => {
    const d = perDriver.get(l.driver) ?? 0, t = perTarget.get(l.target) ?? 0;
    if (d >= 2 || t >= 2) return false; // variety: no single driver or outcome dominates the list
    perDriver.set(l.driver, d + 1); perTarget.set(l.target, t + 1);
    return true;
  }).slice(0, 6);
}

function brief(R: Report[], today: DayRow | undefined, all: DayRow[]): Briefing {
  const get = (k: MetricKey) => R.find((r) => r.key === k);
  const rd = today?.readiness ?? null, ratio = get('load')?.status, hrv = get('hrv')?.status;
  const why: string[] = [];
  let verdict = 'Train as planned', tone: Status = 'ok';
  if (rd == null) { verdict = 'Not enough data for a call today'; tone = 'nodata'; }
  else if (rd < 55 || hrv === 'attention') { verdict = 'Recovery day: keep it easy'; tone = 'attention'; }
  else if (rd >= 75 && ratio !== 'attention') { verdict = 'Green light for a hard or long session'; tone = 'good'; }
  if (rd != null) why.push(`Readiness ${rd}`);
  if (today?.hrv != null && today.hrv7 != null) why.push(`HRV ${today.hrv} ms last night (7-day ${Math.round(today.hrv7)})`);
  if (today?.sleepH != null) why.push(`slept ${fmtHours(today.sleepH)}${today.sleepScore != null ? `, score ${today.sleepScore}` : ''}`);
  const lr = today?.loadRatio ?? [...all].reverse().find((x) => x.loadRatio != null)?.loadRatio;
  if (lr != null) why.push(`load ratio ${lr.toFixed(2)}`);
  const order: MetricKey[] = ['sleepDuration', 'hrv', 'restingHr', 'load', 'sleepConsistency', 'sleepScore', 'stress', 'bodyBattery', 'polarization', 'intensity', 'steps', 'sleepStages', 'runningForm', 'fitnessAge', 'respiration', 'spo2', 'vo2max'];
  const rank = (r: Report) => (r.status === 'attention' ? 0 : 1) * 100 + order.indexOf(r.key);
  const priorities = R.filter((r) => (r.status === 'attention' || r.status === 'ok') && r.focus.length && order.includes(r.key)).sort((a, b) => rank(a) - rank(b)).slice(0, 3)
    .map((r) => ({ key: r.key, title: KB[r.key].title, action: r.focus[0] }));
  return { verdict, tone, why, priorities };
}
