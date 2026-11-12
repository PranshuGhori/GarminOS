// Mapper tests use synthetic payloads shaped like real Garmin Personal API responses.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapActivity, mapDaily, mapSleep } from '../src/lib/garmin/map';

test('mapDaily: full payload', () => {
  const d = mapDaily({
    calendarDate: '2026-01-05',
    heartRate: { restingValue: 52, minValue: 47, maxValue: 151 },
    stress: { avgLevel: 31, maxLevel: 90, restDurationInMillis: 36_000_000, lowStressDurationInMillis: 7_200_000, mediumStressDurationInMillis: 3_600_000, highStressDurationInMillis: 600_000 },
    bodyBattery: { chargedValue: 70, drainedValue: 65, maxValue: 95, minValue: 22, activityEvents: [{ eventType: 'SLEEP', eventStartTimeLocal: '2026-01-04T23:00:00.0', bodyBatteryImpact: 60, durationInMillis: 28_800_000, shortFeedback: 'NONE' }] },
    movement: { steps: { value: 9100, goal: 8000, distanceInMeters: 7000 }, floorsAscended: { value: 12 } },
    intensityMinutes: { moderate: 20, vigorous: 15, goal: 150 },
    calories: { burnedActive: 610.4, burnedResting: 1800, burnedTotal: 2410.4 },
    respiration: { avgValue: 14.2 }, pulseOx: { avgValue: 96 }, hydration: { consumedInMl: 1500 },
  });
  assert.equal(d.restingHr, 52);
  assert.equal(d.stressRestSec, 36000);
  assert.equal(d.stepGoal, 8000);
  assert.equal(d.spo2Avg, 96);
  assert.deepEqual(JSON.parse(d.bbEvents!)[0], { type: 'SLEEP', startLocal: '2026-01-04T23:00:00.0', impact: 60, durationSec: 28800, feedback: null });
});

test('mapDaily: a basic tracker with almost nothing recorded does not throw', () => {
  const d = mapDaily({ calendarDate: '2026-01-05', movement: { steps: { value: 3000 } } });
  assert.equal(d.steps, 3000);
  for (const k of ['restingHr', 'avgStress', 'bbCharged', 'spo2Avg', 'respirationAvg', 'bbEvents', 'stepGoal'] as const) assert.equal(d[k], null, k);
  assert.doesNotThrow(() => mapDaily({}));
});

test('mapSleep: clock times come from the local timestamps', () => {
  const local = Date.UTC(2026, 0, 4, 23, 30); // Garmin encodes local wall-clock time as if it were UTC
  const s = mapSleep({
    calendarDate: '2026-01-05', sleepTimeSeconds: 27000, deepSleepSeconds: 5000, remSleepSeconds: 6000, lightSleepSeconds: 16000, awakeSleepSeconds: 900,
    sleepStartTimestampLocal: local, sleepEndTimestampLocal: local + 7.75 * 3600_000, sleepStartTimestampGMT: local + 5 * 3600_000,
    sleepScores: { overall: { value: 84 }, deepPercentage: { qualifierKey: 'GOOD' } }, sleepNeed: { actual: 470, baseline: 480 },
  });
  assert.equal(s.bedtimeMin, 23 * 60 + 30);
  assert.equal(s.wakeMin, 7 * 60 + 15);
  assert.equal(s.score, 84);
  assert.equal(s.needMin, 470);
  assert.equal(JSON.parse(s.scoreParts!).deep, 'GOOD');
});

test('mapSleep: older devices without scores or sleep need', () => {
  const s = mapSleep({ calendarDate: '2026-01-05', sleepTimeSeconds: 25000 });
  assert.equal(s.score, null);
  assert.equal(s.scoreParts, null);
  assert.equal(s.bedtimeMin, null);
});

test('mapActivity: run, ride with power, swim, strength', () => {
  const base = { activityId: 1, startTimeLocal: '2026-01-05 07:00:00', startTimeGMT: '2026-01-05 12:00:00' };
  const run = mapActivity({ ...base, activityName: 'Run', activityType: { typeKey: 'running' }, distance: 10000, duration: 3000, averageSpeed: 3.33, averageHR: 150, hrTimeInZone_2: 2000, fastestSplit_1000: 280, isPR: true, avgGroundContactTime: 240, averageRunningCadenceInStepsPerMinute: 172, ownerFullName: 'Should Not Be Stored' });
  assert.equal(run.type, 'running');
  assert.equal(run.best1kSec, 280);
  assert.equal(run.isPr, true);
  assert.equal(run.startGmt.toISOString(), '2026-01-05T12:00:00.000Z');
  assert.ok(!run.raw.includes('Should Not Be Stored'), 'owner name is stripped from stored raw JSON');

  const ride = mapActivity({ ...base, activityName: 'Ride', activityType: { typeKey: 'cycling' }, avgPower: 190, normPower: 205, averageBikingCadenceInRevPerMinute: 88, vO2MaxValue: 55 });
  assert.equal(ride.normPower, 205);
  assert.equal(ride.avgCadence, 88);
  assert.equal(ride.vo2max, 55);

  const swim = mapActivity({ ...base, activityType: { typeKey: 'lap_swimming' }, distance: 1500, duration: 1800, averageSpeed: 0.83 });
  assert.equal(swim.name, 'Activity');
  assert.equal(swim.gctMs, null);

  const lift = mapActivity({ ...base, activityType: { typeKey: 'strength_training' }, summarizedExerciseSets: [{ category: 'SQUAT', sets: 3, reps: 15, duration: 180000, maxWeight: 80000 }] });
  assert.deepEqual(JSON.parse(lift.sets!)[0], { category: 'SQUAT', sub: null, sets: 3, reps: 15, durationSec: 180, maxWeightKg: 80 });
});
