import path from 'node:path';
import { PrismaClient } from '@prisma/client';

/** GARMIN_MOCK=1 points the whole app at prisma/mock.db (seeded demo data). */
export const IS_MOCK = process.env.GARMIN_MOCK === '1';
const file = process.env.GARMIN_DB_FILE ?? (IS_MOCK ? 'mock.db' : 'garmin.db'); // GARMIN_DB_FILE is used by the test suite
// GARMIN_DATA_DIR moves the database out of the source tree (used by the Docker image, where /data is a volume).
const url = `file:${path.join(process.env.GARMIN_DATA_DIR ?? path.join(process.cwd(), 'prisma'), file)}`;

const g = globalThis as unknown as { __prisma?: PrismaClient };
export const db = g.__prisma ?? new PrismaClient({ datasourceUrl: url });
if (process.env.NODE_ENV !== 'production') g.__prisma = db;
