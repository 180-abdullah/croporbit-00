import bn from "@/i18n/bn.json";
import en from "@/i18n/en.json";

export const locales = ["bn", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const dicts = { bn, en } as const;
export type Dict = typeof bn;

export function isLocale(x: string): x is Locale {
  return (locales as readonly string[]).includes(x);
}

/** Look up "a.b.c" in a dictionary; {name} placeholders are filled from vars. Missing keys show the key (never blank). */
export function tr(d: unknown, key: string, vars?: Record<string, string | number>): string {
  let cur: unknown = d;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as object)) cur = (cur as Record<string, unknown>)[part];
    else return key;
  }
  if (typeof cur !== "string") return key;
  return vars ? cur.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : cur;
}

export function getT(locale: Locale) {
  const d = dicts[locale];
  return (key: string, vars?: Record<string, string | number>) => tr(d, key, vars);
}

/** Long date such as "1 November 2026" (Bengali digits and month names for bn). Accepts YYYY-MM-DD or a full ISO time. */
export function dlabel(locale: Locale, iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

/** Number formatting; Bangla locale uses Bengali digits. */
export function nf(locale: Locale, n: number, digits = 0): string {
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}
