import { describe, expect, it } from "vitest";
import { PROFILES } from "../lib/controller";
import { iotTick, nasaAdjust, type IotState } from "../lib/iot";
import { INITIAL } from "../lib/sim";

const p = PROFILES.aman;
describe("NASA signal", () => {
  it("raises the start level only when the last 30 days were clearly dry", () => {
    expect(nasaAdjust(p, { rain_30d_mm: 30, rain_30d_normal_mm: 170 }).profile.lowPct).toBe(p.lowPct + 5);
    expect(nasaAdjust(p, { rain_30d_mm: 150, rain_30d_normal_mm: 170 }).dry).toBe(false);
    expect(nasaAdjust(p, { rain_30d_mm: 0, rain_30d_normal_mm: 4 }).dry).toBe(false); // dry season: no signal
  });
});
describe("IoT loop", () => {
  it("sends PUMP ON automatically when irrigation is needed", () => {
    const r = iotTick({ ...INITIAL, moisture: 50, refillIn: null }, p);
    expect(r.state.pumpOn).toBe(true);
    expect(r.events.some((e) => e.key === "iot.ev.on")).toBe(true);
  });
  it("never starts the pump with a faulty sensor", () => {
    const r = iotTick({ ...INITIAL, moisture: 40, sensorOk: false, refillIn: null }, p);
    expect(r.state.pumpOn).toBe(false);
  });
  it("runs many hours without leaving safe bounds", () => {
    let s: IotState = { ...INITIAL, moisture: 70, tankPct: 50, refillIn: null };
    for (let i = 0; i < 200; i++) {
      const r = iotTick(s, p);
      s = r.state;
      expect(s.moisture!).toBeGreaterThanOrEqual(0);
      expect(s.moisture!).toBeLessThanOrEqual(100);
      if (s.pumpOn) expect(r.decision).toBe("IRRIGATION_RECOMMENDED");
    }
  });
});

import { FAQ, matchFaq } from "../lib/faq";
describe("chat helper", () => {
  it("has 20 unique questions and matches Bangla and English", () => {
    expect(FAQ.length).toBe(20);
    expect(new Set(FAQ.map((f) => f.id)).size).toBe(20);
    expect(matchFaq("when to sow wheat")[0].id).toBe("wheat-time");
    expect(matchFaq("আলুর নাবি ধসা")[0].id).toBe("potato-blight");
    expect(matchFaq("hello")).toEqual([]);
  });
});
