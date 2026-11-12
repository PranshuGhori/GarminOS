// Pure Garmin JSON → database column mappers. Shared by the live sync and `npm run remap`
// (which re-derives columns from the stored raw JSON without calling Garmin).
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const msToSec = (v: unknown) => (num(v) == null ? null : Math.round((v as number) / 1000));
/** Garmin "local" epochs are local wall-clock time encoded as if it were UTC. */
const clockMin = (localEpoch: unknown) => {
  if (num(localEpoch) == null) return null;
  const d = new Date(localEpoch as number);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

export function mapDaily(d: any) {
  const events = (d.bodyBattery?.activityEvents ?? []).map((e: any) => ({
    type: e.eventType,
    startLocal: e.eventStartTimeLocal ?? null,
    impact: num(e.bodyBatteryImpact),
    durationSec: msToSec(e.durationInMillis ?? e.durationInMilliseconds),
    feedback: e.shortFeedback && e.shortFeedback !== 'NONE' ? e.shortFeedback : null,
  }));
  return {
    restingHr: int(d.heartRate?.restingValue),
    minHr: int(d.heartRate?.minValue),
    maxHr: int(d.heartRate?.maxValue),
    avgStress: int(d.stress?.avgLevel),
    maxStress: int(d.stress?.maxLevel),
    bbCharged: int(d.bodyBattery?.chargedValue),
    bbDrained: int(d.bodyBattery?.drainedValue),
    bbHigh: int(d.bodyBattery?.maxValue),
    bbLow: int(d.bodyBattery?.minValue),
    steps: int(d.movement?.steps?.value),
    distanceM: num(d.movement?.steps?.distanceInMeters),
    floors: num(d.movement?.floorsAscended?.value),
    intensityModerate: int(d.intensityMinutes?.moderate),
    intensityVigorous: int(d.intensityMinutes?.vigorous),
    activeKcal: num(d.calories?.burnedActive),
    restingKcal: num(d.calories?.burnedResting),
    totalKcal: num(d.calories?.burnedTotal),
    spo2Avg: num(d.pulseOx?.avgValue) ?? num(d.pulseOx?.averageValue) ?? num(d.pulseOx?.avgSpo2), // field name unconfirmed: no SpO2 device was available to test against
    respirationAvg: num(d.respiration?.avgValue),
    hydrationMl: num(d.hydration?.consumedInMl),
    stressRestSec: msToSec(d.stress?.restDurationInMillis),
    stressLowSec: msToSec(d.stress?.lowStressDurationInMillis),
    stressMedSec: msToSec(d.stress?.mediumStressDurationInMillis),
    stressHighSec: msToSec(d.stress?.highStressDurationInMillis),
    stepGoal: int(d.movement?.steps?.goal),
    intensityGoal: int(d.intensityMinutes?.goal),
    bbEvents: events.length ? JSON.stringify(events) : null,
    raw: JSON.stringify(d),
  };
}

export function mapSleep(s: any) {
  const q = s.sleepScores ?? {};
  const parts = {
    duration: q.totalDuration?.qualifierKey, stress: q.stress?.qualifierKey, awakeCount: q.awakeCount?.qualifierKey,
    rem: q.remPercentage?.qualifierKey, light: q.lightPercentage?.qualifierKey, deep: q.deepPercentage?.qualifierKey, restlessness: q.restlessness?.qualifierKey,
  };
  return {
    totalSec: int(s.sleepTimeSeconds),
    deepSec: int(s.deepSleepSeconds),
    lightSec: int(s.lightSleepSeconds),
    remSec: int(s.remSleepSeconds),
    awakeSec: int(s.awakeSleepSeconds),
    napSec: int(s.napTimeSeconds),
    score: int(q.overall?.value),
    avgStress: num(s.avgSleepStress),
    avgHr: num(s.avgHeartRate),
    avgRespiration: num(s.averageRespirationValue),
    awakeCount: int(s.awakeCount),
    startGmt: s.sleepStartTimestampGMT ? new Date(s.sleepStartTimestampGMT) : null,
    endGmt: s.sleepEndTimestampGMT ? new Date(s.sleepEndTimestampGMT) : null,
    feedback: s.sleepScoreFeedback ?? null,
    needMin: int(s.sleepNeed?.actual),
    needBaselineMin: int(s.sleepNeed?.baseline),
    bedtimeMin: clockMin(s.sleepStartTimestampLocal),
    wakeMin: clockMin(s.sleepEndTimestampLocal),
    scoreParts: Object.values(parts).some(Boolean) ? JSON.stringify(parts) : null,
    raw: JSON.stringify(s),
  };
}

export function mapActivity(a: any) {
  const sets = (a.summarizedExerciseSets ?? []).map((x: any) => ({
    category: x.category, sub: x.subCategory ?? null, sets: int(x.sets), reps: int(x.reps),
    durationSec: msToSec(x.duration), maxWeightKg: num(x.maxWeight) ? +(x.maxWeight / 1000).toFixed(1) : null, // grams → kg
  }));
  const { ownerProfileImageUrlSmall, ownerProfileImageUrlMedium, ownerProfileImageUrlLarge, ownerFullName, ownerDisplayName, ...raw } = a;
  return {
    name: a.activityName ?? 'Activity',
    type: a.activityType?.typeKey ?? 'other',
    startLocal: a.startTimeLocal,
    startGmt: new Date(String(a.startTimeGMT).replace(' ', 'T') + 'Z'),
    distanceM: num(a.distance),
    durationSec: num(a.duration),
    movingSec: num(a.movingDuration),
    elevationGain: num(a.elevationGain),
    avgSpeed: num(a.averageSpeed),
    maxSpeed: num(a.maxSpeed),
    avgHr: num(a.averageHR),
    maxHr: num(a.maxHR),
    calories: num(a.calories),
    aerobicTe: num(a.aerobicTrainingEffect),
    anaerobicTe: num(a.anaerobicTrainingEffect),
    teLabel: a.trainingEffectLabel ?? null,
    trainingLoad: num(a.activityTrainingLoad),
    avgPower: num(a.avgPower),
    normPower: num(a.normPower),
    avgCadence: num(a.averageRunningCadenceInStepsPerMinute) ?? num(a.averageBikingCadenceInRevPerMinute),
    z1Sec: num(a.hrTimeInZone_1),
    z2Sec: num(a.hrTimeInZone_2),
    z3Sec: num(a.hrTimeInZone_3),
    z4Sec: num(a.hrTimeInZone_4),
    z5Sec: num(a.hrTimeInZone_5),
    locationName: a.locationName ?? null,
    gctMs: num(a.avgGroundContactTime),
    vertOscCm: num(a.avgVerticalOscillation),
    strideCm: num(a.avgStrideLength),
    vertRatio: num(a.avgVerticalRatio),
    gapSpeed: num(a.avgGradeAdjustedSpeed),
    best1kSec: num(a.fastestSplit_1000),
    bestMileSec: num(a.fastestSplit_1609),
    best5kSec: num(a.fastestSplit_5000),
    isPr: typeof a.isPR === 'boolean' ? a.isPR : null,
    bbImpact: int(a.differenceBodyBattery),
    sets: sets.length ? JSON.stringify(sets) : null,
    raw: JSON.stringify(raw),
    ...(num(a.vO2MaxValue) != null ? { vo2max: a.vO2MaxValue as number } : {}),
  };
}
