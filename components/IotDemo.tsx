"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { PROFILES, decide, type Decision } from "@/lib/controller";
import { iotTick, nasaAdjust, type IotEvent, type IotState, type Node } from "@/lib/iot";
import { INITIAL } from "@/lib/sim";
import type { Climate, CropKey } from "@/lib/types";
import { Badge } from "./Badge";
import { useI18n } from "./LocaleProvider";

const NODES: Node[] = ["sensor", "gateway", "control", "pump", "farmer"];
const NODE_COLOR: Record<Node, string> = { sensor: "#6fa35b", gateway: "#3b7da6", control: "#6c6a9b", pump: "#d68a3c", farmer: "#2e6f57" };
const start = (): IotState => ({ ...INITIAL, moisture: 72, tankPct: 55, seed: 7, refillIn: null });
type Line = { h: number; e: IotEvent };

function Bar({ value, marks, color }: { value: number; marks?: number[]; color: string }) {
  return (
    <div className="relative mt-2 h-2.5 rounded-full bg-surface-2">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${value}%`, background: color }} />
      {marks?.map((m) => <span key={m} className="absolute -top-1 h-4.5 w-0.5 rounded bg-ink-2" style={{ left: `${m}%` }} aria-hidden />)}
    </div>
  );
}

export function IotDemo({ climate: c }: { climate: Climate }) {
  const { t, n } = useI18n();
  const [crop, setCrop] = useState<CropKey>("aman");
  const [s, setS] = useState<IotState>(start);
  const [run, setRun] = useState(false);
  const [log, setLog] = useState<Line[]>([]);
  const [active, setActive] = useState<Node | null>(null);
  const base = PROFILES[crop];
  const { profile, dry } = useMemo(() => nasaAdjust(PROFILES[crop], c.recent), [crop, c.recent]);
  const decision: Decision = decide(s, profile);
  const ref = useRef(s);
  useEffect(() => { ref.current = s; }, [s]);

  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      const r = iotTick({ ...ref.current, crop }, profile);
      ref.current = r.state;
      setS(r.state);
      const shown = r.events.filter((e) => e.key !== "iot.ev.reading" || r.state.hour % 2 === 0 || r.events.length === 1);
      if (shown.length) setLog((l) => [...shown.map((e) => ({ h: r.state.hour, e })).reverse(), ...l].slice(0, 40));
      setActive(r.events[r.events.length - 1]?.node ?? "sensor");
    }, 1100);
    return () => clearInterval(id);
  }, [run, crop, profile]);

  const restart = () => { setRun(false); setS(start()); setLog([]); setActive(null); };
  const fmt = (e: IotEvent) => {
    const v = { ...e.vars };
    for (const k of Object.keys(v)) if (typeof v[k] === "number") v[k] = n(v[k] as number, k === "m" || k === "t" ? 1 : 0);
    return t(e.key, v);
  };

  return (
    <section className="panel overflow-hidden" aria-labelledby="iot-h">
      <div className="border-b border-line bg-[#eeedf8] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="iot-h" className="text-xl font-semibold tracking-tight">{t("iot.title")}</h2>
          <div className="flex gap-2"><Badge kind="simulated" /><Badge kind="demo" /></div>
        </div>
        <p className="mt-1.5 max-w-3xl text-sm text-[#3f3d73]">{t("iot.lead")}</p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={() => setRun((r) => !r)} aria-pressed={run}>{run ? t("iot.pause") : t("iot.start")}</button>
          <button className="chip" onClick={restart}>{t("iot.reset")}</button>
          <span className="mx-1 h-6 w-px bg-line" aria-hidden />
          {(["aus", "aman", "boro"] as CropKey[]).map((k) => <button key={k} className="chip" aria-pressed={crop === k} onClick={() => setCrop(k)}>{t(`crops.${k}`)}</button>)}
          <span className="ml-auto text-sm text-ink-3">{t("iot.hour", { h: n(s.hour) })}</span>
        </div>

        <p className={`rounded-xl px-4 py-3 text-sm ${dry ? "bg-[#fbf3e4] text-[#5f4520]" : "bg-[#eaf3fa] text-[#255a7a]"}`}>
          <Badge kind="nasa" />{" "}
          {dry
            ? t("iot.nasaDry", { a: n(c.recent.rain_30d_mm), b: n(c.recent.rain_30d_normal_mm), x: n(profile.lowPct), y: n(base.lowPct) })
            : t("iot.nasaOk", { a: n(c.recent.rain_30d_mm), b: n(c.recent.rain_30d_normal_mm), x: n(profile.lowPct) })}
        </p>

        <ol className="grid gap-2 md:grid-cols-5" aria-label={t("iot.how")}>
          {NODES.map((k, i) => (
            <li key={k} className={`relative rounded-2xl border px-3 py-3 text-sm transition-colors ${active === k ? "border-transparent text-white" : "border-line bg-surface"}`} style={active === k ? { background: NODE_COLOR[k] } : undefined}>
              <span className="flex items-center gap-2 font-medium">
                <span className={`size-2.5 rounded-full ${active === k && run ? "animate-ping" : ""}`} style={{ background: active === k ? "#fff" : NODE_COLOR[k] }} aria-hidden />
                {t(`iot.node.${k}`)}
              </span>
              {i < NODES.length - 1 && <span aria-hidden className="absolute -bottom-2 left-6 h-2 w-0.5 bg-line md:-right-2 md:bottom-auto md:left-auto md:top-1/2 md:h-0.5 md:w-2" />}
            </li>
          ))}
        </ol>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="tile p-4">
            <p className="text-sm text-ink-2">{t("iot.soil")}</p>
            <p className="text-2xl font-semibold">{s.moisture == null ? "–" : `${n(s.moisture, 1)}%`}</p>
            <Bar value={s.moisture ?? 0} marks={[profile.lowPct, profile.targetPct]} color="#6fa35b" />
            <p className="mt-1.5 text-xs text-ink-3">{t("iot.startLevel")}: {n(profile.lowPct)}% · {t("iot.target")}: {n(profile.targetPct)}%</p>
          </div>
          <div className="tile p-4">
            <p className="text-sm text-ink-2">{t("iot.tank")}</p>
            <p className="text-2xl font-semibold">{n(s.tankPct, 1)}%</p>
            <Bar value={s.tankPct} marks={[profile.minTankPct]} color="#3b7da6" />
          </div>
          <div className="tile p-4">
            <p className="text-sm text-ink-2">{t("iot.rain")}</p>
            <p className="text-2xl font-semibold">{n(s.rainMm)} {t("env.unit.rain_total")}</p>
          </div>
          <div className={`rounded-[14px] p-4 ${s.pumpOn ? "bg-green text-white" : "tile"}`}>
            <p className="text-sm opacity-80">{t("iot.pump")}</p>
            <p className="text-2xl font-semibold">{s.pumpOn ? t("iot.on") : t("iot.off")}</p>
            <p className="mt-1 text-xs opacity-90">{t(`field.d.${decision}.title`)}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h3 className="font-semibold">{t("iot.feed")}</h3>
            <ul className="mt-2 h-64 space-y-1 overflow-y-auto rounded-2xl bg-orbit p-3 text-[13px] text-[#d8ebe2]" aria-live="polite">
              {log.length === 0 && <li className="opacity-70">{t("iot.concept")}</li>}
              {log.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 tabular-nums opacity-60">{String(l.h).padStart(3, "0")}</span>
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: NODE_COLOR[l.e.node] }} aria-hidden />
                  <span>{fmt(l.e)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">{t("iot.how")}</h3>
            <ol className="mt-2 space-y-2.5">
              {["1", "2", "3", "4", "5"].map((k) => (
                <li key={k} className="flex gap-3 text-sm text-ink-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-green-soft text-xs font-semibold text-green-deep">{n(+k)}</span>
                  <span>{t(`iot.steps.${k}`)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-ink-3">{t("iot.concept")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
