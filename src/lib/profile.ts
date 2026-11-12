import { db } from '@/lib/db';
import { type Units, unitsFrom } from '@/lib/format';

export async function loadProfile(): Promise<{ units: Units; zones: { floors: number[]; max: number | null } | null; cycle: any | null }> {
  const p = await db.profile.findUnique({ where: { id: 1 } }).catch(() => null);
  const forced = process.env.UNITS === 'imperial' || process.env.UNITS === 'metric' ? (process.env.UNITS as Units) : null;
  let zones = null;
  try {
    const all = p?.hrZones ? JSON.parse(p.hrZones) : [];
    const z = all.find((x: any) => x.sport === 'DEFAULT') ?? all[0];
    if (z?.zone1Floor) zones = { floors: [z.zone1Floor, z.zone2Floor, z.zone3Floor, z.zone4Floor, z.zone5Floor], max: z.maxHeartRateUsed ?? null };
  } catch {}
  return { units: forced ?? unitsFrom(p?.measurementSystem), zones, cycle: p?.cycle ? JSON.parse(p.cycle) : null };
}
