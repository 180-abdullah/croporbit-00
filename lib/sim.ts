/** Seeded, deterministic field simulator. Not real data. */
import { PROFILES, decide, pumpAllowed, type Decision, type Profile, type Reading } from "./controller";
import type { CropKey } from "./types";

export type SimState = Reading & { crop: CropKey; seed: number; hour: number };

export const INITIAL: SimState = { crop: "aman", moisture: 62, sensorOk: true, tankPct: 80, runtimeMin: 0, rainMm: 0, pumpOn: false, seed: 20261104, hour: 0 };

export const SCENARIOS: Record<string, Partial<SimState>> = {
  dry: { moisture: 38, tankPct: 80, runtimeMin: 0, rainMm: 0, sensorOk: true, pumpOn: false },
  wet: { moisture: 92, tankPct: 80, runtimeMin: 20, rainMm: 0, sensorOk: true, pumpOn: false },
  lowTank: { moisture: 40, tankPct: 8, runtimeMin: 0, rainMm: 0, sensorOk: true, pumpOn: false },
  fault: { moisture: 50, tankPct: 80, runtimeMin: 0, rainMm: 0, sensorOk: false, pumpOn: false },
  rain: { moisture: 50, tankPct: 80, runtimeMin: 0, rainMm: 25, sensorOk: true, pumpOn: false },
  limit: { moisture: 40, tankPct: 80, runtimeMin: 360, rainMm: 0, sensorOk: true, pumpOn: false },
};

/** mulberry32 step: returns [0..1) and the next seed. */
export function rand(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));

/** One simulated hour. The pump is only allowed to run while the controller recommends irrigation. */
export function advance(s: SimState, p: Profile = PROFILES[s.crop]): { state: SimState; decision: Decision } {
  const [r1, seed1] = rand(s.seed);
  let { moisture, tankPct, runtimeMin, rainMm } = s;
  const pumpOn = s.pumpOn;
  if (moisture !== null && s.sensorOk) {
    const noise = (r1 - 0.5) * 0.6;
    moisture -= 0.9 + noise; // evaporation and crop uptake
    if (rainMm > 0) { moisture += Math.min(rainMm, 3) * 0.8; rainMm = Math.max(0, rainMm - 3); }
    if (pumpOn && runtimeMin < p.maxRuntimeMin && tankPct > 0) { moisture += 4.2; tankPct -= 3.5; runtimeMin += 60; }
    moisture = clamp(+moisture.toFixed(1));
  }
  tankPct = clamp(+tankPct.toFixed(1));
  let next: SimState = { ...s, moisture, tankPct, runtimeMin, rainMm, pumpOn, seed: seed1, hour: s.hour + 1 };
  const decision = decide(next, p);
  if (next.pumpOn && !pumpAllowed(decision)) next = { ...next, pumpOn: false };
  return { state: next, decision };
}
