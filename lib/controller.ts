/** Irrigation recommendation logic for the Field control simulation. Pure functions; nothing here touches hardware. */
import type { CropKey } from "./types";

export const DECISIONS = [
  "BLOCKED_SENSOR_FAULT",
  "BLOCKED_LOW_TANK",
  "STOPPED_RUNTIME_LIMIT",
  "DELAYED_RAIN",
  "NOT_NEEDED_TARGET_REACHED",
  "IRRIGATION_RECOMMENDED",
  "NOT_NEEDED_MOISTURE_ADEQUATE",
] as const;
export type Decision = (typeof DECISIONS)[number];

export type Profile = { key: CropKey; lowPct: number; targetPct: number; maxRuntimeMin: number; minTankPct: number; rainDelayMm: number };
export type Reading = { moisture: number | null; sensorOk: boolean; tankPct: number; runtimeMin: number; rainMm: number; pumpOn: boolean };

/** Demonstration thresholds, not agronomic advice. */
export const PROFILES: Record<CropKey, Profile> = {
  aus: { key: "aus", lowPct: 55, targetPct: 75, maxRuntimeMin: 300, minTankPct: 15, rainDelayMm: 10 },
  aman: { key: "aman", lowPct: 65, targetPct: 85, maxRuntimeMin: 360, minTankPct: 15, rainDelayMm: 10 },
  boro: { key: "boro", lowPct: 60, targetPct: 85, maxRuntimeMin: 360, minTankPct: 15, rainDelayMm: 10 },
};

export const validPct = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 100;

/** Priority order is part of the contract: a higher safety condition always wins. */
export function decide(r: Reading, p: Profile): Decision {
  if (!r.sensorOk || !validPct(r.moisture)) return "BLOCKED_SENSOR_FAULT";
  if (!validPct(r.tankPct) || r.tankPct < p.minTankPct) return "BLOCKED_LOW_TANK";
  if (!(r.runtimeMin < p.maxRuntimeMin)) return "STOPPED_RUNTIME_LIMIT";
  if (r.rainMm >= p.rainDelayMm && r.moisture < p.targetPct) return "DELAYED_RAIN";
  if (r.moisture >= p.targetPct) return "NOT_NEEDED_TARGET_REACHED";
  if (r.moisture < p.lowPct || r.pumpOn) return "IRRIGATION_RECOMMENDED"; // pumpOn: keep going until the target (hysteresis)
  return "NOT_NEEDED_MOISTURE_ADEQUATE";
}

/** The simulated pump may only run while the recommendation is to irrigate. */
export const pumpAllowed = (d: Decision) => d === "IRRIGATION_RECOMMENDED";
