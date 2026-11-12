#!/bin/sh
set -e
# Create or update the database schema, seed demo data if requested, then start the server.
if [ "$GARMIN_MOCK" = "1" ]; then DB=mock.db; else DB=garmin.db; fi
DATABASE_URL="file:/data/$DB" npx prisma db push --skip-generate
if [ "$GARMIN_MOCK" = "1" ] && [ ! -f /data/.seeded ]; then
  npx tsx scripts/seed-mock.ts && touch /data/.seeded
fi
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
