import { notFound } from "next/navigation";
import { WindowView } from "@/components/WindowView";
import { getIndex } from "@/lib/data";
import { isLocale } from "@/lib/i18n";
import { areaParams, loadArea } from "@/lib/params";

export const dynamicParams = false;
export const generateStaticParams = areaParams;
export const metadata = { title: "Planting window" };

export default async function Page({ params }: { params: Promise<{ locale: string; district: string }> }) {
  const { locale, district } = await params;
  const a = isLocale(locale) ? await loadArea(district) : null;
  if (!a) notFound();
  const idx = await getIndex();
  const flagged = { aman: idx.filter((r) => r.aman_shift !== 0).length, aus: idx.filter((r) => r.aus_shift !== 0).length };
  return <WindowView district={a.district} climate={a.climate} flagged={flagged} />;
}
