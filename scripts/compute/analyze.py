"""Turn cached NASA POWER daily files into per-district climate-shift JSON for the CropOrbit website.

Usage: python3 -I scripts/compute/analyze.py <districts.json> <district-cells.json> <raw_power_dir> <out_climate_dir> <metadata_dir>

Data-quality finding (measured across all 42 grid cells, see data/metadata/data-quality.json):
  NASA POWER's MERRA-2 record has step changes: rainfall x2.0 around 1997/98 and x1.6 around 2016, with a ~1 C
  temperature drop and +11 points humidity at 1997/98. Absolute rainfall, soil wetness, humidity, solar and wind
  are therefore NOT trended. Temperature measures are analysed from 1998 only. Rain timing uses a scale-free
  measure (cumulative-fraction day) whose median is steady across the breaks (day 125 / 128 / 128).

Definitions (all stated on screen in the app; illustrative, to be confirmed with a local agriculture officer):
  Aus   rain-season start: day on which 10% of the 1 Mar-30 Sep rainfall has fallen (sensitivity 7% / 13%).
  Aman  monsoon establishment: day on which 40% of the 1 Mar-30 Sep rainfall has fallen (sensitivity 35% / 45%).
  Boro  winter cold nights (mean T2M_MIN, Dec-Feb) and growing-degree trend only; no rain-timing advice.
  Heat day: T2M_MAX >= 35 C.  GDD base 10 C.
  Main comparison: the latest 14 complete years against the 14 years before them (L = last complete year, so
  1998-2011 vs 2012-2025 while L = 2025, and 1999-2012 vs 2013-2026 once 2026 is complete). Direction must also hold
  in the long record 1981-2003 vs 2004-L. The current, incomplete year never enters yearly statistics.
  Windows move forward automatically each year as the daily refresh brings in new data.
"""

from __future__ import annotations

import datetime as dt
import gzip
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from agro import compare_periods, count_days, growing_degree_days, trend  # noqa: E402

FIRST_YEAR = 1981
WINDOW_YEARS = 14
LONG_A = (1981, 2003)
HOMOGENEOUS_FROM = 1998
# The values below depend on the last complete year and are set by configure() before any analysis runs.
LAST_YEAR = 2025
YEARS = list(range(FIRST_YEAR, LAST_YEAR + 1))
PERIOD_A = (LAST_YEAR - 2 * WINDOW_YEARS + 1, LAST_YEAR - WINDOW_YEARS)
PERIOD_B = (LAST_YEAR - WINDOW_YEARS + 1, LAST_YEAR)
LONG_B = (2004, LAST_YEAR)


def configure(last_year: int) -> None:
    """Move every analysis window so that it ends at the last complete year."""
    global LAST_YEAR, YEARS, PERIOD_A, PERIOD_B, LONG_B
    if last_year - 2 * WINDOW_YEARS + 1 < HOMOGENEOUS_FROM:
        raise ValueError(f"last complete year {last_year} is too early for two {WINDOW_YEARS}-year windows from {HOMOGENEOUS_FROM}")
    LAST_YEAR = last_year
    YEARS = list(range(FIRST_YEAR, last_year + 1))
    PERIOD_A = (last_year - 2 * WINDOW_YEARS + 1, last_year - WINDOW_YEARS)
    PERIOD_B = (last_year - WINDOW_YEARS + 1, last_year)
    LONG_B = (2004, last_year)


def last_complete_year(df: pd.DataFrame) -> int:
    """Latest year for which rain and temperature exist through 31 December."""
    ok = df[df["PRECTOTCORR"].notna() & df["T2M"].notna()]
    last = ok.index[-1]
    return last.year if last >= pd.Timestamp(last.year, 12, 31) else last.year - 1
BREAKS = [1998, 2016]
SIGNIFICANCE = 0.10
HEAT_C = 35.0
GDD_BASE = 10.0

ONSET = {
    "aus": dict(fraction=0.10, delta=0.03),
    "aman": dict(fraction=0.40, delta=0.05),
}
SEASON_START, SEASON_END = (3, 1), (9, 30)
TRENDED = {"t_mean", "t_max", "hot_days", "boro_cold_nights"}  # amounts of the others change at the 1997/98 and 2016 breaks
GDD_WINDOWS = {"aus": ((3, 15), (7, 15)), "aman": ((7, 1), (11, 30)), "boro": ((1, 1), (5, 15))}


def load_cell(path: Path) -> tuple[pd.DataFrame, dict]:
    obj = json.loads(gzip.open(path, "rt", encoding="utf-8").read())
    par = obj["properties"]["parameter"]
    df = pd.DataFrame({k: pd.Series(v) for k, v in par.items()})
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    df = df.sort_index().replace(-999.0, np.nan)  # fill value is MISSING, never zero
    return df, obj["header"]


def r2(x, nd=2):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), nd)


def doy(d: dt.date) -> int:
    return d.timetuple().tm_yday


def onset_series(df: pd.DataFrame, fraction: float) -> list:
    from agro import cumulative_fraction_day

    out = []
    for y in YEARS:
        rain = df.loc[str(y), "PRECTOTCORR"].to_numpy()
        s = doy(dt.date(y, *SEASON_START)) - 1
        e = doy(dt.date(y, *SEASON_END))
        i = cumulative_fraction_day(rain, s, e, fraction)
        out.append(None if i is None else i + 1)
    return out


def split(years, values, a=None, b=None):
    a = a or PERIOD_A
    b = b or PERIOD_B
    xa = [v for y, v in zip(years, values) if a[0] <= y <= a[1] and v is not None]
    xb = [v for y, v in zip(years, values) if b[0] <= y <= b[1] and v is not None]
    return xa, xb


def trend_since(values, start=HOMOGENEOUS_FROM):
    ys = [y for y in YEARS if y >= start]
    vs = [np.nan if v is None else v for y, v in zip(YEARS, values) if y >= start]
    return trend(ys, vs)


def fmt_cmp(c: dict) -> dict:
    return {k: (v if k in ("n_a", "n_b") else r2(v, 3 if k == "p" else 1)) for k, v in c.items()}


def crop_onset(df: pd.DataFrame, key: str) -> dict:
    cfg = ONSET[key]
    f = cfg["fraction"]
    series = onset_series(df, f)
    main_ = compare_periods(*split(YEARS, series))
    long_ = compare_periods(*split(YEARS, series, LONG_A, LONG_B))
    tr = trend_since(series)
    sens = {}
    for lbl, ff in (("lower", f - cfg["delta"]), ("upper", f + cfg["delta"])):
        c2 = compare_periods(*split(YEARS, onset_series(df, ff)))
        sens[lbl] = {"fraction": round(ff, 2), "shift_days": r2(c2["shift"], 1), "p": r2(c2["p"], 3)}
    shifts = [main_["shift"], sens["lower"]["shift_days"], sens["upper"]["shift_days"], long_["shift"]]
    consistent = all(x is not None for x in shifts) and (all(x > 0 for x in shifts) or all(x < 0 for x in shifts))
    significant = bool(main_["p"] is not None and main_["p"] < SIGNIFICANCE and consistent and abs(main_["shift"]) >= 2)
    return {
        "kind": "rain_timing",
        "definition": {
            "fraction": f,
            "season": f"{SEASON_START[0]:02d}-{SEASON_START[1]:02d} to {SEASON_END[0]:02d}-{SEASON_END[1]:02d}",
        },
        "onset_doy": series,
        "periods": {"a": list(PERIOD_A), "b": list(PERIOD_B), "long_a": list(LONG_A), "long_b": list(LONG_B)},
        "compare": fmt_cmp(main_),
        "long_record": fmt_cmp(long_),
        "trend_days_per_decade": r2(None if tr["slope_per_year"] is None else tr["slope_per_year"] * 10, 1),
        "trend_p": r2(tr["p"], 3),
        "sensitivity": sens,
        "direction_consistent": consistent,
        "significant": significant,
        "recommended_shift_days": int(round(main_["shift"])) if significant else 0,
        "years_without_event": [y for y, v in zip(YEARS, series) if v is None],
    }


def season_slice(df: pd.DataFrame, y: int, start, end, col: str):
    s = pd.Timestamp(y, *start)
    e = pd.Timestamp(y, *end)
    return df.loc[s:e, col].to_numpy()


def gdd_block(df: pd.DataFrame, crop: str) -> dict:
    (sm, sd), (em, ed) = GDD_WINDOWS[crop][0], GDD_WINDOWS[crop][1]
    vals = [growing_degree_days(season_slice(df, y, (sm, sd), (em, ed), "T2M"), GDD_BASE) for y in YEARS]
    cmp_ = compare_periods(*split(YEARS, vals))
    tr = trend_since(vals)
    return {
        "window": f"{sm:02d}-{sd:02d} to {em:02d}-{ed:02d}",
        "base_c": GDD_BASE,
        "values": [r2(v, 0) for v in vals],
        "compare": fmt_cmp(cmp_),
        "trend_per_decade": r2(None if tr["slope_per_year"] is None else tr["slope_per_year"] * 10, 1),
        "trend_p": r2(tr["p"], 3),
        "periods": [list(PERIOD_A), list(PERIOD_B)],
    }


def yearly(df: pd.DataFrame) -> dict[str, list]:
    s: dict[str, list] = {k: [] for k in ("rain_total", "rain_monsoon", "t_mean", "t_max", "hot_days", "soil_root", "solar", "humidity", "wind", "boro_cold_nights")}
    for y in YEARS:
        d = df.loc[str(y)]
        s["rain_total"].append(r2(d["PRECTOTCORR"].sum(min_count=300), 0))
        s["rain_monsoon"].append(r2(d.loc[f"{y}-06-01":f"{y}-09-30", "PRECTOTCORR"].sum(min_count=100), 0))
        s["t_mean"].append(r2(d["T2M"].mean(), 2))
        s["t_max"].append(r2(d["T2M_MAX"].mean(), 2))
        s["hot_days"].append(count_days(d["T2M_MAX"].to_numpy(), HEAT_C))
        s["soil_root"].append(r2(d["GWETROOT"].mean(), 3))
        s["solar"].append(r2(d["ALLSKY_SFC_SW_DWN"].mean(), 2))
        s["humidity"].append(r2(d["RH2M"].mean(), 1))
        s["wind"].append(r2(d["WS2M"].mean(), 2))
        prev = df.loc[f"{y-1}-12-01":f"{y}-02-28", "T2M_MIN"] if y > 1981 else None
        s["boro_cold_nights"].append(None if prev is None else r2(prev.mean(), 2))
    return s


def monthly(df: pd.DataFrame) -> dict[str, list]:
    d = df.loc[str(HOMOGENEOUS_FROM) : str(LAST_YEAR)]  # temperature climatology: homogeneous years
    r = df.loc[str(LAST_YEAR - 9) : str(LAST_YEAR)]  # rain and soil: latest 10 complete years (amounts differ between eras)
    rain_m = r["PRECTOTCORR"].groupby([r.index.year, r.index.month]).sum(min_count=20).groupby(level=1).mean()
    return {
        "rain": [r2(rain_m.get(m), 0) for m in range(1, 13)],
        "t_mean": [r2(d["T2M"][d.index.month == m].mean(), 1) for m in range(1, 13)],
        "t_max": [r2(d["T2M_MAX"][d.index.month == m].mean(), 1) for m in range(1, 13)],
        "soil_root": [r2(r["GWETROOT"][r.index.month == m].mean(), 2) for m in range(1, 13)],
        "basis": {"rain_soil": f"{LAST_YEAR - 9}-{LAST_YEAR}", "temperature": f"{HOMOGENEOUS_FROM}-{LAST_YEAR}"},
    }


def recent(df: pd.DataFrame, n=45) -> dict:
    valid = df[df["PRECTOTCORR"].notna()]
    last = valid.index[-1]
    tail = valid.loc[last - pd.Timedelta(days=n - 1) : last]
    def window_sum(end_day: pd.Timestamp, days: int, y: int) -> float:
        e = pd.Timestamp(y, end_day.month, end_day.day)
        return float(df.loc[e - pd.Timedelta(days=days - 1) : e, "PRECTOTCORR"].sum())
    out = {}
    for days in (7, 30):
        cur = float(tail["PRECTOTCORR"].iloc[-days:].sum())
        past = [window_sum(last, days, y) for y in range(LAST_YEAR - 9, LAST_YEAR + 1)]
        out[f"rain_{days}d_mm"] = r2(cur, 1)
        out[f"rain_{days}d_normal_mm"] = r2(float(np.median(past)), 1)
    return {
        "last_day": last.strftime("%Y-%m-%d"),
        "days": [{"d": i.strftime("%m-%d"), "rain": r2(r.PRECTOTCORR, 1), "t": r2(r.T2M, 1)} for i, r in tail.iterrows()],
        "normal_period": f"{LAST_YEAR - 9}-{LAST_YEAR} median for the same dates",
        **out,
    }


def main(districts_p: Path, cells_p: Path, raw_dir: Path, out_dir: Path, meta_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    meta_dir.mkdir(parents=True, exist_ok=True)
    districts = json.loads(districts_p.read_text(encoding="utf-8"))
    mapping = json.loads(cells_p.read_text(encoding="utf-8"))["district_to_cell"]
    cache: dict[str, tuple[pd.DataFrame, dict]] = {}
    for cid in sorted(set(mapping.values())):
        cache[cid] = load_cell(raw_dir / f"{cid}.json.gz")
    last_year = min(last_complete_year(df) for df, _ in cache.values())  # every cell must be complete for that year
    configure(last_year)
    data_through = min(df[df["PRECTOTCORR"].notna() & df["T2M"].notna()].index[-1] for df, _ in cache.values())
    index = []
    for d in districts:
        cid = mapping[d["slug"]]
        df, header = cache[cid]
        series = yearly(df)
        trends = {}
        for k, v in series.items():
            if k in TRENDED:
                tr = trend_since(v)
                trends[k] = {"per_decade": r2(None if tr["slope_per_year"] is None else tr["slope_per_year"] * 10, 3), "p": r2(tr["p"], 3), "n": tr["n"], "trended": True, "from": HOMOGENEOUS_FROM}
            else:
                trends[k] = {"per_decade": None, "p": None, "n": 0, "trended": False}
        doc = {
            "slug": d["slug"],
            "grid_cell": cid,
            "source": {"dataset": "NASA POWER daily, community=AG", "sources": header["sources"], "api": header["api"], "years": [YEARS[0], YEARS[-1]], "fill_value_treated_as": "missing"},
            "years": YEARS,
            "breaks": BREAKS,
            "homogeneous_from": HOMOGENEOUS_FROM,
            "series": series,
            "trends": trends,
            "monthly": monthly(df),
            "crops": {
                "aus": {"onset": crop_onset(df, "aus"), "gdd": gdd_block(df, "aus")},
                "aman": {"onset": crop_onset(df, "aman"), "gdd": gdd_block(df, "aman")},
                "boro": {"gdd": gdd_block(df, "boro")},
            },
            "recent": recent(df),
        }
        (out_dir / f"{d['slug']}.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        index.append(
            {
                "slug": d["slug"],
                "hot_days_per_decade": trends["hot_days"]["per_decade"],
                "t_per_decade": trends["t_mean"]["per_decade"],
                "aus_shift": doc["crops"]["aus"]["onset"]["recommended_shift_days"],
                "aman_shift": doc["crops"]["aman"]["onset"]["recommended_shift_days"],
            }
        )
    (out_dir / "index.json").write_text(json.dumps(index, separators=(",", ":")), encoding="utf-8")
    status = {
        "data_through": data_through.strftime("%Y-%m-%d"),  # newest day that exists in every grid cell
        "first_day": "1981-01-01",
        "last_complete_year": last_year,
        "cells": len(cache),
        "districts": len(districts),
        "period_a": list(PERIOD_A),
        "period_b": list(PERIOD_B),
        "long_a": list(LONG_A),
        "long_b": list(LONG_B),
        "rain_soil_basis": [last_year - 9, last_year],
        "built": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
    }
    (out_dir / "status.json").write_text(json.dumps(status, indent=1), encoding="utf-8")
    print(f"wrote {len(index)} district files; last complete year {last_year}; data through {status['data_through']}")
    sig = [(i["slug"], i["aus_shift"], i["aman_shift"]) for i in index]
    print("districts with a significant Aus shift:", sum(1 for s in sig if s[1] != 0), "| Aman:", sum(1 for s in sig if s[2] != 0))


if __name__ == "__main__":
    if len(sys.argv) != 6:
        sys.exit(__doc__)
    main(*(Path(a) for a in sys.argv[1:]))
