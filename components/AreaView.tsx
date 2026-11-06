"use client";
import Link from "next/link";
import { composeAdvice, digits, type Advice } from "@/lib/advisory";
import type { Climate, CropKey, District } from "@/lib/types";
import { AreaShell, TOOLS, TOOL_PATH } from "./AreaShell";
import { Badge } from "./Badge";
import { LiveRecent } from "./LiveRecent";
import { useI18n } from "./LocaleProvider";
import { RainBars } from "./RainBars";

const badgeFor = { window: "analysis", env: "nasa", field: "simulated", hist: "unavailable", forecast: "unavailable" } as const;

function Tile({ label, value, sub, note }: { label: string; value: string; sub: string; note?: string }) {
  return (
    <div className="tile p-4">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-ink-3">{sub}</p>
      {note && <p className="mt-1.5 text-xs font-medium text-ink-2">{note}</p>}
    </div>
  );
}

export function AreaView({ district, climate: c }: { district: District; climate: Climate }) {
  const { locale, t, n } = useI18n();
  const name = locale === "bn" ? district.name_bn : district.name_en;
  const root = `/${locale}/area/${district.slug}/`;
  const crops: CropKey[] = ["aman", "aus", "boro"];
  const adv = Object.fromEntries(crops.map((k) => [k, composeAdvice(c, k, locale, t, name)])) as Record<CropKey, Advice>;
  const lead = (["aman", "aus", "boro"] as CropKey[]).find((k) => adv[k].kind !== "none" && adv[k].kind !== "boro-none") ?? "aman";
  const status = (k: CropKey) => {
    const a = adv[k];
    if (a.kind === "earlier" || a.kind === "later") return t(`area.status.${a.kind}`, { n: n(Math.abs(a.days)) });
    if (a.kind === "boro-warmer") return t("area.status.warmer");
    if (a.kind === "boro-cooler") return t("area.status.cooler");
    return t("area.status.none");
  };
  const per = (k: string, d = 2) => {
    const tr = c.trends[k];
    const x = tr?.per_decade;
    if (x == null) return { v: "–", note: undefined };
    const sign = x > 0 ? "+" : x < 0 ? "−" : "";
    return { v: `${sign}${n(Math.abs(x), d)}`, note: tr.p != null ? t(tr.p < 0.1 ? "area.reliable" : "area.noReliable", { p: n(tr.p, 2) }) : undefined };
  };
  const tm = per("t_mean"), hd = per("hot_days", 1), cn = per("boro_cold_nights");
  const r = c.recent;
  return (
    <AreaShell district={district} badges={["nasa", "analysis", "demo"]}>
      <section className="panel p-6 sm:p-9">
        <p className="text-sm font-medium text-green-deep">{t("area.advisory")} · {t(`crops.${lead}`)}</p>
        <p className="serif mt-3 max-w-3xl text-2xl leading-[1.5] sm:text-[1.75rem]">{adv[lead].text}</p>
        <dl className="mt-6 grid gap-2 sm:grid-cols-3">
          {crops.map((k) => (
            <div key={k} className="rounded-xl bg-surface-2 px-4 py-3">
              <dt className="text-sm text-ink-2">{t(`crops.${k}`)}</dt>
              <dd className="font-medium">{status(k)}</dd>
            </div>
          ))}
        </dl>
        <Link href={`${root}planting-window/`} className="btn mt-6">{t("area.openWindow")}</Link>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label={t("area.rain30")} value={`${n(r.rain_30d_mm, 0)} ${t("env.unit.rain_total")}`} sub={t("area.rain30sub", { x: n(r.rain_30d_normal_mm, 0) })} />
        <Tile label={t("area.tempTrend")} value={`${tm.v} ${t("env.unit.t_mean")}`} sub={t("area.tempTrendSub")} note={tm.note} />
        <Tile label={t("area.hotDays")} value={t("area.hotDaysValue", { x: hd.v })} sub={t("area.hotDaysSub")} note={hd.note} />
        <Tile label={t("area.coldNights")} value={`${cn.v} ${t("env.unit.t_mean")}`} sub={t("area.coldNightsSub")} note={cn.note} />
      </section>

      <LiveRecent c={c} />

      <section className="panel mt-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("area.recentRain")}</h2>
          <p className="text-sm text-ink-3">{t("area.recentRainSub", { d: digits(locale, r.last_day) })}</p>
        </div>
        <div className="mt-4"><RainBars days={r.days} /></div>
        <p className="mt-3 text-sm text-ink-2">{t("area.context")}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t("area.explore")}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((k) => (
            <li key={k}>
              <Link href={`${root}${TOOL_PATH[k]}/`} className="tile block h-full p-4 transition-colors hover:bg-green-soft">
                <span className="flex items-start justify-between gap-2"><span className="font-semibold">{t(`tools.${k}.title`)}</span><Badge kind={badgeFor[k]} /></span>
                <span className="mt-1.5 block text-sm text-ink-2">{t(`tools.${k}.desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AreaShell>
  );
}
