"use client";
import { useState } from "react";
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { composeAdvice, digits, doyLabel } from "@/lib/advisory";
import type { Climate, CropKey, District, Onset } from "@/lib/types";
import { AreaShell } from "./AreaShell";
import { ClientOnly } from "./ClientOnly";
import { useI18n } from "./LocaleProvider";
import { YearChart } from "./YearChart";

const CROPS: CropKey[] = ["aman", "aus", "boro"];

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2 last:border-0">
      <dt className="text-sm text-ink-2">{k}</dt>
      <dd className={`text-right ${strong ? "font-semibold" : ""}`}>{v}</dd>
    </div>
  );
}

function OnsetChart({ c, o }: { c: Climate; o: Onset }) {
  const { locale, n } = useI18n();
  const data = c.years.map((y, i) => ({ year: y, doy: o.onset_doy[i] })).filter((d) => d.doy != null) as { year: number; doy: number }[];
  const [a0, a1] = o.periods.a, [b0, b1] = o.periods.b;
  const col = (y: number) => (y >= b0 ? "#d68a3c" : y >= a0 ? "#3b7da6" : "#b9c8c1");
  const yr = (v: number) => String(n(v)).replace(/[,،]/g, "");
  return (
    <ClientOnly height={300}>
      <div className="h-[300px]" role="img" aria-label="Signal date by year">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#d5e0da" vertical={false} />
            <XAxis type="number" dataKey="year" domain={[c.years[0], c.years[c.years.length - 1]]} tick={{ fontSize: 11, fill: "#7e918d" }} tickLine={false} axisLine={false} tickFormatter={yr} />
            <YAxis type="number" dataKey="doy" domain={["dataMin - 8", "dataMax + 8"]} tick={{ fontSize: 11, fill: "#7e918d" }} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => doyLabel(Math.round(v), locale)} />
            <Tooltip cursor={false} formatter={(v) => [doyLabel(Number(v), locale), ""]} labelFormatter={() => ""} separator="" />
            {o.compare.median_a != null && <ReferenceLine segment={[{ x: a0, y: o.compare.median_a }, { x: a1, y: o.compare.median_a }]} stroke="#3b7da6" strokeWidth={2.5} />}
            {o.compare.median_b != null && <ReferenceLine segment={[{ x: b0, y: o.compare.median_b }, { x: b1, y: o.compare.median_b }]} stroke="#d68a3c" strokeWidth={2.5} />}
            <Scatter data={data} isAnimationActive={false}>{data.map((d) => <Cell key={d.year} fill={col(d.year)} />)}</Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ClientOnly>
  );
}

export function WindowView({ district, climate: c, flagged }: { district: District; climate: Climate; flagged: { aman: number; aus: number } }) {
  const { locale, t, n } = useI18n();
  const [crop, setCrop] = useState<CropKey>("aman");
  const name = locale === "bn" ? district.name_bn : district.name_en;
  const adv = composeAdvice(c, crop, locale, t, name);
  const pf = (p: number | null) => (p == null ? "–" : n(p, 2));
  const sg = (x: number | null, unit = true) => (x == null ? "–" : `${x > 0 ? "+" : x < 0 ? "−" : ""}${n(Math.abs(x), 1)}${unit ? "" : ""}`);
  const periods = (a: number[]) => digits(locale, `${a[0]}–${a[1]}`);
  const o = crop === "boro" ? null : c.crops[crop].onset;
  const sms = adv.sms;
  const gdd = c.crops[crop].gdd;

  return (
    <AreaShell district={district} active="window" badges={["analysis", "nasa"]}>
      <h2 className="text-2xl font-semibold tracking-tight">{t("window.title")}</h2>
      <p className="mt-2 max-w-2xl text-ink-2">{t("window.lead")}</p>

      <div role="tablist" className="mt-6 flex gap-1.5">
        {CROPS.map((k) => (
          <button key={k} role="tab" aria-selected={crop === k} onClick={() => setCrop(k)} className="chip">{t(`crops.${k}`)} <span className="ml-1.5 hidden opacity-70 sm:inline">{t(`crops.season.${k}`)}</span></button>
        ))}
      </div>

      <section className="panel mt-5 p-6 sm:p-8">
        <p className="serif max-w-3xl text-xl leading-[1.55] sm:text-2xl">{adv.text}</p>
      </section>

      {o ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="panel p-5 sm:p-6">
            <h3 className="font-semibold">{t("window.chartTitle")}</h3>
            <p className="mt-1 text-sm text-ink-2">{t("window.definition", { signal: t(`signal.${crop as "aus" | "aman"}`) })}</p>
            <div className="mt-4"><OnsetChart c={c} o={o} /></div>
            <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: "#3b7da6" }} />{periods(o.periods.a)}</span>
              <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: "#d68a3c" }} />{periods(o.periods.b)}</span>
              <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: "#b9c8c1" }} />{digits(locale, "1981–1997")}</span>
            </p>
            {o.years_without_event.length > 0 && <p className="mt-2 text-sm text-ink-3">{t("window.noEvent", { y: digits(locale, o.years_without_event.join(", ")) })}</p>}
          </section>

          <section className="panel p-5 sm:p-6">
            <h3 className="font-semibold">{t("window.evidence")}</h3>
            <dl className="mt-2">
              <Row k={`${t("window.median")} ${periods(o.periods.a)}`} v={o.compare.median_a != null ? doyLabel(Math.round(o.compare.median_a), locale) : "–"} />
              <Row k={`${t("window.median")} ${periods(o.periods.b)}`} v={o.compare.median_b != null ? doyLabel(Math.round(o.compare.median_b), locale) : "–"} />
              <Row k={t("window.shift")} v={o.compare.shift != null ? t("window.days", { n: sg(o.compare.shift) }) : "–"} strong />
              <Row k={t("window.p")} v={pf(o.compare.p)} />
              <Row k={t("window.long", { a: periods(o.periods.long_a), b: periods(o.periods.long_b) })} v={`${o.long_record.shift != null ? t("window.days", { n: sg(o.long_record.shift) }) : "–"} · p ${pf(o.long_record.p)}`} />
              <Row k={t("window.lower", { f: n(o.sensitivity.lower.fraction * 100) })} v={`${o.sensitivity.lower.shift_days != null ? t("window.days", { n: sg(o.sensitivity.lower.shift_days) }) : "–"} · p ${pf(o.sensitivity.lower.p)}`} />
              <Row k={t("window.upper", { f: n(o.sensitivity.upper.fraction * 100) })} v={`${o.sensitivity.upper.shift_days != null ? t("window.days", { n: sg(o.sensitivity.upper.shift_days) }) : "–"} · p ${pf(o.sensitivity.upper.p)}`} />
              <Row k={o.direction_consistent ? t("window.agree") : t("window.disagree")} v={o.direction_consistent ? t("window.yes") : t("window.no")} />
            </dl>
            <p className="mt-3 text-xs text-ink-3">{t("window.thin")}</p>
          </section>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="panel p-5 sm:p-6">
            <h3 className="font-semibold">{t("window.coldNights")}</h3>
            <p className="mt-1 text-sm text-ink-2">{t("window.boroLead")}</p>
            <div className="mt-4"><YearChart years={c.years} values={c.series.boro_cold_nights} unit={t("env.unit.t_mean")} from={c.homogeneous_from} digits={1} color="#6c6a9b" /></div>
          </section>
          <section className="panel p-5 sm:p-6">
            <h3 className="font-semibold">{t("window.gdd")}</h3>
            <div className="mt-4"><YearChart years={c.years} values={gdd.values} unit="°C·d" from={c.homogeneous_from} digits={0} color="#d68a3c" /></div>
            <dl className="mt-3">
              <Row k={t("window.gddChange")} v={gdd.compare.shift != null ? `${sg(gdd.compare.shift)} °C·d · p ${pf(gdd.compare.p)}` : "–"} />
              <Row k={t("window.gddTrend")} v={gdd.trend_per_decade != null ? `${sg(gdd.trend_per_decade)} °C·d · p ${pf(gdd.trend_p)}` : "–"} />
            </dl>
          </section>
        </div>
      )}

      <section className="tile mt-6 p-5">
        <h3 className="font-semibold">{t("window.sms")}</h3>
        <p className="mt-2 rounded-xl bg-surface-2 p-3">{sms}</p>
        <p className="mt-2 text-sm text-ink-2">{t("window.smsCount", { n: n(sms.length) })}{sms.length > 70 ? ` · ${t("window.smsLong")}` : ""}</p>
      </section>

      <section className="mt-6 rounded-2xl border border-[#e8d3b0] bg-[#fbf3e4] p-5">
        <h3 className="font-semibold text-[#7a4f16]">{t("window.caveatTitle")}</h3>
        <p className="mt-1.5 text-[#5f4520]">{t("window.caveat", { k: n(flagged.aman), j: n(flagged.aus) })}</p>
      </section>
    </AreaShell>
  );
}
