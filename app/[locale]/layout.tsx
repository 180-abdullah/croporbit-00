import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import "@fontsource-variable/anek-bangla";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/noto-serif-bengali";
import { Footer, Header } from "@/components/Header";
import { LocaleProvider } from "@/components/LocaleProvider";
import { RegisterSW } from "@/components/RegisterSW";
import { ChatHelper } from "@/components/ChatHelper";
import { getStatus } from "@/lib/data";
import { isLocale, locales, getT } from "@/lib/i18n";

export const dynamicParams = false;
export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getT(locale);
  return { title: { default: `${t("app")} · ${t("tagline")}`, template: `%s · ${t("app")}` }, description: t("meta.description"), manifest: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/manifest.webmanifest`, icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icon.svg` } };
}
export const viewport: Viewport = { themeColor: "#f1f5f2", width: "device-width", initialScale: 1 };

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const status = await getStatus();
  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale}>
          <Header />
          <main className="mx-auto min-h-[70vh] max-w-6xl px-5 pt-8">{children}</main>
          <Footer dataThrough={status.data_through} built={status.built} />
          <RegisterSW />
          <ChatHelper />
        </LocaleProvider>
      </body>
    </html>
  );
}
