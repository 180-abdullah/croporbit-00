/** Simulated IoT irrigation loop: sensors -> gateway -> control centre (rules + NASA signal) -> pump -> farmer SMS.
 *  Concept demo only. No hardware is connected; NASA values are the real analysis output for the district. */
import { pumpAllowed, type Decision, type Profile } from "./controller";
import { advance, rand, type SimState } from "./sim";

export type NasaRecent = { rain_30d_mm: number; rain_30d_normal_mm: number };
export type IotEvent = { key: string; vars?: Record<string, string | number>; node: Node };
export type Node = "sensor" | "gateway" | "control" | "pump" | "farmer";
export type IotState = SimState & { refillIn: number | null };

/** NASA signal: if the last 30 days had less than half the usual rain (and the usual amount is meaningful),
 *  the control centre starts irrigating 5 points earlier. */
export function nasaAdjust(p: Profile, r: NasaRecent): { profile: Profile; dry: boolean } {
  const dry = r.rain_30d_normal_mm >= 10 && r.rain_30d_mm < 0.5 * r.rain_30d_normal_mm;
  return { dry, profile: dry ? { ...p, lowPct: Math.min(p.targetPct - 5, p.lowPct + 5) } : p };
}

export function iotTick(s: IotState, p: Profile): { state: IotState; decision: Decision; events: IotEvent[] } {
  const ev: IotEvent[] = [];
  let st: IotState = { ...s };
  // weather feed: occasional rain forecast
  const [r1, s1] = rand(st.seed);
  const [r2, s2] = rand(s1);
  st.seed = s2;
  if (st.hour >= 12 && st.rainMm === 0 && r1 < 0.05) {
    st.rainMm = 12 + Math.round(r2 * 10);
    ev.push({ key: "iot.ev.rainFc", vars: { mm: st.rainMm }, node: "gateway" });
  }
  const wasOn = st.pumpOn;
  const r = advance(st, p);
  st = { ...st, ...r.state };
  const decision = r.decision;
  ev.push({ key: "iot.ev.reading", vars: { m: st.moisture ?? "–", t: st.tankPct, rain: st.rainMm }, node: "sensor" });
  if (wasOn && !st.pumpOn) {
    ev.push({ key: "iot.ev.off", vars: { why: decision }, node: "pump" });
    ev.push({ key: "iot.ev.smsOff", node: "farmer" });
  }
  if (!st.pumpOn && pumpAllowed(decision)) {
    st.pumpOn = true;
    ev.push({ key: "iot.ev.on", node: "control" });
    ev.push({ key: "iot.ev.smsOn", vars: { m: st.moisture ?? "–" }, node: "farmer" });
  }
  if (decision === "BLOCKED_LOW_TANK" && st.refillIn === null) {
    st.refillIn = 3;
    ev.push({ key: "iot.ev.refill", node: "control" });
  } else if (st.refillIn !== null) {
    st.refillIn -= 1;
    if (st.refillIn <= 0) { st.tankPct = 90; st.refillIn = null; ev.push({ key: "iot.ev.refilled", node: "sensor" }); }
  }
  if (st.hour % 24 === 0) { st.runtimeMin = 0; ev.push({ key: "iot.ev.newDay", node: "control" }); }
  if (decision === "STOPPED_RUNTIME_LIMIT" && st.pumpOn) st.pumpOn = false;
  return { state: st, decision, events: ev };
}
