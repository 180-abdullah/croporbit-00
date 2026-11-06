"use client";
import { useEffect, useRef, useState } from "react";
import { PROFILES, decide, pumpAllowed, validPct, type Decision } from "@/lib/controller";
import { INITIAL, SCENARIOS, advance, type SimState } from "@/lib/sim";
import type { Climate, CropKey, District } from "@/lib/types";
import { AreaShell } from "./AreaShell";
import { IotDemo } from "./IotDemo";
import { useI18n } from "./LocaleProvider";

const KEY = "croporbit.field.v1";
type Ev = { at: string; msg: string };
const tone: Record<Decision, string> = {
  BLOCKED_SENSOR_FAULT: "bg-[#f6e0dc] text-[#7a2c22]", BLOCKED_LOW_TANK: "bg-[#f6e0dc] text-[#7a2c22]", STOPPED_RUNTIME_LIMIT: "bg-[#f6e8d3] text-[#7a4f16]",
  DELAYED_RAIN: "bg-[#dcebf3] text-[#255a7a]", NOT_NEEDED_TARGET_REACHED: "bg-green-soft text-green-deep", IRRIGATION_RECOMMENDED: "bg-green text-white", NOT_NEEDED_MOISTURE_ADEQUATE: "bg-green-soft text-green-deep",
};

export function FieldView({ district, climate: c }: { district: District; climate: Climate }) {
  const { t, n } = useI18n();
  const [s, setS] = useState<SimState>(INITIAL);
  const [log, setLog] = useState<Ev[]>([]);
  const [err, setErr] = useState<Record<string, boolean>>({});
  const [rev, setRev] = useState(0);
  const loaded = useRef(false);
  const prev = useRef<Decision | null>(null);
  const p = PROFILES[s.crop];
  const decision = decide(s, p);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try { const raw = localStorage.getItem(KEY); if (raw) { const j = JSON.parse(raw); if (j.s) { setS(j.s); setRev((r) => r + 1); } if (Array.isArray(j.log)) setLog(j.log); } } catch { /* ignore */ }
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(KEY, JSON.stringify({ s, log })); } catch { /* ignore */ } }, [s, log]);

  const add = (msg: string) => setLog((l) => [{ at: new Date().toLocaleTimeString(), msg }, ...l].slice(0, 40));
  useEffect(() => {
    if (!loaded.current) return;
    if (prev.current && prev.current !== decision) add(t("field.ev.decision", { d: t(`field.d.${decision}.title`) }));
    prev.current = decision;
  }, [decision]); // eslint-disable-line react-hooks/exhaustive-deps

  const onNum = (key: "moisture" | "tankPct" | "runtimeMin" | "rainMm", max: number) => (v: string) => {
    const x = v.trim() === "" ? NaN : Number(v);
    const ok = Number.isFinite(x) && x >= 0 && x <= max;
    setErr((e) => ({ ...e, [key]: !ok }));
    if (ok) setS((o) => ({ ...o, [key]: x }));
    else if (key === "moisture") setS((o) => ({ ...o, moisture: null }));
  };
  const step = () => { const r = advance(s); setS(r.state); add(t("field.ev.advance", { m: r.state.moisture == null ? "–" : n(r.state.moisture, 1), t: n(r.state.tankPct, 1) })); };
  const scenario = (k: string) => { setS({ ...s, ...SCENARIOS[k], pumpOn: false }); setErr({}); setRev((r) => r + 1); add(t("field.ev.scenario", { s: t(`field.sc.${k}`) })); };
  const reset = () => { setS(INITIAL); setLog([]); setErr({}); setRev((r) => r + 1); prev.current = null; add(t("field.ev.reset")); };
  const togglePump = () => { const on = !s.pumpOn; setS({ ...s, pumpOn: on }); add(t("field.ev.pump", { s: on ? t("field.pumpOn") : t("field.pumpOff") })); };

  const numField = (id: string, label: string, k: "moisture" | "tankPct" | "runtimeMin" | "rainMm", max: number, value: number | null) => (
    <div key={id}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={id} inputMode="decimal" className="field" defaultValue={value ?? ""} key={`${id}-${rev}-${s.hour}`} aria-invalid={!!err[k]} onChange={(e) => onNum(k, max)(e.target.value)} />
      {err[k] && <p className="mt-1 text-xs text-danger">{t("field.invalid")}</p>}
    </div>
  );

  return (
    <AreaShell district={district} active="field" badges={["simulated", "demo"]}>
      <div role="note" className="rounded-2xl border border-[#cfc9ea] bg-[#eeedf8] px-5 py-4 text-[#3f3d73]">{t("field.banner")}</div>
      <div className="mt-6"><IotDemo climate={c} /></div>
      <h2 className="mt-10 text-xl font-semibold tracking-tight">{t("iot.manual")}</h2>
      <p className="mt-1 text-sm text-ink-2">{t("iot.manualLead")}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="panel p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="crop" className="mb-1 block text-sm font-medium">{t("field.crop")}</label>
              <select id="crop" className="field" value={s.crop} onChange={(e) => setS({ ...s, crop: e.target.value as CropKey })}>
                {(["aus", "aman", "boro"] as CropKey[]).map((k) => <option key={k} value={k}>{t(`crops.${k}`)}</option>)}
              </select>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium">{t("field.sensor")}</span>
              <button className="chip" aria-pressed={!s.sensorOk} onClick={() => setS({ ...s, sensorOk: !s.sensorOk })}>{s.sensorOk ? t("field.sensorOk") : t("field.sensorFault")}</button>
            </div>
            {numField("m", t("field.moisture"), "moisture", 100, s.moisture)}
            {numField("tk", t("field.tank"), "tankPct", 100, s.tankPct)}
            {numField("rt", t("field.runtime"), "runtimeMin", 1440, s.runtimeMin)}
            {numField("rn", t("field.rain"), "rainMm", 300, s.rainMm)}
          </div>
          <p className="mt-4 text-xs text-ink-3">{t("field.limits", { low: n(p.lowPct), target: n(p.targetPct), max: n(p.maxRuntimeMin), tank: n(p.minTankPct) })} {t("field.limitsNote")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn" onClick={step}>{t("field.advance")}</button>
            <button className="btn-quiet bg-green-soft text-green-deep" onClick={togglePump} disabled={!s.pumpOn && !pumpAllowed(decision)} style={{ opacity: !s.pumpOn && !pumpAllowed(decision) ? 0.5 : 1 }}>{t("field.pump")}: {s.pumpOn ? t("field.pumpOn") : t("field.pumpOff")}</button>
            <button className="chip" onClick={reset}>{t("field.reset")}</button>
          </div>
          <h3 className="mt-6 text-sm font-semibold">{t("field.scenarios")}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.keys(SCENARIOS).map((k) => <button key={k} className="chip" onClick={() => scenario(k)}>{t(`field.sc.${k}`)}</button>)}
          </div>
        </section>

        <div className="space-y-6">
          <section className={`rounded-[18px] p-6 ${tone[decision]}`} aria-live="polite">
            <p className="text-sm opacity-80">{t("field.decision")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{t(`field.d.${decision}.title`)}</p>
            <p className="mt-2 opacity-90">{t(`field.d.${decision}.why`)}</p>
            {!validPct(s.moisture) && <p className="mt-2 text-sm opacity-90">{t("field.invalid")}</p>}
          </section>
          <section className="tile p-5">
            <h3 className="font-semibold">{t("field.fert.title")}</h3>
            <p className="mt-1 text-sm text-ink-2">{t("field.fert.note")}</p>
            <button className="btn-quiet mt-3 bg-green-soft text-green-deep" onClick={() => add(t("field.fert.approved"))}>{t("field.fert.approve")}</button>
          </section>
          <section className="tile p-5">
            <h3 className="font-semibold">{t("field.nasa.title")}</h3>
            <p className="mt-1 text-sm text-ink-2">{t("field.nasa.body", { a: n(c.recent.rain_7d_mm, 0), b: n(c.recent.rain_7d_normal_mm, 0) })}</p>
          </section>
        </div>
      </div>
      <section className="panel mt-6 p-5">
        <h3 className="font-semibold">{t("field.log")}</h3>
        {log.length === 0 ? <p className="mt-2 text-sm text-ink-2">{t("field.logEmpty")}</p> : (
          <ul className="mt-2 max-h-64 divide-y divide-line/70 overflow-y-auto text-sm">
            {log.map((e, i) => <li key={i} className="flex gap-3 py-1.5"><time className="shrink-0 text-ink-3">{e.at}</time><span>{e.msg}</span></li>)}
          </ul>
        )}
      </section>
    </AreaShell>
  );
}
