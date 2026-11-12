import { unzipSync } from 'fflate';
import FitParser from 'fit-file-parser';

export type Stream = {
  t: number[]; // seconds from start
  hr: (number | null)[];
  speed: (number | null)[]; // m/s
  cadence: (number | null)[];
  power: (number | null)[];
  alt: (number | null)[];
  lat: (number | null)[];
  lng: (number | null)[];
};

export type ParsedLap = {
  index: number;
  distanceM: number | null;
  durationSec: number | null;
  avgSpeed: number | null;
  maxSpeed: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  avgCadence: number | null;
  elevationGain: number | null;
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const MAX_POINTS = 600;

/** Takes the ZIP from /download-service/files/activity/{id} (or a bare .fit) and extracts laps + a downsampled stream. */
export async function parseActivityFile(bytes: Uint8Array): Promise<{ laps: ParsedLap[]; stream: Stream | null; vo2max: number | null }> {
  let fit = bytes;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const files = unzipSync(bytes);
    const name = Object.keys(files).find((n) => n.toLowerCase().endsWith('.fit'));
    if (!name) throw new Error('No .fit file in archive');
    fit = files[name];
  }
  const data: any = await new FitParser({ force: true }).parseAsync(Buffer.from(fit));
  const runLike = /run|walk|hik/i.test(String(data.sessions?.[0]?.sport ?? ''));
  const cad = (v: unknown) => (num(v) == null ? null : runLike ? num(v)! * 2 : num(v)); // FIT stores running cadence per leg

  const laps: ParsedLap[] = (data.laps ?? []).map((l: any, i: number) => ({
    index: i,
    distanceM: num(l.total_distance),
    durationSec: num(l.total_timer_time) ?? num(l.total_elapsed_time),
    avgSpeed: num(l.enhanced_avg_speed) ?? num(l.avg_speed),
    maxSpeed: num(l.enhanced_max_speed) ?? num(l.max_speed),
    avgHr: num(l.avg_heart_rate),
    maxHr: num(l.max_heart_rate),
    avgPower: num(l.avg_power),
    avgCadence: cad(l.avg_cadence),
    elevationGain: num(l.total_ascent),
  }));

  const records: any[] = data.records ?? [];
  let stream: Stream | null = null;
  if (records.length > 1) {
    const t0 = new Date(records[0].timestamp).getTime();
    const step = Math.max(1, Math.ceil(records.length / MAX_POINTS));
    stream = { t: [], hr: [], speed: [], cadence: [], power: [], alt: [], lat: [], lng: [] };
    for (let i = 0; i < records.length; i += step) {
      const r = records[i];
      stream.t.push(Math.round((new Date(r.timestamp).getTime() - t0) / 1000));
      stream.hr.push(num(r.heart_rate));
      stream.speed.push(num(r.enhanced_speed) ?? num(r.speed));
      stream.cadence.push(cad(r.cadence));
      stream.power.push(num(r.power));
      stream.alt.push(num(r.enhanced_altitude) ?? num(r.altitude));
      stream.lat.push(num(r.position_lat));
      stream.lng.push(num(r.position_long));
    }
  }
  const vo2max = num(data.activity_metrics?.[0]?.vo2_max) ?? num(data.user_metrics?.[0]?.vo2_max);
  return { laps, stream, vo2max };
}
