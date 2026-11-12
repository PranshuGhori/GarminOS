// Generates ~200 days of plausible demo data into prisma/mock.db. Run via `npm run seed:mock`.
import { db } from '../src/lib/db';
import { addDays, today } from '../src/lib/dates';

let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

async function main() {
  for (const m of ['fitnessAge', 'activityLap', 'activityStream', 'activity', 'nightSeries', 'sleep', 'dailyMetric', 'bodyComposition', 'syncLog'] as const) await (db[m] as any).deleteMany();
  const DAYS = 200, end = today();
  let fatigue = 0, weight = 74;
  const daily: any[] = [], sleeps: any[] = [], nights: any[] = [], body: any[] = [];
  let actId = 9000000;

  for (let i = DAYS - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const dow = new Date(date + 'T12:00:00').getDay();
    const trains = dow !== 1 && rnd() < 0.72;
    const hard = trains && (dow === 3 || dow === 6) && rnd() < 0.8;
    const load = trains ? (hard ? 180 + rnd() * 120 : 60 + rnd() * 70) : 0;
    const stress = Math.round(clamp(30 + fatigue * 0.08 + gauss() * 7 + (dow >= 1 && dow <= 5 ? 5 : 0), 12, 80));
    const sleepSec = Math.round(clamp(7.4 * 3600 - stress * 40 + gauss() * 2700, 4.5 * 3600, 9.5 * 3600));
    const deep = Math.round(sleepSec * clamp(0.2 - stress * 0.0012 + gauss() * 0.03, 0.08, 0.3));
    const rem = Math.round(sleepSec * clamp(0.22 + gauss() * 0.03, 0.12, 0.3));
    const awake = Math.round(600 + rnd() * 1800);
    const score = Math.round(clamp(55 + (sleepSec / 3600 - 6) * 12 + (deep / sleepSec) * 60 - stress * 0.15 + gauss() * 4, 30, 99));
    const hrv = Math.round(clamp(62 - fatigue * 0.07 + (score - 75) * 0.25 + gauss() * 4, 30, 95));
    const rhr = Math.round(clamp(49 + fatigue * 0.03 - (hrv - 60) * 0.12 + gauss() * 1.2, 40, 65));
    const active = Math.round(350 + load * 3.2 + rnd() * 200);
    const charged = Math.round(clamp(score * 0.8 + gauss() * 6, 20, 95));
    weight += gauss() * 0.15 - 0.004;
    daily.push({
      date, restingHr: rhr, minHr: rhr - 3, maxHr: Math.round(trains ? 150 + rnd() * 30 : 105 + rnd() * 20), avgStress: stress, maxStress: Math.min(99, stress + 40),
      bbCharged: charged, bbDrained: Math.round(clamp(charged + gauss() * 8, 15, 95)), bbHigh: Math.round(clamp(charged + 15, 30, 100)), bbLow: Math.round(5 + rnd() * 20),
      steps: Math.round(5500 + load * 45 + rnd() * 4000), distanceM: 4000 + load * 40 + rnd() * 3000, floors: Math.round(rnd() * 18),
      intensityModerate: Math.round(trains && !hard ? 30 + rnd() * 30 : rnd() * 10), intensityVigorous: Math.round(hard ? 30 + rnd() * 30 : trains ? rnd() * 15 : 0),
      activeKcal: active, restingKcal: 1780 + Math.round(gauss() * 15), totalKcal: active + 1780, spo2Avg: +(95.5 + rnd() * 2.5).toFixed(1), respirationAvg: +(13.5 + rnd() * 2).toFixed(1),
      hydrationMl: Math.round(1800 + rnd() * 1400), hrvLastNight: hrv, hrvWeeklyAvg: hrv, hrvBaselineLow: 54, hrvBaselineHigh: 68, hrvStatus: hrv < 54 ? 'LOW' : 'BALANCED',
      stressRestSec: Math.round((11 - stress * 0.08) * 3600), stressLowSec: Math.round((2 + stress * 0.04) * 3600), stressMedSec: Math.round(stress * 0.035 * 3600), stressHighSec: Math.round(Math.max(0, stress - 35) * 0.03 * 3600),
      stepGoal: 10000, intensityGoal: 150,
      bbEvents: JSON.stringify([{ type: 'SLEEP', startLocal: `${date}T23:10:00.0`, impact: charged, durationSec: sleepSec, feedback: null }, ...(trains ? [{ type: 'ACTIVITY', startLocal: `${date}T07:10:00.0`, impact: -Math.round(load / 12), durationSec: 3000, feedback: hard ? 'HIGHLY_IMPACTING_VO2MAX' : 'EASY_AEROBIC_BASE' }] : [])]),
    });
    const endGmt = new Date(date + 'T06:30:00Z').getTime() + Math.round(gauss() * 1800e3);
    const startGmt = endGmt - (sleepSec + awake) * 1000;
    sleeps.push({ date, totalSec: sleepSec, deepSec: deep, remSec: rem, lightSec: sleepSec - deep - rem, awakeSec: awake, napSec: 0, score, avgStress: +(stress * 0.45).toFixed(1), avgHr: rhr + 4, avgRespiration: 13.8, awakeCount: Math.round(rnd() * 4), startGmt: new Date(startGmt), endGmt: new Date(endGmt),
      needMin: Math.round(clamp(480 + fatigue * 0.25 + gauss() * 10, 450, 560)), needBaselineMin: 480,
      bedtimeMin: (((Math.round(startGmt / 60000) % 1440) + 1440) % 1440), wakeMin: (((Math.round(endGmt / 60000) % 1440) + 1440) % 1440),
      scoreParts: JSON.stringify({ duration: sleepSec > 7 * 3600 ? 'GOOD' : 'FAIR', deep: deep / sleepSec > 0.16 ? 'EXCELLENT' : 'FAIR', rem: 'GOOD', light: 'GOOD', stress: stress < 35 ? 'EXCELLENT' : 'FAIR', awakeCount: 'GOOD', restlessness: 'GOOD' }) });
    if (i < 30) {
      const hr: number[][] = [], hv: number[][] = [];
      const lowAt = hard ? 0.7 : 0.35;
      for (let t = startGmt; t <= endGmt; t += 120e3) {
        const p = (t - startGmt) / (endGmt - startGmt);
        hr.push([t, Math.round(rhr + 2 + 14 * (p - lowAt) ** 2 * 3 + gauss() * 1.2)]);
        if (Math.round((t - startGmt) / 120e3) % 3 === 0) hv.push([t, Math.round(hrv - 25 * (p - lowAt) ** 2 + gauss() * 6)]);
      }
      nights.push({ date, hr: JSON.stringify(hr), hrv: JSON.stringify(hv) });
    }
    if (i % 3 === 0) body.push({ date, weightKg: +weight.toFixed(1), bmi: +(weight / 3.24).toFixed(1), bodyFatPct: +(15 + gauss() * 0.4).toFixed(1), bodyWaterPct: 58, muscleMassKg: +(weight * 0.47).toFixed(1) });

    if (trains) {
      const kind = dow === 0 ? 'cycling' : dow === 2 || dow === 5 ? (rnd() < 0.5 ? 'strength_training' : 'running') : 'running';
      const dur = kind === 'strength_training' ? 2400 + rnd() * 1500 : kind === 'cycling' ? 4500 + rnd() * 3600 : hard ? 2700 + rnd() * 900 : 2100 + rnd() * 2400;
      const speed = kind === 'running' ? (hard ? 3.55 : 3.0) + gauss() * 0.1 + (DAYS - i) * 0.0008 : kind === 'cycling' ? 7.4 + gauss() * 0.4 : 0;
      const avgHr = Math.round(kind === 'strength_training' ? 112 + rnd() * 10 : hard ? 160 + gauss() * 3 : 138 + gauss() * 4);
      const hiShare = kind === 'strength_training' ? 0.02 : hard ? 0.45 : 0.04;
      const z = [0.12, 1 - 0.12 - hiShare - (hard ? 0.18 : 0.06), hard ? 0.18 : 0.06, hiShare * 0.7, hiShare * 0.3].map((s) => Math.round(s * dur));
      const id = String(actId++);
      const power = kind === 'cycling' ? 185 + gauss() * 12 : null;
      const name = kind === 'running' ? (hard ? 'Interval Run' : 'Easy Run') : kind === 'cycling' ? 'Weekend Ride' : 'Strength';
      await db.activity.create({ data: {
        id, name, type: kind, startLocal: `${date} 07:1${Math.floor(rnd() * 9)}:00`, startGmt: new Date(date + 'T07:10:00Z'),
        distanceM: speed * dur || null, durationSec: dur, movingSec: dur * 0.98, elevationGain: speed ? Math.round(40 + rnd() * (kind === 'cycling' ? 700 : 150)) : null,
        avgSpeed: speed || null, maxSpeed: speed ? speed * 1.35 : null, avgHr, maxHr: avgHr + (hard ? 22 : 14), calories: Math.round(dur / 60 * (hard ? 13 : 9.5)),
        aerobicTe: +(hard ? 3.8 + rnd() * 0.8 : 2.3 + rnd() * 0.8).toFixed(1), anaerobicTe: +(hard ? 1.5 + rnd() * 1.5 : rnd() * 0.5).toFixed(1), teLabel: hard ? 'VO2MAX' : 'AEROBIC_BASE',
        trainingLoad: Math.round(load), avgPower: power, normPower: power ? power * 1.05 : null, avgCadence: kind === 'running' ? 172 + gauss() * 3 : kind === 'cycling' ? 86 : null,
        vo2max: kind === 'running' ? +(51 + (DAYS - i) * 0.012 + gauss() * 0.3).toFixed(1) : null,
        z1Sec: z[0], z2Sec: z[1], z3Sec: z[2], z4Sec: z[3], z5Sec: z[4], locationName: 'Demo City', fitStatus: 'ok',
        ...(kind === 'running' ? { gctMs: 245 + gauss() * 8, vertOscCm: 8.6 + gauss() * 0.3, strideCm: 112 + gauss() * 4, vertRatio: 7.6 + gauss() * 0.3, gapSpeed: speed * 1.01,
          best1kSec: 1000 / (speed * (hard ? 1.2 : 1.05)), bestMileSec: 1609 / (speed * (hard ? 1.15 : 1.04)), best5kSec: speed * dur >= 5000 ? 5000 / (speed * 1.02) : null, isPr: rnd() < 0.05 } : {}),
        bbImpact: -Math.round(load / 12),
        sets: kind === 'strength_training' ? JSON.stringify([{ category: 'SQUAT', sub: 'BACK_SQUAT', sets: 4, reps: 24, durationSec: 420, maxWeightKg: 90 }, { category: 'BENCH_PRESS', sub: null, sets: 4, reps: 32, durationSec: 380, maxWeightKg: 70 }, { category: 'ROW', sub: 'SEATED_CABLE_ROW', sets: 3, reps: 36, durationSec: 300, maxWeightKg: 55 }]) : null,
      } });
      const nLaps = kind === 'strength_training' ? 1 : Math.max(2, Math.round((speed * dur) / (kind === 'cycling' ? 5000 : 1000)));
      const lapDur = dur / nLaps;
      await db.activityLap.createMany({ data: Array.from({ length: nLaps }, (_, k) => {
        const s = speed ? speed * (1 + gauss() * 0.03 + (hard && k % 2 ? 0.12 : hard ? -0.1 : 0)) : null;
        return { activityId: id, index: k, distanceM: s ? s * lapDur : null, durationSec: lapDur, avgSpeed: s, maxSpeed: s ? s * 1.15 : null, avgHr: Math.round(avgHr - 6 + (k / nLaps) * 10 + (hard && k % 2 ? 8 : 0)), maxHr: avgHr + 12, avgPower: power ? Math.round(power + gauss() * 10) : null, avgCadence: kind === 'running' ? 172 : null, elevationGain: Math.round(rnd() * 15) };
      }) });
      const N = 300, st = { t: [] as number[], hr: [] as number[], speed: [] as (number | null)[], cadence: [] as (number | null)[], power: [] as (number | null)[], alt: [] as number[], lat: [] as (number | null)[], lng: [] as (number | null)[] };
      const loop = speed ? (speed * dur) / 111000 / 6.5 : 0;
      for (let k = 0; k < N; k++) {
        const p = k / N, surge = hard && Math.floor(p * 10) % 2 ? 1 : 0;
        st.t.push(Math.round(p * dur)); st.hr.push(Math.round(avgHr - 14 + 18 * Math.min(1, p * 4) + surge * 10 + gauss() * 1.5));
        st.speed.push(speed ? +(speed * (1 + surge * 0.15 - (hard ? 0.07 : 0)) + gauss() * 0.08).toFixed(2) : null);
        st.power.push(power ? Math.round(power + gauss() * 25) : null); st.alt.push(Math.round(120 + 20 * Math.sin(p * 9))); st.cadence.push(kind === 'running' ? Math.round(172 + surge * 8 + gauss() * 2) : kind === 'cycling' ? Math.round(86 + gauss() * 4) : null);
        st.lat.push(speed ? 47.37 + loop * Math.sin(p * 2 * Math.PI) * (1 + 0.25 * Math.sin(p * 14)) : null); st.lng.push(speed ? 8.54 + loop * 1.5 * (1 - Math.cos(p * 2 * Math.PI)) : null);
      }
      await db.activityStream.create({ data: { activityId: id, points: JSON.stringify(st) } });
    }
    fatigue = fatigue * 0.82 + load * 0.35;
  }
  await db.dailyMetric.createMany({ data: daily });
  await db.sleep.createMany({ data: sleeps });
  await db.nightSeries.createMany({ data: nights });
  await db.bodyComposition.createMany({ data: body });
  await db.fitnessAge.create({ data: { date: end, chronologicalAge: 34, fitnessAge: 29, components: JSON.stringify({ vigorousMinutesAvg: { value: 96, targetValue: 75 } }) } });
  await db.syncLog.create({ data: { status: 'ok', finishedAt: new Date(), message: 'Mock seed' } });
  console.log(`✓ Seeded ${daily.length} days, ${sleeps.length} nights, ${actId - 9000000} activities into prisma/mock.db`);
  await db.$disconnect();
}
main();
