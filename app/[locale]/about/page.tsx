import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { digits } from "@/lib/advisory";
import { getQuality, getStatus } from "@/lib/data";
import { dlabel, getT, isLocale, nf } from "@/lib/i18n";

export const metadata = { title: "Method and data" };

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const [q, st] = await Promise.all([getQuality(), getStatus()]);
  const dg = (y: number) => digits(locale, String(y));
  const vars = {
    to: dlabel(locale, st.data_through),
    a1: dg(st.period_a[0]), a2: dg(st.period_a[1]), b1: dg(st.period_b[0]), b2: dg(st.period_b[1]),
    la1: dg(st.long_a[0]), la2: dg(st.long_a[1]), lb1: dg(st.long_b[0]), lb2: dg(st.long_b[1]),
    r1: nf(locale, q.changes.rain_ratio_97, 1), r2: nf(locale, q.changes.rain_ratio_16, 1), t1: nf(locale, Math.abs(q.changes.dT_97), 1) };
  const sec = (h: string, keys: string[], v: Record<string, string> = vars) => (
    <section key={h} className="mt-8">
      <h2 className="text-xl font-semibold">{t(h)}</h2>
      <ul className="mt-3 space-y-3 text-ink-2">{keys.map((k) => <li key={k} className="max-w-3xl leading-relaxed">{t(k, v)}</li>)}</ul>
    </section>
  );
  return (
    <article>
      <div className="mb-3 flex gap-2"><Badge kind="demo" /></div>
      <h1 className="serif text-4xl tracking-tight">{t("about.title")}</h1>
      <p className="mt-4 max-w-3xl text-lg text-ink-2">{t("about.lead")}</p>
      {sec("about.data", ["about.d1", "about.d2", "about.d3", "about.d4"])}
      {sec("about.method", ["about.m1", "about.m2", "about.m3"])}
      {sec("about.limits", ["about.l1", "about.l2", "about.l3", "about.l4"], vars)}
      {sec("about.open", ["about.o1"])}
    </article>
  );
}
