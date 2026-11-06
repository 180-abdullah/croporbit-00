"use client";
import { createContext, useContext, useMemo } from "react";
import { dicts, nf as nfmt, tr, type Locale } from "@/lib/i18n";

type Ctx = { locale: Locale; t: (k: string, v?: Record<string, string | number>) => string; n: (x: number, digits?: number) => string };
const C = createContext<Ctx | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<Ctx>(
    () => ({ locale, t: (k, v) => tr(dicts[locale], k, v), n: (x, d = 0) => nfmt(locale, x, d) }),
    [locale],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useI18n() {
  const v = useContext(C);
  if (!v) throw new Error("useI18n outside LocaleProvider");
  return v;
}
