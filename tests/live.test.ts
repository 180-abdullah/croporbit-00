import { describe, expect, it } from "vitest";
import { cellLatLon, liveUrl, parseLiveRain, ymd } from "../lib/live";

const payload = (rain: Record<string, number>) => ({ header: { fill_value: -999 }, properties: { parameter: { PRECTOTCORR: rain } } });
const days = (n: number, f: (i: number) => number, from = Date.UTC(2026, 9, 1)) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [ymd(new Date(from + i * 86400000)), f(i)]));

describe("live NASA rain parsing", () => {
  it("sums the newest 7 and 30 real days", () => {
    const v = parseLiveRain(payload(days(35, () => 2)));
    expect(v).toEqual({ last: "2026-11-04", r7: 14, r30: 60 });
  });
  it("never counts the -999 fill value as rain, and ends at the newest real day", () => {
    const rain = days(40, (i) => (i >= 36 ? -999 : 1));
    const v = parseLiveRain(payload(rain));
    expect(v?.last).toBe("2026-11-05");
    expect(v?.r7).toBe(7);
    expect(v?.r30).toBe(30);
  });
  it("returns null when there are fewer than 30 real days or the shape is wrong", () => {
    expect(parseLiveRain(payload(days(20, () => 1)))).toBeNull();
    expect(parseLiveRain({})).toBeNull();
    expect(parseLiveRain(null)).toBeNull();
  });
});

describe("live URL and cell parsing", () => {
  it("reads the grid-cell id written by the fetch script", () => {
    expect(cellLatLon("+24.500_+088.750")).toEqual({ lat: 24.5, lon: 88.75 });
    expect(cellLatLon("bad")).toBeNull();
  });
  it("asks the POWER daily point API without any key", () => {
    const u = liveUrl(24.5, 88.75, new Date(Date.UTC(2026, 10, 5)), 0, 40);
    expect(u).toContain("https://power.larc.nasa.gov/api/temporal/daily/point?");
    expect(u).toContain("start=20260926");
    expect(u).toContain("end=20261105");
    expect(u).not.toMatch(/key|token/i);
  });
});
