import { db } from '@/lib/db';

const BASE = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const BASE_GAP_MS = Number(process.env.GARMIN_MIN_GAP_MS ?? 350); // Garmin publishes no limits; stay polite
let gapMs = BASE_GAP_MS; // widened automatically when Garmin answers 429, relaxed again after a quiet spell
const MAX_RETRIES = 4;

export class GarminError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

function apiKey(): string {
  const key = process.env.GARMIN_PERSONAL_API_KEY ?? process.env.garmin_api;
  if (!key) throw new GarminError('No Garmin key found. Set GARMIN_PERSONAL_API_KEY (or garmin_api) in .env');
  return key.trim().replace(/^["']|["']$/g, '');
}

// ---- token manager -------------------------------------------------------
let memToken: { accessToken: string; expiresAt: number } | null = null;
let inflight: Promise<string> | null = null;
const SKEW_MS = 5 * 60_000;

function jwtExpiry(jwt: string): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    if (typeof payload.exp === 'number') return payload.exp * 1000;
  } catch {}
  return Date.now() + 23 * 3600_000; // documented lifetime is 24h
}

async function exchangeKey(): Promise<string> {
  const res = await fetch(BASE + TOKEN_PATH, { method: 'POST', headers: { Authorization: `ApiKey ${apiKey()}` } });
  const body = (await res.text()).trim();
  if (!res.ok) {
    throw new GarminError(res.status === 401 || res.status === 403
      ? 'Garmin rejected the Personal API key. It may be mistyped, expired or deleted: create a new one at connect.garmin.com/app/settings/personalApiToken and update .env.'
      : `Token exchange failed (HTTP ${res.status}). Garmin may be temporarily unavailable; try again shortly.`, res.status);
  }
  // The endpoint returns the JWT as plain text; tolerate a JSON envelope too.
  let accessToken = body;
  if (body.startsWith('{')) {
    const j = JSON.parse(body);
    accessToken = j.access_token ?? j.accessToken ?? j.token;
  }
  const expiresAt = jwtExpiry(accessToken);
  memToken = { accessToken, expiresAt };
  await db.authToken.upsert({
    where: { id: 1 },
    create: { id: 1, accessToken, expiresAt: new Date(expiresAt) },
    update: { accessToken, expiresAt: new Date(expiresAt) },
  });
  return accessToken;
}

export async function getToken(force = false): Promise<string> {
  if (!force) {
    if (memToken && memToken.expiresAt - SKEW_MS > Date.now()) return memToken.accessToken;
    const row = await db.authToken.findUnique({ where: { id: 1 } });
    if (row && row.expiresAt.getTime() - SKEW_MS > Date.now()) {
      memToken = { accessToken: row.accessToken, expiresAt: row.expiresAt.getTime() };
      return row.accessToken;
    }
  }
  inflight ??= exchangeKey().finally(() => (inflight = null));
  return inflight;
}

// ---- rate-limited, retrying request queue --------------------------------
let chain: Promise<unknown> = Promise.resolve();
let lastAt = 0;
export const stats = { requests: 0 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastAt + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      return await job();
    } finally {
      lastAt = Date.now();
    }
  });
  chain = run.catch(() => {});
  return run;
}

async function request(path: string, accept: string): Promise<Response> {
  let refreshed = false;
  for (let attempt = 0; ; attempt++) {
    const token = await getToken();
    stats.requests++;
    let res: Response;
    try {
      res = await fetch(BASE + path, {
        headers: { Authorization: `Bearer ${token}`, Accept: accept },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (e) {
      if (attempt >= MAX_RETRIES) throw new GarminError(`Network error calling Garmin: ${(e as Error).message}`);
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.status === 401 && !refreshed) {
      refreshed = true; // token revoked/expired early: exchange the key once and retry
      await getToken(true);
      continue;
    }
    if (res.status === 429) gapMs = Math.min(5000, gapMs * 2); // back off for everything that follows, not just this request
    else if (res.ok && gapMs > BASE_GAP_MS) gapMs = Math.max(BASE_GAP_MS, Math.round(gapMs * 0.97));
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const backoff = retryAfter > 0 ? retryAfter * 1000 : 1500 * 2 ** attempt + Math.random() * 500;
      await sleep(Math.min(backoff, 60_000));
      continue;
    }
    return res;
  }
}

/** GET JSON. Returns null for 204 / empty bodies. */
export function garminJson<T = any>(path: string): Promise<T | null> {
  return enqueue(async () => {
    const res = await request(path, 'application/json');
    if (res.status === 204) return null;
    if (!res.ok) throw new GarminError(`Garmin ${res.status} for ${path.split('?')[0]}`, res.status);
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  });
}

/** GET binary (activity download ZIP). */
export function garminBinary(path: string): Promise<Uint8Array> {
  return enqueue(async () => {
    const res = await request(path, '*/*');
    if (!res.ok) throw new GarminError(`Garmin ${res.status} for ${path}`, res.status);
    return new Uint8Array(await res.arrayBuffer());
  });
}
