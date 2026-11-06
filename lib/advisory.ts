import type { Climate, CropKey } from "./types";
import { nf, type Locale } from "./i18n";

type T = (k: string, v?: Record<string, string | number>) => string;
export type Advice = { kind: "earlier" | "later" | "none" | "boro-warmer" | "boro-cooler" | "boro-none"; days: number; text: string; sms: string };

/** Day-of-year -> short date label in the reader's language (non-leap reference year). */
export function doyLabel(doy: number, locale: Locale): string {
  const d = new Date(Date.UTC(2025, 0, doy));
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

/** ASCII digits -> Bengali digits for the Bangla UI. */
export const digits = (locale: Locale, s: string) => (locale === "bn" ? s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]) : s);

export function composeAdvice(c: Climate, crop: CropKey, locale: Locale, t: T, districtName: string): Advice {
  const cropName = t(`crops.${crop}`);
  if (crop === "boro") {
    const tr = c.trends.boro_cold_nights;
    const x = tr.per_decade;
    if (x !== null && tr.p !== null && tr.p < 0.1) {
      const kind = x > 0 ? "boro-warmer" : "boro-cooler";
      return { kind, days: 0, text: t(`advice.${kind}`, { district: districtName, x: nf(locale, Math.abs(x), 2) }), sms: t("advice.sms.boro", { district: districtName }) };
    }
    return { kind: "boro-none", days: 0, text: t("advice.boro-none", { district: districtName }), sms: t("advice.sms.boro", { district: districtName }) };
  }
  const o = c.crops[crop].onset;
  const signal = t(`signal.${crop}`);
  if (o.significant && o.recommended_shift_days !== 0) {
    const n = Math.abs(o.recommended_shift_days);
    const kind = o.recommended_shift_days < 0 ? "earlier" : "later";
    const a = digits(locale, `${o.periods.a[0]}–${o.periods.a[1]}`);
    const p = { district: districtName, crop: cropName, signal, n: nf(locale, n), a };
    return { kind, days: o.recommended_shift_days, text: t(`advice.${kind}`, p), sms: t(`advice.sms.${kind}`, p) };
  }
  const p = { district: districtName, crop: cropName, signal, a: digits(locale, `${o.periods.a[0]}–${o.periods.a[1]}`) };
  return { kind: "none", days: 0, text: t("advice.none", p), sms: t("advice.sms.none", p) };
}
