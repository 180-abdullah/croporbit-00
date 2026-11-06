import { notFound } from "next/navigation";
import { AreaView } from "@/components/AreaView";
import { isLocale } from "@/lib/i18n";
import { areaParams, loadArea } from "@/lib/params";

export const dynamicParams = false;
export const generateStaticParams = areaParams;

export async function generateMetadata({ params }: { params: Promise<{ district: string }> }) {
  const a = await loadArea((await params).district);
  return { title: a ? `${a.district.name_en} · ${a.district.name_bn}` : "" };
}

export default async function Page({ params }: { params: Promise<{ locale: string; district: string }> }) {
  const { locale, district } = await params;
  const a = isLocale(locale) ? await loadArea(district) : null;
  if (!a) notFound();
  return <AreaView district={a.district} climate={a.climate} />;
}
