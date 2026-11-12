import { NextRequest, NextResponse } from 'next/server';
import { db, IS_MOCK } from '@/lib/db';
import { ingestDayHr } from '@/lib/garmin/sync';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'bad date' }, { status: 400 });
  const row = await db.nightSeries.findUnique({ where: { date }, select: { dayHr: true } });
  let hr: [number, number][] = row?.dayHr ? JSON.parse(row.dayHr) : [];
  if (!hr.length && !IS_MOCK) hr = await ingestDayHr(date).catch(() => []);
  return NextResponse.json({ date, hr });
}
