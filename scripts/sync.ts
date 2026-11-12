// CLI sync:  npm run sync            (incremental / first-run backfill)
//            npm run sync -- --days 90 --fit 200
import fs from 'node:fs';
for (const f of ['.env', '.env.local']) if (fs.existsSync(f)) process.loadEnvFile(f);

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? Number(process.argv[i + 1]) : undefined;
};

async function main() {
  const { runSync } = await import('../src/lib/garmin/sync');
  const { db } = await import('../src/lib/db');
  const r = await runSync({ days: arg('days'), fitLimit: arg('fit') ?? 500, log: (m) => console.log('  ' + m) });
  console.log(`${r.ok ? '✓' : '✗'} ${r.message} (${r.requests} requests)`);
  await db.$disconnect();
  process.exit(r.ok ? 0 : 1);
}
main();
