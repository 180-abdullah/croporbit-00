import { notFound } from "next/navigation";
import { FieldView } from "@/components/FieldView";
import { isLocale } from "@/lib/i18n";
import { areaParams, loadArea } from "@/lib/params";

export const dynamicParams = false;
export const generateStaticParams = areaParams;

export default async function Page({ params }: { params: Promise<{ locale: string; district: string }> }) {
  const { locale, district } = await params;
  const a = isLocale(locale) ? await loadArea(district) : null;
  if (!a) notFound();
  return <FieldView district={a.district} climate={a.climate} />;
}
