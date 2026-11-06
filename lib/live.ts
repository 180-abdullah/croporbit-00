// Live "latest days" lookup straight from NASA POWER (no API key needed), used by the district page.
// Pure helpers live here so they can be tested without a browser or network.

export type LiveRain = { last: string; r7: number; r30: number };

const API = "https://power.larc.nasa.gov/api/temporal/daily/point";

/** Grid-cell id such as "+24.500_+088.750" (written by scripts/data/fetch_power.py) to coordinates. */
export function cellLatLon(cell: string): { lat: number; lon: number } | null {
  const m = /^([+-]\d+\.\d+)_([+-]\d+\.\d+)$/.exec(cell);
  return m ? { lat: Number(m[1]), lon: Number(m[2]) } : null;
}

export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
}

export function liveUrl(lat: number, lon: number, today: Date, lagDays = 0, spanDays = 40): string {
  const end = new Date(today.getTime() - lagDays * 86400000);
  const start = new Date(end.getTime() - spanDays * 86400000);
  const q = new URLSearchParams({ parameters: "PRECTOTCORR", community: "ag", longitude: String(lon), latitude: String(lat), start: ymd(start), end: ymd(end), format: "json" });
  return `${API}?${q.toString()}`;
}

/** Rain totals from a POWER response. The fill value (-999) means "no data" and is never counted as zero. */
export function parseLiveRain(json: unknown): LiveRain | null {
  const o = json as { properties?: { parameter?: { PRECTOTCORR?: Record<string, number> } }; header?: { fill_value?: number } } | null;
  const p = o?.properties?.parameter?.PRECTOTCORR;
  if (!p) return null;
  const fill = o?.header?.fill_value ?? -999;
  const days = Object.keys(p)
    .sort()
    .filter((k) => typeof p[k] === "number" && p[k] !== fill && p[k] >= 0)
    .map((k) => ({ d: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`, rain: p[k] }));
  if (days.length < 30) return null; // not enough real days to give a 30-day total
  const sum = (n: number) => Math.round(days.slice(-n).reduce((a, x) => a + x.rain, 0) * 10) / 10;
  return { last: days[days.length - 1].d, r7: sum(7), r30: sum(30) };
}
