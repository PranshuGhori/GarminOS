import { NextResponse } from 'next/server';
import { db, IS_MOCK } from '@/lib/db';
import { ingestFit } from '@/lib/garmin/sync';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let a = await db.activity.findUnique({ where: { id }, include: { laps: { orderBy: { index: 'asc' } }, stream: true } });
  if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (a.fitStatus === 'pending' && !IS_MOCK) {
    await ingestFit(id); // parse the .FIT on first open if the bulk sync has not reached it yet
    a = (await db.activity.findUnique({ where: { id }, include: { laps: { orderBy: { index: 'asc' } }, stream: true } }))!;
  }
  const { stream, ...rest } = a;
  return NextResponse.json({ ...rest, stream: stream ? JSON.parse(stream.points) : null });
}
