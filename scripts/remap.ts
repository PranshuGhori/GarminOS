// Re-derives DailyMetric and Sleep columns from the stored raw JSON (no Garmin calls).
// Run after changing src/lib/garmin/map.ts:  npm run remap
import { db } from '../src/lib/db';
import { mapDaily, mapSleep } from '../src/lib/garmin/map';

async function main() {
  const days = await db.dailyMetric.findMany({ where: { raw: { not: null } }, select: { date: true, raw: true } });
  await db.$transaction(days.map((d) => db.dailyMetric.update({ where: { date: d.date }, data: mapDaily(JSON.parse(d.raw!)) })));
  const sleeps = await db.sleep.findMany({ where: { raw: { not: null } }, select: { date: true, raw: true } });
  await db.$transaction(sleeps.map((s) => db.sleep.update({ where: { date: s.date }, data: mapSleep(JSON.parse(s.raw!)) })));
  console.log(`✓ Remapped ${days.length} days and ${sleeps.length} nights`);
  await db.$disconnect();
}
main();
