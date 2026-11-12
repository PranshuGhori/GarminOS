// Integration tests against a throwaway SQLite file (prisma/test.db, created by `npm test`).
// They cover account shapes that differ from the developer's own: empty, steps-only, and full-featured.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { buildCoach } from '../src/lib/coach';
import { addDays, today } from '../src/lib/dates';
import { db } from '../src/lib/db';
import { loadDays } from '../src/lib/metrics';

const wipe = async () => { for (const m of ['activity', 'sleep', 'dailyMetric', 'bodyComposition', 'fitnessAge'] as const) await (db[m] as any).deleteMany(); };
after(() => db.$disconnect());

test('empty database', async () => {
  await wipe();
  assert.deepEqual(await loadDays(), []);
});

test('steps-only tracker: no HRV, sleep, stress or activities', async () => {
  await wipe();
  const end = today();
  await db.dailyMetric.createMany({ data: Array.from({ length: 40 }, (_, i) => ({ date: addDays(end, -i), steps: 4000 + i * 50 })) });
  const rows = await loadDays();
  assert.equal(rows.length, 40);
  assert.ok(rows.every((r) => r.readiness == null), 'no readiness without recovery signals');
  const { reports, briefing, levers } = await buildCoach(rows, 'metric');
  const by = Object.fromEntries(reports.map((r) => [r.key, r.status]));
  assert.equal(by.steps, 'attention');
  for (const k of ['hrv', 'restingHr', 'sleepDuration', 'bodyBattery', 'polarization', 'vo2max', 'spo2', 'weight']) assert.equal(by[k], 'nodata', k);
  assert.equal(briefing.tone, 'nodata');
  assert.deepEqual(levers, []);
});

test('full-featured account: every metric gets a verdict and advice', async () => {
  await wipe();
  const end = today();
  for (let i = 0; i < 70; i++) {
    const date = addDays(end, -i), hard = i % 7 === 2;
    await db.dailyMetric.create({ data: { date, restingHr: 50 + (i % 3), avgStress: 30 + (i % 9), steps: 9000, stepGoal: 8000, intensityModerate: 30, intensityVigorous: hard ? 30 : 0, intensityGoal: 150,
      bbCharged: 70, bbDrained: 68, bbHigh: 90, bbLow: 20, hrvLastNight: 60 + (i % 5), hrvBaselineLow: 55, hrvBaselineHigh: 68, respirationAvg: 14, spo2Avg: 96, hydrationMl: 2000,
      stressRestSec: 36000, stressLowSec: 7200, stressMedSec: 3600, stressHighSec: 600 } });
    await db.sleep.create({ data: { date, totalSec: 27000, deepSec: 5000, remSec: 6000, lightSec: 16000, awakeSec: 900, score: 82, avgStress: 14, needMin: 470, bedtimeMin: 1380 + (i % 4) * 10, wakeMin: 420 } });
    if (i % 2 === 0) await db.activity.create({ data: { id: `t${i}`, name: 'Run', type: 'running', startLocal: `${date} 07:00:00`, startGmt: new Date(), distanceM: 8000, durationSec: 2700, avgSpeed: 2.96, avgHr: 145, trainingLoad: hard ? 180 : 80,
      z1Sec: 300, z2Sec: hard ? 1500 : 2300, z3Sec: 100, z4Sec: hard ? 700 : 0, z5Sec: hard ? 100 : 0, gctMs: 250, avgCadence: 170, vertRatio: 7.8, vo2max: 50 + (70 - i) * 0.02 } });
    if (i % 10 === 0) await db.bodyComposition.create({ data: { date, weightKg: 72 + i * 0.01, bmi: 22.5, bodyFatPct: 15 } });
  }
  await db.fitnessAge.create({ data: { date: end, chronologicalAge: 40, fitnessAge: 35, components: '{}' } });
  const rows = await loadDays();
  const { reports, briefing } = await buildCoach(rows, 'imperial');
  const missing = reports.filter((r) => r.status === 'nodata').map((r) => r.key);
  assert.deepEqual(missing, [], 'nothing should be missing for a full account');
  for (const r of reports) assert.ok(r.headline && r.detail && r.focus.length, r.key);
  assert.match(reports.find((r) => r.key === 'weight')!.value, /lb$/);
  assert.ok(rows.at(-1)!.readiness != null && rows.at(-1)!.loadRatio != null);
  assert.notEqual(briefing.tone, 'nodata');
});
