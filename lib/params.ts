import { getDistricts } from "./data";
import { locales } from "./i18n";
export async function areaParams() {
  const ds = await getDistricts();
  return locales.flatMap((locale) => ds.map((d) => ({ locale, district: d.slug })));
}
export async function loadArea(slug: string) {
  const { getClimate } = await import("./data");
  const ds = await getDistricts();
  const district = ds.find((d) => d.slug === slug);
  if (!district) return null;
  return { district, climate: await getClimate(slug) };
}
