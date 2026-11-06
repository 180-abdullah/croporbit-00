"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { dlabel } from "@/lib/i18n";
import { useI18n } from "./LocaleProvider";

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="6" fill="#2e6f57" />
      <ellipse cx="16" cy="16" rx="14" ry="6" fill="none" stroke="#2e6f57" strokeWidth="1.6" transform="rotate(-24 16 16)" />
      <circle cx="27" cy="10.5" r="2.1" fill="#d68a3c" />
    </svg>
  );
}

export function Header() {
  const { locale, t } = useI18n();
  const path = usePathname() || `/${locale}/`;
  const other = locale === "bn" ? "en" : "bn";
  const swapped = path.replace(new RegExp(`^(/[^/]+)?/${locale}(?=/|$)`), (m) => m.replace(`/${locale}`, `/${other}`));
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href={`/${locale}/`} className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <Mark />
          {t("app")}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href={`/${locale}/about/`} className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-surface-2">{t("nav.about")}</Link>
          <Link href={swapped} hrefLang={other} onClick={() => { try { localStorage.setItem("croporbit.lang", other); } catch {} }} className="rounded-full border border-line bg-surface px-3 py-1.5 font-medium hover:bg-surface-2">{t("lang.switch")}</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer({ dataThrough, built }: { dataThrough: string; built: string }) {
  const { locale, t } = useI18n();
  return (
    <footer className="mt-20 border-t border-line/70">
      <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-ink-2">
        <p className="max-w-3xl">{t("footer.note")}</p>
        <p className="mt-2 max-w-3xl text-ink-3">{t("footer.data", { to: dlabel(locale, dataThrough), built: dlabel(locale, built) })}</p>
      </div>
    </footer>
  );
}
