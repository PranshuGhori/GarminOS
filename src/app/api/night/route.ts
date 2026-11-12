import { NextRequest, NextResponse } from 'next/server';
import { db, IS_MOCK } from '@/lib/db';
import { ingestNight } from '@/lib/garmin/sync';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'bad date' }, { status: 400 });
  let row = await db.nightSeries.findUnique({ where: { date } });
  if (!row && !IS_MOCK) row = await ingestNight(date).catch(() => null); // lazy fetch, then cached forever
  return NextResponse.json({ date, hr: row?.hr ? JSON.parse(row.hr) : [], hrv: row?.hrv ? JSON.parse(row.hrv) : [] });
}
