"use client";
import { useEffect, useState } from "react";
import { digits } from "@/lib/advisory";
import { cellLatLon, liveUrl, parseLiveRain, type LiveRain } from "@/lib/live";
import type { Climate } from "@/lib/types";
import { useI18n } from "./LocaleProvider";

type State = { kind: "loading" } | { kind: "ok"; v: LiveRain } | { kind: "fail" };
const TTL_MS = 6 * 3600 * 1000; // reuse a recent answer so repeat visits do not hammer NASA's API

export function LiveRecent({ c }: { c: Climate }) {
  const { locale, t, n } = useI18n();
  const [s, setS] = useState<State>({ kind: "loading" });
  const cell = c.grid_cell;

  useEffect(() => {
    const ll = cellLatLon(cell);
    const key = `croporbit.live.${cell}`;
    let alive = true;
    const done = (st: State) => { if (alive) setS(st); };
    if (!ll) { done({ kind: "fail" }); return; }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const o = JSON.parse(raw) as { t: number; v: LiveRain };
        if (Date.now() - o.t < TTL_MS && o.v?.last) { done({ kind: "ok", v: o.v }); return; }
      }
    } catch { /* storage unavailable: fetch instead */ }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    (async () => {
      for (const lag of [0, 3]) { // if NASA rejects a very recent end date, retry a few days earlier
        try {
          const r = await fetch(liveUrl(ll.lat, ll.lon, new Date(), lag), { signal: ctl.signal });
          if (!r.ok) continue;
          const v = parseLiveRain(await r.json());
          if (!v) continue;
          try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v })); } catch { /* ignore */ }
          done({ kind: "ok", v });
          return;
        } catch { /* network or CORS failure: fall through to the saved data message */ }
      }
      done({ kind: "fail" });
    })();
    return () => { alive = false; clearTimeout(timer); ctl.abort(); };
  }, [cell]);

  const unit = t("env.unit.rain_total");
  return (
    <section className="panel mt-6 p-5 sm:p-6" aria-live="polite">
      <h2 className="text-lg font-semibold">{t("area.live.title")}</h2>
      {s.kind === "loading" && <p className="mt-2 text-sm text-ink-3">{t("area.live.loading")}</p>}
      {s.kind === "fail" && <p className="mt-2 text-sm text-ink-2">{t("area.live.fail", { d: digits(locale, c.recent.last_day) })}</p>}
      {s.kind === "ok" && (
        <>
          <p className="mt-1 text-sm text-ink-3">{t("area.live.sub", { d: digits(locale, s.v.last) })}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-2 px-4 py-3">
              <dt className="text-sm text-ink-2">{t("area.live.rain7")}</dt>
              <dd className="text-xl font-medium">{n(s.v.r7, 0)} {unit}</dd>
              <p className="text-sm text-ink-3">{t("area.live.normal", { x: `${n(c.recent.rain_7d_normal_mm, 0)} ${unit}` })}</p>
            </div>
            <div className="rounded-xl bg-surface-2 px-4 py-3">
              <dt className="text-sm text-ink-2">{t("area.live.rain30")}</dt>
              <dd className="text-xl font-medium">{n(s.v.r30, 0)} {unit}</dd>
              <p className="text-sm text-ink-3">{t("area.live.normal", { x: `${n(c.recent.rain_30d_normal_mm, 0)} ${unit}` })}</p>
            </div>
          </dl>
          <p className="mt-3 text-sm text-ink-3">{t("area.live.note")}</p>
        </>
      )}
    </section>
  );
}
