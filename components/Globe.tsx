"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { base } from "@/lib/base";
import { useI18n } from "./LocaleProvider";
import type { District } from "@/lib/types";

declare global { interface Window { Cesium?: any; CESIUM_BASE_URL?: string } }

const PALETTE = ["#6fa35b", "#3b7da6", "#d68a3c", "#a4714f", "#6c6a9b", "#2e8f78", "#c0877a", "#7fa8a0"];
let loading: Promise<any> | null = null;

function loadCesium(): Promise<any> {
  if (window.Cesium) return Promise.resolve(window.Cesium);
  if (loading) return loading;
  window.CESIUM_BASE_URL = `${base}/cesium/`;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = `${base}/cesium/Widgets/widgets.css`;
  document.head.appendChild(css);
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${base}/cesium/Cesium.js`;
    s.async = true;
    s.onload = () => resolve(window.Cesium);
    s.onerror = () => { loading = null; reject(new Error("cesium")); };
    document.head.appendChild(s);
  });
  return loading;
}

export function Globe({ districts, divisionIds }: { districts: District[]; divisionIds: string[] }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const satRef = useRef<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "fail">("loading");
  const [hover, setHover] = useState<string | null>(null);
  const [sat, setSat] = useState(false);

  useEffect(() => {
    let dead = false;
    let viewer: any;
    (async () => {
      try {
        const C = await loadCesium();
        if (dead || !box.current) return;
        const imagery = await C.TileMapServiceImageryProvider.fromUrl(C.buildModuleUrl("Assets/Textures/NaturalEarthII"));
        viewer = new C.Viewer(box.current, {
          baseLayer: new C.ImageryLayer(imagery),
          baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false,
          animation: false, timeline: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
          requestRenderMode: true, maximumRenderTimeChange: Infinity,
        });
        viewerRef.current = viewer;
        const sc = viewer.scene;
        sc.globe.baseColor = C.Color.fromCssColorString("#0f2a2e");
        sc.backgroundColor = C.Color.fromCssColorString("#0a1d20");
        sc.globe.showGroundAtmosphere = true;
        sc.skyAtmosphere.show = true;
        const ds = await C.GeoJsonDataSource.load(`${base}/data/districts.geojson`, { stroke: C.Color.fromCssColorString("#e9f3ee").withAlpha(0.55), strokeWidth: 1, fill: C.Color.WHITE.withAlpha(0.3) });
        if (dead) return;
        for (const e of ds.entities.values) {
          const props = e.properties?.getValue?.(C.JulianDate.now()) ?? {};
          const idx = Math.max(0, divisionIds.indexOf(String(props.division_id)));
          (e as any)._base = C.Color.fromCssColorString(PALETTE[idx % PALETTE.length]).withAlpha(0.42);
          e.polygon.material = (e as any)._base;
          e.polygon.outline = false;
        }
        viewer.dataSources.add(ds);
        // single orchestrated moment: fly in from orbit
        viewer.camera.setView({ destination: C.Cartesian3.fromDegrees(90.3, 18, 9_500_000) });
        viewer.camera.flyTo({ destination: C.Rectangle.fromDegrees(87.6, 20.2, 93.2, 27.0), duration: 3.2, easingFunction: C.EasingFunction.CUBIC_IN_OUT });

        let last: any = null;
        const paint = (e: any, hot: boolean) => { if (!e) return; e.polygon.material = hot ? C.Color.fromCssColorString("#fafcfa").withAlpha(0.7) : e._base; };
        const pick = (pos: any) => { const p = sc.pick(pos); return p && p.id && p.id._base ? p.id : null; };
        const h = new C.ScreenSpaceEventHandler(sc.canvas);
        h.setInputAction((m: any) => {
          const e = pick(m.endPosition);
          if (e === last) return;
          paint(last, false); paint(e, true); last = e;
          const slug = e?.properties?.slug?.getValue?.(C.JulianDate.now());
          setHover(slug ?? null);
          sc.canvas.style.cursor = e ? "pointer" : "grab";
          sc.requestRender();
        }, C.ScreenSpaceEventType.MOUSE_MOVE);
        h.setInputAction((m: any) => {
          const e = pick(m.position);
          const slug = e?.properties?.slug?.getValue?.(C.JulianDate.now());
          if (slug) router.push(`/${locale}/area/${slug}/`);
        }, C.ScreenSpaceEventType.LEFT_CLICK);
        sc.requestRender();
        setState("ready");
        if (navigator.onLine) setSat(true);
      } catch {
        if (!dead) setState("fail");
      }
    })();
    return () => { dead = true; try { viewer?.destroy(); } catch { /* ignore */ } viewerRef.current = null; };
  }, [divisionIds, locale, router]);

  useEffect(() => {
    const v = viewerRef.current, C = window.Cesium;
    if (!v || !C || state !== "ready") return;
    if (sat && !satRef.current) {
      const p = new C.WebMapServiceImageryProvider({
        url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
        layers: "BlueMarble_ShadedRelief_Bathymetry",
        parameters: { format: "image/jpeg", transparent: false, styles: "" },
        tilingScheme: new C.GeographicTilingScheme(), tileWidth: 512, tileHeight: 512, maximumLevel: 9,
        enablePickFeatures: false, credit: "NASA GIBS / EOSDIS",
      });
      satRef.current = v.imageryLayers.addImageryProvider(p, 1);
    }
    if (satRef.current) satRef.current.show = sat;
    v.scene.requestRender();
  }, [sat, state]);

  const h = hover ? districts.find((d) => d.slug === hover) : null;
  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-[1.75rem] bg-orbit">
      <div ref={box} className="absolute inset-0" role="img" aria-label={t("home.globeHint")} />
      {state !== "ready" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-mint">
          {state === "loading" ? t("home.globeLoading") : t("home.globeFail")}
        </div>
      )}
      {state === "ready" && (
        <>
          <p className="pointer-events-none absolute left-4 top-4 max-w-[70%] rounded-full bg-orbit/70 px-3 py-1.5 text-xs text-mint backdrop-blur">
            {h ? (locale === "bn" ? h.name_bn : h.name_en) : t("home.globeHint")}
          </p>
          <label className="absolute bottom-10 left-4 flex max-w-[85%] cursor-pointer items-start gap-2 rounded-2xl bg-orbit/75 px-3 py-2 text-xs text-mint backdrop-blur">
            <input type="checkbox" className="mt-0.5 accent-[#8fd6b5]" checked={sat} onChange={(e) => setSat(e.target.checked)} />
            <span>{t("home.satellite")}<br /><span className="opacity-70">{t("home.satelliteHint")}</span></span>
          </label>
        </>
      )}
    </div>
  );
}
