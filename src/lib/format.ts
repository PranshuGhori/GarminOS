export type Units = 'metric' | 'imperial';
export const unitsFrom = (measurementSystem?: string | null): Units => (measurementSystem?.startsWith('statute') ? 'imperial' : 'metric');

export const fmtDate = (ymd: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
};
export const fmtDuration = (sec: number | null | undefined) => {
  if (sec == null) return '–';
  const s = Math.round(sec), hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
};
export const fmtHours = (h: number | null | undefined) => {
  if (h == null) return '–';
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};
export const fmtNum = (v: number | null | undefined, digits = 0) =>
  v == null ? '–' : v.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const isSwim = (type: string) => /swim/i.test(type);
export const isPaceSport = (type: string) => /run|walk|hik|swim/i.test(type);
export const prettyType = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;

/** Unit-aware formatters. Everything is stored in SI; conversion happens only here. */
export function unitFmt(u: Units) {
  const imp = u === 'imperial';
  const distUnit = imp ? 'mi' : 'km', perDist = imp ? 1609.344 : 1000;
  return {
    imperial: imp,
    distUnit,
    distVal: (m: number | null | undefined) => (m ? m / perDist : null),
    dist: (m: number | null | undefined, digits = 2) => (m ? `${(m / perDist).toFixed(digits)} ${distUnit}` : '–'),
    /** m/s → pace for foot sports, per-100 pace for swimming, speed otherwise */
    paceOrSpeed: (type: string, ms: number | null | undefined) => {
      if (!ms || ms <= 0.1) return '–';
      if (isSwim(type)) return `${mmss((imp ? 91.44 : 100) / ms)} /100${imp ? 'yd' : 'm'}`;
      if (isPaceSport(type)) return `${mmss(perDist / ms)} /${distUnit}`;
      return `${(ms * (imp ? 2.23694 : 3.6)).toFixed(1)} ${imp ? 'mph' : 'km/h'}`;
    },
    pace: (ms: number | null | undefined) => (!ms || ms <= 0.1 ? '–' : `${mmss(perDist / ms)} /${distUnit}`),
    speedVal: (ms: number) => +(ms * (imp ? 2.23694 : 3.6)).toFixed(1),
    speedUnit: imp ? 'mph' : 'km/h',
    elevVal: (m: number) => Math.round(imp ? m * 3.28084 : m),
    elevUnit: imp ? 'ft' : 'm',
    elev: (m: number | null | undefined) => (m ? `${Math.round(imp ? m * 3.28084 : m).toLocaleString()} ${imp ? 'ft' : 'm'}` : '–'),
    weight: (kg: number | null | undefined) => (kg ? `${(imp ? kg * 2.20462 : kg).toFixed(1)} ${imp ? 'lb' : 'kg'}` : '–'),
    weightVal: (kg: number) => +(imp ? kg * 2.20462 : kg).toFixed(1),
    weightUnit: imp ? 'lb' : 'kg',
    stride: (cm: number) => (imp ? `${(cm / 30.48).toFixed(2)} ft` : `${(cm / 100).toFixed(2)} m`),
  };
}
