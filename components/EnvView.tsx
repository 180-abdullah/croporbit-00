"use client";
import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { digits } from "@/lib/advisory";
import type { Climate, District } from "@/lib/types";
import { AreaShell } from "./AreaShell";
import { ClientOnly } from "./ClientOnly";
import { useI18n } from "./LocaleProvider";
import { YearChart } from "./YearChart";

const KEYS = ["rain_total", "rain_monsoon", "t_mean", "t_max", "hot_days", "soil_root", "solar", "humidity", "wind"] as const;
type K = (typeof KEYS)[number];
const COLOR: Record<K, string> = { rain_total: "#3b7da6", rain_monsoon: "#3b7da6", t_mean: "#d68a3c", t_max: "#d68a3c", hot_days: "#b5483c", soil_root: "#a4714f", solar: "#c9a227", humidity: "#6fa35b", wind: "#7e918d" };
const DIG: Record<K, number> = { rain_total: 0, rain_monsoon: 0, t_mean: 1, t_max: 1, hot_days: 0, soil_root: 2, solar: 1, humidity: 0, wind: 1 };

export function EnvView({ district, climate: c }: { district: District; climate: Climate }) {
  const { locale, t, n } = useI18n();
  const [k, setK] = useState<K>("rain_total");
  const tr = c.trends[k];
  const trended = !!tr?.trended;
  const unit = t(`env.unit.${k}`);
  const mf = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { month: "short", timeZone: "UTC" });
  const m = c.monthly;
  const last = c.years[c.years.length - 1];
  const data = Array.from({ length: 12 }, (_, i) => ({ m: mf.format(new Date(Date.UTC(2025, i, 1))), rain: m.rain[i], t: m.t_mean[i] }));
  const sign = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${n(Math.abs(x), 2)}`;
  return (
    <AreaShell district={district} active="env" badges={["nasa", "analysis"]}>
      <h2 className="text-2xl font-semibold tracking-tight">{t("env.title")}</h2>
      <p className="mt-2 text-ink-2">{t("env.lead")}</p>
      <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label={t("env.pick")}>
        {KEYS.map((x) => <button key={x} className="chip" aria-pressed={k === x} onClick={() => setK(x)}>{t(`env.series.${x}`)}</button>)}
      </div>
      <section className="panel mt-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">{t(`env.series.${k}`)} <span className="font-normal text-ink-3">({unit})</span></h3>
          {trended && tr.per_decade != null && tr.p != null
            ? <p className="text-sm text-ink-2">{t("env.trend", { x: sign(tr.per_decade), u: unit, p: n(tr.p, 2) })}</p>
            : <p className="text-sm text-ink-3">{t("env.noTrend")}</p>}
        </div>
        <div className="mt-4">
          <YearChart years={c.years} values={c.series[k]} unit={unit} color={COLOR[k]} digits={DIG[k]} from={trended ? c.homogeneous_from : undefined} breaks={trended ? [] : c.breaks.filter((b) => b > c.years[0])} shadeBefore={trended ? undefined : c.homogeneous_from} height={300} />
        </div>
        {!trended && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-ink-2">{t("env.breakNote")}</p>}
      </section>
      <section className="panel mt-6 p-5 sm:p-6">
        <h3 className="font-semibold">{t("env.monthly")}</h3>
        <p className="mt-1 text-sm text-ink-3">{t("env.monthlyNote", { r1: digits(locale, String(last - 9)), r2: digits(locale, String(last)), t1: digits(locale, String(c.homogeneous_from)), t2: digits(locale, String(last)) })}</p>
        <ClientOnly height={280}>
          <div className="mt-4 h-[280px]" role="img" aria-label={t("env.monthly")}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
                <CartesianGrid vertical={false} stroke="#d5e0da" />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#7e918d" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="r" tick={{ fontSize: 11, fill: "#7e918d" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => n(v)} />
                <YAxis yAxisId="t" orientation="right" domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11, fill: "#7e918d" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => n(v)} />
                <Tooltip formatter={(v, name) => [n(Number(v), 1), name === "rain" ? t("env.rain") : t("env.temp")]} />
                <Bar yAxisId="r" dataKey="rain" fill="#3b7da6" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Line yAxisId="t" dataKey="t" stroke="#d68a3c" strokeWidth={2.2} dot={{ r: 2.5, fill: "#d68a3c" }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ClientOnly>
        <p className="mt-2 flex gap-5 text-sm text-ink-2"><span><i className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: "#3b7da6" }} />{t("env.rain")}</span><span><i className="mr-2 inline-block size-2.5 rounded-full" style={{ background: "#d68a3c" }} />{t("env.temp")}</span></p>
      </section>
    </AreaShell>
  );
}
