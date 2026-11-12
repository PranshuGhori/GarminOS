import { NextResponse } from 'next/server';
import { isSyncing, runSync } from '@/lib/garmin/sync';
import { lastSync } from '@/lib/metrics';

export const maxDuration = 300;

export async function POST() {
  const result = await runSync();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function GET() {
  return NextResponse.json({ syncing: isSyncing(), last: await lastSync() });
}
