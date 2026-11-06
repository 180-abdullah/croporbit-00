"use client";
import Link from "next/link";
import type { District } from "@/lib/types";
import { Badge } from "./Badge";
import { useI18n } from "./LocaleProvider";

export const TOOLS = ["window", "env", "field", "hist", "forecast"] as const;
export const TOOL_PATH: Record<(typeof TOOLS)[number], string> = { window: "planting-window", env: "environmental-analysis", field: "field-control", hist: "historical-crops", forecast: "crop-forecast" };
export type ToolKey = (typeof TOOLS)[number];

export function AreaShell({ district, active, badges, children }: { district: District; active?: ToolKey; badges?: ("nasa" | "analysis" | "simulated" | "unavailable" | "demo" | "sample")[]; children: React.ReactNode }) {
  const { locale, t } = useI18n();
  const name = locale === "bn" ? district.name_bn : district.name_en;
  const div = locale === "bn" ? district.division_bn : district.division_en;
  const root = `/${locale}/area/${district.slug}/`;
  return (
    <div>
      <Link href={`/${locale}/`} className="text-sm text-ink-2 hover:text-ink">‹ {t("area.back")}</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="serif text-4xl tracking-tight sm:text-5xl">{name}</h1>
          <p className="mt-1 text-ink-2">{t("area.division", { name: div })}</p>
        </div>
        <div className="flex flex-wrap gap-2">{(badges ?? ["nasa"]).map((b) => <Badge key={b} kind={b} />)}</div>
      </div>
      <nav aria-label={t("area.explore")} className="-mx-1 mt-6 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <Link href={root} className="chip" aria-pressed={!active}>{name}</Link>
        {TOOLS.map((k) => (
          <Link key={k} href={`${root}${TOOL_PATH[k]}/`} className="chip whitespace-nowrap" aria-pressed={active === k}>{t(`tools.${k}.title`)}</Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
