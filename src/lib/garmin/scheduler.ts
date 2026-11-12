import { db, IS_MOCK } from '@/lib/db';
import { runSync } from './sync';

const g = globalThis as unknown as { __garminTimer?: NodeJS.Timeout };

/** Background sync: runs shortly after boot if data is stale, then every SYNC_INTERVAL_HOURS (default 6). */
export function startScheduler() {
  if (IS_MOCK || g.__garminTimer || process.env.SYNC_INTERVAL_HOURS === '0') return;
  const everyMs = Number(process.env.SYNC_INTERVAL_HOURS ?? 6) * 3600_000;
  const tick = async () => {
    try {
      const last = await db.syncLog.findFirst({ where: { status: 'ok' }, orderBy: { id: 'desc' } });
      if (last?.finishedAt && Date.now() - last.finishedAt.getTime() < everyMs) return;
      const r = await runSync();
      console.log(`[garmin] background sync: ${r.ok ? 'ok' : 'failed'} – ${r.message}`);
    } catch (e) {
      console.error('[garmin] background sync error', e);
    }
  };
  g.__garminTimer = setInterval(tick, 15 * 60_000);
  setTimeout(tick, 15_000);
}
