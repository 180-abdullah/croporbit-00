"use client";
import Link from "next/link";
import type { Climate, District } from "@/lib/types";
import { AreaShell } from "./AreaShell";
import { useI18n } from "./LocaleProvider";
import { YearChart } from "./YearChart";

export function UnavailableView({ district, climate: c, kind }: { district: District; climate: Climate; kind: "hist" | "forecast" }) {
  const { locale, t } = useI18n();
  return (
    <AreaShell district={district} active={kind} badges={["unavailable"]}>
      <h2 className="text-2xl font-semibold tracking-tight">{t(`tools.${kind}.title`)}</h2>
      <section className="panel mt-5 p-6 sm:p-8">
        <p className="text-sm font-medium text-ink-2">{t("unavail.title")}</p>
        <p className="mt-2 max-w-3xl text-lg">{t(`unavail.${kind}`)}</p>
        <p className="mt-4 max-w-3xl text-ink-2">{t("unavail.next")}</p>
        <Link href={`/${locale}/area/${district.slug}/planting-window/`} className="btn mt-5">{t("unavail.go")}</Link>
      </section>
      {kind === "hist" && (
        <section className="panel mt-6 p-5 sm:p-6">
          <h3 className="font-semibold">{t("unavail.gddTitle")}</h3>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            {(["aus", "aman", "boro"] as const).map((k) => (
              <div key={k}>
                <p className="text-sm font-medium">{t(`crops.${k}`)} <span className="text-ink-3">{t(`crops.season.${k}`)}</span></p>
                <YearChart years={c.years} values={c.crops[k].gdd.values} unit="°C·d" from={c.homogeneous_from} digits={0} color="#d68a3c" height={170} />
              </div>
            ))}
          </div>
        </section>
      )}
    </AreaShell>
  );
}
