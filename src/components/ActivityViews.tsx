'use client';
import { Explain } from '@/components/Term';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Search, Trophy, X } from 'lucide-react';
import { fmtDate, fmtDuration, fmtNum, isPaceSport, isSwim, prettyType } from '@/lib/format';
import { useUnits, useZones } from './ProfileContext';
import { C, Card, Empty, Tip, axis, dateTick } from './charts/kit';

export type ActivityRow = {
  id: string; name: string; type: string; startLocal: string;
  distanceM: number | null; durationSec: number | null; elevationGain: number | null;
  avgSpeed: number | null; maxSpeed: number | null; avgHr: number | null; maxHr: number | null; calories: number | null;
  aerobicTe: number | null; anaerobicTe: number | null; teLabel: string | null; trainingLoad: number | null;
  avgPower: number | null; normPower: number | null; avgCadence: number | null; vo2max: number | null;
  gctMs: number | null; vertOscCm: number | null; strideCm: number | null; vertRatio: number | null; gapSpeed: number | null;
  best1kSec: number | null; bestMileSec: number | null; best5kSec: number | null; isPr: boolean | null; bbImpact: number | null; sets: string | null;
  z1Sec: number | null; z2Sec: number | null; z3Sec: number | null; z4Sec: number | null; z5Sec: number | null;
};

/** Aerobic efficiency: output per heartbeat. Power sports: W/bpm. Pace sports: metres per minute per bpm. */
export function efficiency(a: { type: string; avgSpeed: number | null; avgHr: number | null; normPower?: number | null; avgPower?: number | null }) {
  if (!a.avgHr) return null;
  if (isPaceSport(a.type)) return a.avgSpeed ? { value: (a.avgSpeed * 60) / a.avgHr, unit: 'm/min per bpm' } : null;
  const p = a.normPower ?? a.avgPower;
  return p ? { value: p / a.avgHr, unit: 'W per bpm' } : a.avgSpeed ? { value: (a.avgSpeed * 60) / a.avgHr, unit: 'm/min per bpm' } : null;
}


// ---- weekly polarized chart ------------------------------------------------
function weekStart(ymd: string) {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function PolarizedChart({ activities }: { activities: ActivityRow[] }) {
  const { weeks, share } = useMemo(() => {
    const m = new Map<string, { week: string; low: number; mod: number; high: number }>();
    for (const a of activities) {
      const k = weekStart(a.startLocal);
      const w = m.get(k) ?? { week: k, low: 0, mod: 0, high: 0 };
      w.low += ((a.z1Sec ?? 0) + (a.z2Sec ?? 0)) / 3600;
      w.mod += (a.z3Sec ?? 0) / 3600;
      w.high += ((a.z4Sec ?? 0) + (a.z5Sec ?? 0)) / 3600;
      m.set(k, w);
    }
    const weeks = [...m.values()].sort((a, b) => a.week.localeCompare(b.week)).map((w) => ({ ...w, low: +w.low.toFixed(2), mod: +w.mod.toFixed(2), high: +w.high.toFixed(2) }));
    const tot = weeks.reduce((a, w) => ({ low: a.low + w.low, all: a.all + w.low + w.mod + w.high }), { low: 0, all: 0 });
    return { weeks, share: tot.all ? tot.low / tot.all : null };
  }, [activities]);
  return (
    <Card help="polarization" title="Weekly polarized training" subtitle="Hours in heart-rate zones per week. The 80/20 guideline aims for about 80% low intensity."
      legend={[{ label: 'Low (Z1–2)', color: C.s1 }, { label: 'Moderate (Z3)', color: C.s3 }, { label: 'High (Z4–5)', color: C.s2 }]}>
      {!weeks.length || share == null ? <Empty>No heart-rate zone data in this range.</Empty> : (
        <>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="tnum text-2xl font-semibold">{Math.round(share * 100)}%</span>
            <span className="text-xs text-ink-3"><Explain>of zone time at low intensity across this range</Explain></span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="week" tickFormatter={dateTick} minTickGap={24} {...axis} />
              <YAxis {...axis} tickFormatter={(v) => `${v}h`} />
              <Tooltip cursor={{ fill: '#ffffff', fillOpacity: 0.04 }} content={<Tip
                labelFmt={(l: string, p: any[]) => { const w = p[0]?.payload; const t = w.low + w.mod + w.high; return `Week of ${fmtDate(l)} · ${t ? Math.round((w.low / t) * 100) : 0}% low`; }}
                valueFmt={(v: number) => fmtDuration(v * 3600)} />} />
              <Bar dataKey="low" name="Low (Z1–2)" stackId="z" fill={C.s1} stroke={C.surface} strokeWidth={1} maxBarSize={48} isAnimationActive={false} />
              <Bar dataKey="mod" name="Moderate (Z3)" stackId="z" fill={C.s3} stroke={C.surface} strokeWidth={1} maxBarSize={48} isAnimationActive={false} />
              <Bar dataKey="high" name="High (Z4–5)" stackId="z" fill={C.s2} stroke={C.surface} strokeWidth={1} maxBarSize={48} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
}

// ---- best efforts ----------------------------------------------------------
export function BestEfforts({ activities }: { activities: ActivityRow[] }) {
  const u = useUnits();
  const efforts = ([['1 km', 'best1kSec'], ['1 mile', 'bestMileSec'], ['5 km', 'best5kSec']] as const).map(([label, key]) => {
    const best = activities.filter((a) => a[key]).sort((a, b) => a[key]! - b[key]!)[0];
    return { label, best, sec: best?.[key] ?? null };
  });
  if (!efforts.some((e) => e.best)) return null;
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold">Best efforts in range</h2>
      <p className="mt-0.5 text-xs text-ink-3">Fastest split of each distance inside any run or walk</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {efforts.map((e) => (
          <div key={e.label} className="rounded-lg bg-raised px-3 py-2.5">
            <div className="text-xs text-ink-3">{e.label}</div>
            <div className="tnum mt-0.5 text-xl font-semibold">{fmtDuration(e.sec)}</div>
            <div className="mt-0.5 truncate text-xs text-ink-3">{e.best ? `${e.best.name} · ${fmtDate(e.best.startLocal)}` : 'None recorded'}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** GPS trace drawn as a plain line (no map tiles, so nothing leaves this machine). */
function RouteMap({ lat, lng }: { lat: (number | null)[]; lng: (number | null)[] }) {
  const pts = lat.map((la, i) => [la, lng[i]] as const).filter((p): p is readonly [number, number] => p[0] != null && p[1] != null);
  if (pts.length < 10) return null;
  const la = pts.map((p) => p[0]), lo = pts.map((p) => p[1]);
  const minLa = Math.min(...la), maxLa = Math.max(...la), minLo = Math.min(...lo), maxLo = Math.max(...lo);
  const k = Math.cos(((minLa + maxLa) / 2) * (Math.PI / 180));
  const w = Math.max(1e-6, (maxLo - minLo) * k), h = Math.max(1e-6, maxLa - minLa);
  const W = 400, H = 220, pad = 14, sc = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
  const ox = (W - w * sc) / 2, oy = (H - h * sc) / 2;
  const xy = pts.map(([a, o]) => [ox + (o - minLo) * k * sc, oy + (maxLa - a) * sc]);
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-ink-2">Route · filled dot is the start</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-raised" role="img" aria-label="GPS route">
        <polyline points={xy.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')} fill="none" stroke={C.s1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xy.at(-1)![0]} cy={xy.at(-1)![1]} r={4.5} fill={C.surface} stroke={C.ink} strokeWidth={2} />
        <circle cx={xy[0][0]} cy={xy[0][1]} r={4.5} fill={C.ink} stroke={C.surface} strokeWidth={2} />
      </svg>
    </div>
  );
}

// ---- feed + detail ---------------------------------------------------------
export function ActivityFeed({ activities }: { activities: ActivityRow[] }) {
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const u = useUnits();
  const linked = useSearchParams().get('open'); // deep link: /activities?open=<activityId>
  const [open, setOpen] = useState<ActivityRow | null>(() => activities.find((a) => a.id === linked) ?? null);
  const types = useMemo(() => [...new Set(activities.map((a) => a.type))].sort(), [activities]);
  const [limit, setLimit] = useState(200);
  const matched = activities.filter((a) => (type === 'all' || a.type === type) && (!q || a.name.toLowerCase().includes(q.toLowerCase())));
  const shown = matched.slice(0, limit);
  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <h2 className="mr-auto text-sm font-semibold">Activities <span className="ml-1 font-normal text-ink-3">{matched.length}</span></h2>
        <label className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name" aria-label="Search activities"
            className="w-40 rounded-md border border-line bg-raised py-1.5 pl-7 pr-2 text-xs text-ink placeholder:text-ink-3" />
        </label>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Activity type" className="rounded-md border border-line bg-raised px-2 py-1.5 text-xs text-ink">
          <option value="all">All types</option>
          {types.map((t) => <option key={t} value={t}>{prettyType(t)}</option>)}
        </select>
      </div>
      {!shown.length ? <Empty>No activities match.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-ink-3">
              <tr className="border-b border-line">
                {['Date', 'Activity', 'Type', 'Distance', 'Time', 'Pace / speed', 'Avg HR', 'Elev', 'TE', 'Load'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 font-medium ${i > 2 ? 'text-right' : ''}`}><Explain>{h}</Explain></th>
                ))}
              </tr>
            </thead>
            <tbody className="tnum">
              {shown.map((a) => (
                <tr key={a.id} onClick={() => setOpen(a)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(a)}
                  className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-raised focus:bg-raised focus:outline-none">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-2">{fmtDate(a.startLocal, { month: 'short', day: 'numeric', year: '2-digit' })}</td>
                  <td className="max-w-56 truncate px-4 py-2.5 font-medium text-ink">{a.name}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-2">{prettyType(a.type)}</td>
                  <td className="px-4 py-2.5 text-right">{a.distanceM ? u.dist(a.distanceM) : '–'}</td>
                  <td className="px-4 py-2.5 text-right">{fmtDuration(a.durationSec)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">{a.distanceM ? u.paceOrSpeed(a.type, a.avgSpeed) : '–'}</td>
                  <td className="px-4 py-2.5 text-right">{fmtNum(a.avgHr)}</td>
                  <td className="px-4 py-2.5 text-right">{u.elev(a.elevationGain)}</td>
                  <td className="px-4 py-2.5 text-right">{fmtNum(a.aerobicTe, 1)}</td>
                  <td className="px-4 py-2.5 text-right">{fmtNum(a.trainingLoad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {matched.length > limit && (
        <div className="border-t border-line p-3 text-center"><button onClick={() => setLimit(limit + 500)} className="rounded-md bg-raised px-3 py-1.5 text-xs font-medium text-ink-2 hover:text-ink">Show more ({matched.length - limit} hidden)</button></div>
      )}
      {open && <ActivityModal a={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

type Detail = ActivityRow & {
  fitStatus: string;
  laps: { index: number; distanceM: number | null; durationSec: number | null; avgSpeed: number | null; avgHr: number | null; maxHr: number | null; avgPower: number | null; avgCadence: number | null; elevationGain: number | null }[];
  stream: { t: number[]; hr: (number | null)[]; speed: (number | null)[]; power: (number | null)[]; cadence: (number | null)[]; alt: (number | null)[]; lat: (number | null)[]; lng: (number | null)[] } | null;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-raised px-3 py-2">
      <div className="text-[11px] text-ink-3"><Explain>{label}</Explain></div>
      <div className="tnum mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function ActivityModal({ a, onClose }: { a: ActivityRow; onClose: () => void }) {
  const u = useUnits();
  const zoneBounds = useZones();
  const [d, setD] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch(`/api/activity/${a.id}`).then((r) => r.json()).then(setD).catch(() => setFailed(true));
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [a.id, onClose]);

  const zones = [a.z1Sec, a.z2Sec, a.z3Sec, a.z4Sec, a.z5Sec].map((v) => v ?? 0);
  const zTotal = zones.reduce((x, y) => x + y, 0);
  const ef = efficiency(a);
  const pace = isPaceSport(a.type);
  const series = d?.stream ? d.stream.t.map((t, i) => ({ t, hr: d.stream!.hr[i], speed: d.stream!.speed[i] != null ? u.speedVal(d.stream!.speed[i]!) : null, power: d.stream!.power[i], cadence: d.stream!.cadence?.[i] || null, alt: d.stream!.alt?.[i] != null ? u.elevVal(d.stream!.alt[i]!) : null })) : [];
  const altVals = series.map((p) => p.alt).filter((v): v is number => v != null);
  const hilly = altVals.length > 1 && Math.max(...altVals) - Math.min(...altVals) >= (u.imperial ? 26 : 8);
  const sets: { category: string; sub: string | null; sets: number | null; reps: number | null; durationSec: number | null; maxWeightKg: number | null }[] = a.sets ? JSON.parse(a.sets) : [];
  const dynamics = [
    a.avgCadence ? ['Cadence', `${fmtNum(a.avgCadence)} spm`] : null,
    a.strideCm ? ['Stride length', u.stride(a.strideCm)] : null,
    a.gctMs ? ['Ground contact', `${fmtNum(a.gctMs)} ms`] : null,
    a.vertOscCm ? ['Vertical oscillation', `${a.vertOscCm.toFixed(1)} cm`] : null,
    a.vertRatio ? ['Vertical ratio', `${a.vertRatio.toFixed(1)} %`] : null,
    a.gapSpeed && pace ? ['Grade-adjusted pace', u.pace(a.gapSpeed)] : null,
    a.best1kSec ? ['Fastest 1 km', fmtDuration(a.best1kSec)] : null,
    a.bestMileSec ? ['Fastest mile', fmtDuration(a.bestMileSec)] : null,
    a.best5kSec ? ['Fastest 5 km', fmtDuration(a.best5kSec)] : null,
    a.bbImpact != null ? ['Body Battery impact', `${a.bbImpact > 0 ? '+' : a.bbImpact < 0 ? '−' : ''}${Math.abs(a.bbImpact)}`] : null,
    a.trainingLoad ? ['Training load', fmtNum(a.trainingLoad)] : null,
  ].filter((x): x is string[] => !!x);
  const hasPower = series.some((p) => p.power);
  const moving = series.some((p) => (p.speed ?? 0) > 0.6);
  const laps = d?.laps ?? [];

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-3 md:p-8" onClick={onClose} role="dialog" aria-modal="true" aria-label={a.name}>
      <div className="w-full max-w-4xl rounded-xl border border-line bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-line p-4">
          <div className="mr-auto">
            <h3 className="flex items-center gap-2 text-base font-semibold">{a.name}
              {a.isPr && <span className="flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-ink-2"><Trophy className="h-3 w-3 text-warn" aria-hidden /> <Explain>Personal record</Explain></span>}
            </h3>
            <p className="mt-0.5 text-xs text-ink-3">{prettyType(a.type)} · {fmtDate(a.startLocal, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {a.startLocal.slice(11, 16)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-ink-3 hover:bg-raised hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Distance" value={a.distanceM ? u.dist(a.distanceM) : '–'} />
            <Stat label="Duration" value={fmtDuration(a.durationSec)} />
            <Stat label={pace ? 'Avg / best pace' : 'Avg / max speed'} value={a.distanceM ? `${u.paceOrSpeed(a.type, a.avgSpeed).replace(/ \/\S+$| (km\/h|mph)$/, '')} / ${u.paceOrSpeed(a.type, a.maxSpeed)}` : '–'} />
            <Stat label="Avg / max HR" value={`${fmtNum(a.avgHr)} / ${fmtNum(a.maxHr)} bpm`} />
            <Stat label="Elevation gain" value={u.elev(a.elevationGain)} />
            <Stat label="Training effect" value={`${fmtNum(a.aerobicTe, 1)} aerobic · ${fmtNum(a.anaerobicTe, 1)} anaerobic`} />
            <Stat label="Aerobic efficiency" value={ef ? `${ef.value.toFixed(2)} ${ef.unit}` : '–'} />
            <Stat label={d?.vo2max ?? a.vo2max ? 'VO2 max' : 'Calories'} value={d?.vo2max ?? a.vo2max ? fmtNum(d?.vo2max ?? a.vo2max, 1) : `${fmtNum(a.calories)} kcal`} />
          </div>

          {dynamics.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold text-ink-2">{a.gctMs || a.strideCm ? 'Running dynamics and efforts' : 'More detail'}</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{dynamics.map(([l, v]) => <Stat key={l} label={l} value={v} />)}</div>
            </div>
          )}

          {sets.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold text-ink-2">Strength sets</h4>
              <table className="tnum w-full text-right text-xs">
                <thead className="text-ink-3"><tr className="border-b border-line">{['Exercise', 'Sets', 'Reps', 'Time', 'Max weight'].map((h, i) => <th key={h} className={`px-2 py-1.5 font-medium ${i === 0 ? 'text-left' : ''}`}>{h}</th>)}</tr></thead>
                <tbody>
                  {sets.map((x, i) => (
                    <tr key={i} className="border-b border-line/50 last:border-0">
                      <td className="px-2 py-1.5 text-left text-ink">{x.category === 'UNKNOWN' ? 'Unlabelled' : prettyType((x.sub ?? x.category).toLowerCase())}</td>
                      <td className="px-2 py-1.5">{fmtNum(x.sets)}</td>
                      <td className="px-2 py-1.5">{fmtNum(x.reps)}</td>
                      <td className="px-2 py-1.5">{fmtDuration(x.durationSec)}</td>
                      <td className="px-2 py-1.5">{x.maxWeightKg ? `${x.maxWeightKg} kg` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold text-ink-2"><Explain>Heart-rate zone distribution</Explain></h4>
            {!zTotal ? <p className="text-xs text-ink-3">No zone data recorded.</p> : (
              <div className="space-y-1.5">
                {zones.map((z, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className={`${zoneBounds ? 'w-24' : 'w-6'} tnum text-ink-3`}>Z{i + 1}{zoneBounds && ` · ${zoneBounds.floors[i]}–${i < 4 ? zoneBounds.floors[i + 1] - 1 : zoneBounds.max ?? ''}`}</span>
                    <div className="h-3 flex-1 rounded bg-raised"><div className="h-3 rounded" style={{ width: `${(z / zTotal) * 100}%`, background: C.zones[i] }} /></div>
                    <span className="tnum w-24 text-right text-ink-2">{fmtDuration(z)} · {Math.round((z / zTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {failed ? <p className="text-xs text-ink-3">Could not load lap and stream detail.</p> : !d ? <p className="text-xs text-ink-3">Loading .FIT detail…</p> : (
            <>
              {series.length > 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {d.stream && <RouteMap lat={d.stream.lat ?? []} lng={d.stream.lng ?? []} />}
                  {[{ key: 'hr', label: 'Heart rate (bpm)', color: C.s5, show: true },
                    { key: 'speed', label: `Speed (${u.speedUnit})`, color: C.s1, show: moving },
                    { key: 'power', label: 'Power (W)', color: C.s4, show: hasPower },
                    { key: 'cadence', label: 'Cadence (per min)', color: C.s3, show: series.some((p) => p.cadence) },
                    { key: 'alt', label: `Elevation (${u.elevUnit})`, color: C.s7, show: hilly }]
                    .filter((s) => s.show).map((s) => (
                    <div key={s.key}>
                      <div className="mb-1 text-xs font-medium text-ink-2"><Explain>{s.label}</Explain></div>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                          <CartesianGrid stroke={C.grid} vertical={false} />
                          <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => fmtDuration(v)} minTickGap={40} {...axis} />
                          <YAxis domain={['auto', 'auto']} {...axis} />
                          <Tooltip content={<Tip labelFmt={(v: number) => fmtDuration(v)} />} cursor={{ stroke: C.ink3, strokeDasharray: '3 3' }} />
                          {s.key === 'hr' && a.avgHr && <ReferenceLine y={a.avgHr} stroke={C.ink3} strokeDasharray="4 4" />}
                          <Line dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              )}
              {(laps.length > 0 || !!a.distanceM) && <div>
                <h4 className="mb-2 text-xs font-semibold text-ink-2">{pace ? 'Pace' : 'Speed'}{laps.some((l) => l.avgPower) ? ' / power' : ''} splits</h4>
                {!laps.length ? <p className="text-xs text-ink-3">{d.fitStatus === 'ok' ? 'No laps in this file.' : 'No .FIT file available for this activity.'}</p> : (
                  <div className="overflow-x-auto">
                    <table className="tnum w-full min-w-[520px] text-right text-xs">
                      <thead className="text-ink-3"><tr className="border-b border-line">
                        {['Lap', 'Distance', 'Time', pace ? 'Pace' : 'Speed', 'Avg HR', 'Power', 'Efficiency'].map((h, i) => <th key={h} className={`px-2 py-1.5 font-medium ${i === 0 ? 'text-left' : ''}`}><Explain>{h}</Explain></th>)}
                      </tr></thead>
                      <tbody>
                        {laps.map((l) => {
                          const e = efficiency({ type: a.type, avgSpeed: l.avgSpeed, avgHr: l.avgHr, avgPower: l.avgPower });
                          return (
                            <tr key={l.index} className="border-b border-line/50 last:border-0">
                              <td className="px-2 py-1.5 text-left text-ink-3">{l.index + 1}</td>
                              <td className="px-2 py-1.5">{l.distanceM ? u.dist(l.distanceM) : '–'}</td>
                              <td className="px-2 py-1.5">{fmtDuration(l.durationSec)}</td>
                              <td className="px-2 py-1.5">{l.distanceM ? u.paceOrSpeed(a.type, l.avgSpeed) : '–'}</td>
                              <td className="px-2 py-1.5">{fmtNum(l.avgHr)}</td>
                              <td className="px-2 py-1.5">{l.avgPower ? `${fmtNum(l.avgPower)} W` : '–'}</td>
                              <td className="px-2 py-1.5">{e ? e.value.toFixed(2) : '–'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
