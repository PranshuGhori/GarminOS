import { Explorer } from '@/components/Explorer';
import { NoData } from '@/components/NoData';
import { IS_MOCK } from '@/lib/db';
import { inRange, loadDays, parseRange } from '@/lib/metrics';

export default async function ExplorerPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const all = await loadDays();
  if (!all.length) return <NoData mock={IS_MOCK} />;
  return <Explorer rows={inRange(all, range)} />;
}
