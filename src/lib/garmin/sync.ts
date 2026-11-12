import { db, IS_MOCK } from '@/lib/db';
import { addDays, today } from '@/lib/dates';
import { garminBinary, garminJson, stats } from './client';
import { parseActivityFile } from './fit';
import { mapActivity, mapDaily, mapSleep } from './map';

const CHUNK_DAYS = 28; // the tightest range limit across endpoints is ~29 days (stress); 28 is safe for all
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export type SyncOptions = {
  /** Days of history to (re)fetch. Default: incremental (since last synced day − 3), or full backfill on first run. */
  days?: number;
  /** Max .FIT files to download + parse this run. */
  fitLimit?: number;
  log?: (msg: string) => void;
};

const g = globalThis as unknown as { __garminSync?: Promise<SyncResult> | null };
export type SyncResult = { ok: boolean; message: string; requests: number };
export const isSyncing = () => !!g.__garminSync;

export function runSync(opts: SyncOptions = {}): Promise<SyncResult> {
  if (IS_MOCK) return Promise.resolve({ ok: false, message: 'Mock mode: sync is disabled', requests: 0 });
  g.__garminSync ??= doSync(opts).finally(() => (g.__garminSync = null));
  return g.__garminSync;
}

async function doSync(opts: SyncOptions): Promise<SyncResult> {
  const log = opts.log ?? (() => {});
  const startReq = stats.requests;
  const entry = await db.syncLog.create({ data: {} });
  try {
    const end = today();
    const prof = await db.profile.findUnique({ where: { id: 1 } });
    const last = await db.dailyMetric.findFirst({ orderBy: { date: 'desc' }, select: { date: true } });
    const backfill = Number(process.env.SYNC_BACKFILL_DAYS ?? 730);
    const floor = addDays(end, -backfill);
    const counts = { days: 0, sleeps: 0, activities: 0, fit: 0 };

    /** Walk newest → oldest in 28-day windows; stop early once Garmin has no more history. Returns true if the walk reached its end. */
    const walk = async (from: string, to: string, track: boolean) => {
      let emptyRun = 0;
      for (let hi = to; hi >= from; hi = addDays(hi, -CHUNK_DAYS)) {
        const lo = addDays(hi, -(CHUNK_DAYS - 1)) < from ? from : addDays(hi, -(CHUNK_DAYS - 1));
        const n = await syncChunk(lo, hi);
        counts.days += n.days;
        counts.sleeps += n.sleeps;
        log(`${lo} → ${hi}: ${n.days} days, ${n.sleeps} sleeps`);
        if (track) await db.profile.upsert({ where: { id: 1 }, create: { id: 1, backfillCursor: lo }, update: { backfillCursor: lo } });
        emptyRun = n.days + n.sleeps === 0 ? emptyRun + 1 : 0;
        if (emptyRun >= 2) break;
      }
    };

    let actSince: string;
    if (opts.days) {
      actSince = addDays(end, -opts.days);
      await walk(actSince, end, false); // explicit re-fetch window
    } else {
      // 1) recent days (always), 2) continue the history backfill where it stopped, if it never finished
      const recentFrom = last ? addDays(last.date, -3) : end;
      if (last) await walk(recentFrom, end, false);
      actSince = last ? addDays(recentFrom, -7) : floor;
      const legacyDone = !!last && !prof?.backfillCursor && !prof?.backfillDone; // database created before backfill tracking existed
      if (!prof?.backfillDone && !legacyDone) {
        const resumeFrom = prof?.backfillCursor ? addDays(prof.backfillCursor, -1) : end;
        if (resumeFrom >= floor) { await walk(floor, resumeFrom, true); actSince = floor; }
      }
      await db.profile.upsert({ where: { id: 1 }, create: { id: 1, backfillDone: true }, update: { backfillDone: true } });
    }

    counts.activities = await syncActivities(actSince);
    log(`${counts.activities} activities`);
    counts.fit = await syncFitFiles(opts.fitLimit ?? Number(process.env.SYNC_FIT_LIMIT ?? 40), log);
    await syncNights(3);
    await syncFitnessAge(end);
    await syncProfile(end);

    const message = `${counts.days} days, ${counts.sleeps} sleeps, ${counts.activities} activities, ${counts.fit} FIT files`;
    const requests = stats.requests - startReq;
    await db.syncLog.update({ where: { id: entry.id }, data: { status: 'ok', finishedAt: new Date(), message, requests } });
    return { ok: true, message, requests };
  } catch (e) {
    const message = (e as Error).message;
    const requests = stats.requests - startReq;
    await db.syncLog.update({ where: { id: entry.id }, data: { status: 'error', finishedAt: new Date(), message, requests } });
    return { ok: false, message, requests };
  }
}

async function syncChunk(lo: string, hi: string) {
  const daily = await garminJson<{ data: any[] }>(`/usersummary-service/v2/dailysummaries?startDate=${lo}&endDate=${hi}`);
  const hrv = await garminJson<{ hrvSummaries: any[] }>(`/hrv-service/hrv/daily/${lo}/${hi}`);
  const sleeps = await garminJson<any[]>(`/sleep-service/sleep/dailySleepSummariesByDate?startDate=${lo}&endDate=${hi}`);
  const weight = await garminJson<{ dailyWeightSummaries: any[] }>(`/weight-service/weight/range/${lo}/${hi}?includeAll=true`).catch(() => null);

  const ops: any[] = [];
  const days = (daily?.data ?? []).filter((d) => d?.calendarDate && d.includesWellnessData !== false);
  for (const d of days) {
    const f = mapDaily(d);
    ops.push(db.dailyMetric.upsert({ where: { date: d.calendarDate }, create: { date: d.calendarDate, ...f }, update: f }));
  }
  for (const h of hrv?.hrvSummaries ?? []) {
    if (!h?.calendarDate) continue;
    const f = {
      hrvLastNight: num(h.lastNightAvg),
      hrvWeeklyAvg: num(h.weeklyAvg),
      hrvBaselineLow: num(h.baseline?.balancedLow),
      hrvBaselineHigh: num(h.baseline?.balancedUpper),
      hrvStatus: h.status ?? null,
    };
    ops.push(db.dailyMetric.upsert({ where: { date: h.calendarDate }, create: { date: h.calendarDate, ...f }, update: f }));
  }
  const sl = (sleeps ?? []).filter((s) => s?.calendarDate && s.sleepTimeSeconds);
  for (const s of sl) {
    const f = mapSleep(s);
    ops.push(db.sleep.upsert({ where: { date: s.calendarDate }, create: { date: s.calendarDate, ...f }, update: f }));
  }
  for (const w of weight?.dailyWeightSummaries ?? []) {
    const m = w?.latestWeight ?? w?.allWeightMetrics?.[0];
    const date = w?.summaryDate ?? m?.calendarDate;
    if (!date || !m) continue;
    const f = {
      weightKg: num(m.weight) != null ? m.weight / 1000 : null, // grams → kg
      bmi: num(m.bmi),
      bodyFatPct: num(m.bodyFat),
      bodyWaterPct: num(m.bodyWater),
      muscleMassKg: num(m.muscleMass) != null ? m.muscleMass / 1000 : null,
    };
    ops.push(db.bodyComposition.upsert({ where: { date }, create: { date, ...f }, update: f }));
  }
  if (ops.length) await db.$transaction(ops);
  return { days: days.length, sleeps: sl.length };
}

async function syncActivities(since: string): Promise<number> {
  let total = 0;
  for (let start = 0; ; start += 100) {
    const page = await garminJson<any[]>(`/activitylist-service/activities/search/activities?start=${start}&limit=100&startDate=${since}`);
    if (!page?.length) break;
    await db.$transaction(
      page.map((a) => {
        const f = mapActivity(a);
        const id = String(a.activityId);
        return db.activity.upsert({ where: { id }, create: { id, ...f }, update: f });
      }),
    );
    total += page.length;
    if (page.length < 100) break;
  }
  return total;
}

/** Download + parse one activity's .FIT file. Safe to call repeatedly. */
export async function ingestFit(id: string): Promise<'ok' | 'none' | 'error'> {
  try {
    const zip = await garminBinary(`/download-service/files/activity/${id}`);
    const { laps, stream, vo2max } = await parseActivityFile(zip);
    await db.$transaction([
      db.activityLap.deleteMany({ where: { activityId: id } }),
      db.activityLap.createMany({ data: laps.map((l) => ({ ...l, activityId: id })) }),
      ...(stream
        ? [db.activityStream.upsert({ where: { activityId: id }, create: { activityId: id, points: JSON.stringify(stream) }, update: { points: JSON.stringify(stream) } })]
        : []),
      db.activity.update({ where: { id }, data: { fitStatus: 'ok', ...(vo2max ? { vo2max } : {}) } }),
    ]);
    return 'ok';
  } catch (e) {
    const status = (e as any)?.status === 404 ? 'none' : 'error';
    await db.activity.update({ where: { id }, data: { fitStatus: status } }).catch(() => {});
    return status;
  }
}

async function syncFitFiles(limit: number, log: (m: string) => void): Promise<number> {
  const pending = await db.activity.findMany({ where: { fitStatus: 'pending' }, orderBy: { startLocal: 'desc' }, take: limit, select: { id: true } });
  let ok = 0;
  for (const a of pending) if ((await ingestFit(a.id)) === 'ok') ok++;
  if (pending.length) log(`${ok}/${pending.length} FIT files parsed`);
  return ok;
}

/** Overnight HR + HRV curves for one night. Three requests; cached in NightSeries. */
export async function ingestNight(date: string) {
  const sleep = await db.sleep.findUnique({ where: { date } });
  const hrvRes = await garminJson<any>(`/hrv-service/hrv/${date}`).catch(() => null);
  const hrv: [number, number][] = (hrvRes?.hrvReadings ?? [])
    .map((r: any) => [new Date(String(r.readingTimeGMT).replace(' ', 'T').replace(/Z?$/, 'Z')).getTime(), r.hrvValue] as [number, number])
    .filter((p: [number, number]) => Number.isFinite(p[0]) && typeof p[1] === 'number');

  const from = sleep?.startGmt?.getTime() ?? hrv[0]?.[0];
  const to = sleep?.endGmt?.getTime() ?? hrv.at(-1)?.[0];
  let hr: [number, number][] = [];
  if (from && to) {
    for (const d of [addDays(date, -1), date]) {
      const res = await garminJson<any>(`/wellness-service/wellness/dailyHeartRate?date=${d}`).catch(() => null);
      for (const p of res?.heartRateValues ?? []) if (p?.[1] != null && p[0] >= from && p[0] <= to) hr.push([p[0], p[1]]);
    }
    hr.sort((a, b) => a[0] - b[0]);
    hr = hr.filter((p, i) => i === 0 || p[0] !== hr[i - 1][0]);
  }
  const data = { hr: JSON.stringify(hr), hrv: JSON.stringify(hrv) };
  return db.nightSeries.upsert({ where: { date }, create: { date, ...data }, update: data });
}

async function syncNights(n: number) {
  const recent = await db.sleep.findMany({ orderBy: { date: 'desc' }, take: n, select: { date: true } });
  const have = new Set((await db.nightSeries.findMany({ where: { date: { in: recent.map((r) => r.date) } }, select: { date: true } })).map((r) => r.date));
  for (const r of recent) if (!have.has(r.date)) await ingestNight(r.date);
}

async function syncFitnessAge(date: string) {
  const r = await garminJson<any>(`/fitnessage-service/fitnessage/v2/${date}`).catch(() => null);
  if (!r || r.fitnessAge == null) return;
  const f = { chronologicalAge: int(r.chronologicalAge), fitnessAge: num(r.fitnessAge), components: JSON.stringify(r.components ?? {}) };
  await db.fitnessAge.upsert({ where: { date }, create: { date, ...f }, update: f });
}

/** Full-day heart-rate curve for one calendar date. Cached unless the day is still in progress. */
export async function ingestDayHr(date: string): Promise<[number, number][]> {
  const res = await garminJson<any>(`/wellness-service/wellness/dailyHeartRate?date=${date}`).catch(() => null);
  const hr: [number, number][] = (res?.heartRateValues ?? []).filter((p: any) => p?.[1] != null).map((p: any) => [p[0], p[1]]);
  if (date < today() && hr.length) {
    await db.nightSeries.upsert({ where: { date }, create: { date, dayHr: JSON.stringify(hr) }, update: { dayHr: JSON.stringify(hr) } });
  }
  return hr;
}

/** Units, heart-rate zones and (if tracked) the current menstrual-cycle summary. */
async function syncProfile(date: string) {
  const settings = await garminJson<any>('/userprofile-service/userprofile/settings').catch(() => null);
  const zones = await garminJson<any>('/biometric-service/heartRateZones/v2').catch(() => null);
  const cycle = await garminJson<any>(`/periodichealth-service/menstrualcycle/summary/${date}`).catch(() => null); // 204 → null when not tracked
  const f = {
    ...(settings ? { measurementSystem: settings.measurementSystem ?? null, raw: JSON.stringify(settings) } : {}),
    ...(zones ? { hrZones: JSON.stringify(zones) } : {}),
    cycle: cycle ? JSON.stringify(cycle) : null,
  };
  await db.profile.upsert({ where: { id: 1 }, create: { id: 1, ...f }, update: f });
}
