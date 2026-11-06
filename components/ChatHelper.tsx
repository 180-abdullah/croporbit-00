"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { composeAdvice } from "@/lib/advisory";
import { base } from "@/lib/base";
import { FAQ, matchFaq, type Faq } from "@/lib/faq";
import type { Climate, District } from "@/lib/types";
import { useI18n } from "./LocaleProvider";

type Msg = { from: "me" | "bot"; text: string; faqs?: Faq[] };

export function ChatHelper() {
  const { locale, t, n } = useI18n();
  const path = usePathname() || "";
  const slug = path.match(/\/area\/([^/]+)/)?.[1];
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<District | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug || !open) return;
    let dead = false;
    fetch(`${base}/data/districts.json`).then((r) => r.json()).then((ds: District[]) => { if (!dead) setDistrict(ds.find((d) => d.slug === slug) ?? null); }).catch(() => {});
    return () => { dead = true; };
  }, [slug, open]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  const name = district ? (locale === "bn" ? district.name_bn : district.name_en) : "";
  const say = (me: string, bot: Msg) => setMsgs((m) => [...m, { from: "me", text: me }, bot]);
  const answer = (f: Faq) => say(f.q[locale], { from: "bot", text: f.a[locale], faqs: FAQ.filter((x) => x.crop.en === f.crop.en && x.id !== f.id).slice(0, 2) });
  const ask = () => {
    const text = q.trim();
    if (!text) return;
    setQ("");
    const hits = matchFaq(text);
    if (hits.length) say(text, { from: "bot", text: hits[0].a[locale], faqs: hits.slice(1) });
    else say(text, { from: "bot", text: t("chat.none"), faqs: FAQ.slice(0, 4) });
  };
  const districtSummary = async () => {
    if (!district) return;
    try {
      const c: Climate = await (await fetch(`${base}/data/climate/${district.slug}.json`)).json();
      const lines = (["aman", "aus", "boro"] as const).map((k) => `${t(`crops.${k}`)}: ${composeAdvice(c, k, locale, t, name).text}`);
      lines.push(t("chat.rainLine", { a: n(c.recent.rain_30d_mm), b: n(c.recent.rain_30d_normal_mm) }));
      say(t("chat.district", { district: name }), { from: "bot", text: lines.join("\n\n") });
    } catch { /* offline and not cached */ }
  };

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="farm-chat"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-green px-4 py-3 font-medium text-white shadow-lg shadow-green/25 hover:bg-green-deep">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M4 5h16v11H9l-5 4z" strokeLinejoin="round" /></svg>
        <span className="hidden sm:inline">{open ? t("chat.close") : t("chat.open")}</span>
      </button>
      {open && (
        <section id="farm-chat" aria-label={t("chat.title")} className="fixed bottom-20 right-3 z-40 flex max-h-[min(75vh,640px)] w-[min(94vw,420px)] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
          <header className="border-b border-line bg-green-soft px-5 py-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-green-deep">{t("chat.title")}</h2>
              <button onClick={() => setOpen(false)} className="rounded-full px-2 text-ink-2 hover:bg-surface" aria-label={t("chat.close")}>✕</button>
            </div>
            <p className="text-xs text-ink-2">{t("chat.sub")}</p>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {district && (
              <button onClick={districtSummary} className="w-full rounded-2xl border border-[#cfe0f0] bg-[#eaf3fa] px-3.5 py-2.5 text-left text-sm text-[#255a7a] hover:bg-[#dcebf6]">{t("chat.district", { district: name })}</button>
            )}
            {msgs.length === 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink-2">{t("chat.suggest")}</p>
                <ul className="space-y-1.5">
                  {FAQ.map((f) => (
                    <li key={f.id}>
                      <button onClick={() => answer(f)} className="w-full rounded-xl bg-surface-2 px-3 py-2 text-left text-sm hover:bg-green-soft">
                        <span className="block text-xs text-green-deep">{f.crop[locale]}</span>{f.q[locale]}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.from === "me" ? "flex justify-end" : ""}>
                <div className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.from === "me" ? "bg-green text-white" : "bg-surface-2"}`}>
                  {m.text}
                  {m.from === "bot" && <p className="mt-2 border-t border-line pt-2 text-xs text-ink-3">{t("chat.disclaimer")}</p>}
                </div>
                {m.faqs && m.faqs.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.faqs.map((f) => <button key={f.id} onClick={() => answer(f)} className="chip text-left text-xs">{f.q[locale]}</button>)}
                  </div>
                )}
              </div>
            ))}
            {msgs.length > 0 && <button onClick={() => setMsgs([])} className="text-xs text-green-deep underline">{t("chat.suggest")}</button>}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="flex gap-2 border-t border-line p-3">
            <label htmlFor="chat-q" className="sr-only">{t("chat.placeholder")}</label>
            <input id="chat-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("chat.placeholder")} className="field py-2" autoComplete="off" />
            <button className="btn shrink-0">{t("chat.send")}</button>
          </form>
        </section>
      )}
    </>
  );
}
