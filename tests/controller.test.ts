import { describe, expect, it } from "vitest";
import { PROFILES, decide, type Reading } from "../lib/controller";
import { INITIAL, SCENARIOS, advance } from "../lib/sim";

const p = PROFILES.aman;
const base: Reading = { moisture: 70, sensorOk: true, tankPct: 80, runtimeMin: 0, rainMm: 0, pumpOn: false };
const d = (o: Partial<Reading>) => decide({ ...base, ...o }, p);

describe("decide", () => {
  it("covers every outcome", () => {
    expect(d({ sensorOk: false })).toBe("BLOCKED_SENSOR_FAULT");
    expect(d({ tankPct: 5 })).toBe("BLOCKED_LOW_TANK");
    expect(d({ moisture: 40, runtimeMin: p.maxRuntimeMin })).toBe("STOPPED_RUNTIME_LIMIT");
    expect(d({ moisture: 40, rainMm: 20 })).toBe("DELAYED_RAIN");
    expect(d({ moisture: 90 })).toBe("NOT_NEEDED_TARGET_REACHED");
    expect(d({ moisture: 40 })).toBe("IRRIGATION_RECOMMENDED");
    expect(d({ moisture: 75 })).toBe("NOT_NEEDED_MOISTURE_ADEQUATE");
  });
  it("rejects impossible or missing moisture", () => {
    for (const m of [null, NaN, -1, 101, Infinity]) expect(d({ moisture: m as number | null })).toBe("BLOCKED_SENSOR_FAULT");
  });
  it("respects the priority order", () => {
    expect(d({ sensorOk: false, tankPct: 1, runtimeMin: 999, rainMm: 99 })).toBe("BLOCKED_SENSOR_FAULT");
    expect(d({ tankPct: 1, runtimeMin: 999, rainMm: 99, moisture: 10 })).toBe("BLOCKED_LOW_TANK");
    expect(d({ runtimeMin: 999, rainMm: 99, moisture: 10 })).toBe("STOPPED_RUNTIME_LIMIT");
    expect(d({ rainMm: 99, moisture: 10 })).toBe("DELAYED_RAIN");
  });
  it("keeps irrigating between start and target once the pump is on", () => {
    expect(d({ moisture: 75, pumpOn: true })).toBe("IRRIGATION_RECOMMENDED");
    expect(d({ moisture: 86, pumpOn: true })).toBe("NOT_NEEDED_TARGET_REACHED");
  });
  it("rain does not delay when the target is already reached", () => {
    expect(d({ moisture: 90, rainMm: 50 })).toBe("NOT_NEEDED_TARGET_REACHED");
  });
});

describe("simulator", () => {
  it("is deterministic for a seed", () => {
    expect(advance(INITIAL)).toEqual(advance(INITIAL));
  });
  it("stops the pump when irrigation is no longer recommended and never exceeds bounds", () => {
    let s = { ...INITIAL, ...SCENARIOS.dry, pumpOn: true };
    for (let i = 0; i < 40; i++) {
      const r = advance(s);
      s = r.state;
      expect(s.moisture).toBeGreaterThanOrEqual(0);
      expect(s.moisture).toBeLessThanOrEqual(100);
      expect(s.tankPct).toBeGreaterThanOrEqual(0);
      if (r.decision !== "IRRIGATION_RECOMMENDED") expect(s.pumpOn).toBe(false);
    }
  });
  it("a faulty sensor never moves the reading", () => {
    const s = { ...INITIAL, ...SCENARIOS.fault };
    expect(advance(s).state.moisture).toBe(s.moisture);
  });
});
