import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DistrictPicker } from "@/components/DistrictPicker";
import { Globe } from "@/components/Globe";
import { digits } from "@/lib/advisory";
import { getDistricts, getDivisions, getStatus } from "@/lib/data";
import { dlabel, getT, isLocale } from "@/lib/i18n";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const [districts, divisions, st] = await Promise.all([getDistricts(), getDivisions(), getStatus()]);
  return (
    <div>
      <section className="max-w-3xl">
        <div className="mb-4 flex flex-wrap gap-2"><Badge kind="demo" /><Badge kind="nasa" /></div>
        <h1 className="serif text-4xl leading-[1.15] tracking-tight sm:text-5xl">{t("home.title")}</h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-2">{t("home.lead")}</p>
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="h-[26rem] lg:h-[34rem]"><Globe districts={districts} divisionIds={divisions.map((d) => d.id)} /></div>
        <div className="panel p-5 sm:p-6"><DistrictPicker districts={districts} divisions={divisions} /></div>
      </section>
      <p className="mt-6 text-sm text-ink-3">{t("home.dataline", { to: dlabel(locale, st.data_through), cells: digits(locale, String(st.cells)), districts: digits(locale, String(st.districts)) })}</p>
    </div>
  );
}
