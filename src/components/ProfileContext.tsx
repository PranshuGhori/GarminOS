'use client';
import { createContext, useContext, useMemo } from 'react';
import { type Units, unitFmt } from '@/lib/format';

export type ZoneBounds = { floors: number[]; max: number | null } | null;
const Ctx = createContext<{ units: Units; zones: ZoneBounds }>({ units: 'metric', zones: null });

export function ProfileProvider({ units, zones, children }: { units: Units; zones: ZoneBounds; children: React.ReactNode }) {
  const value = useMemo(() => ({ units, zones }), [units, zones]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useUnits = () => { const { units } = useContext(Ctx); return useMemo(() => unitFmt(units), [units]); };
export const useZones = () => useContext(Ctx).zones;
