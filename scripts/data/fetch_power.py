"""Download NASA POWER daily point data (1981 to today) for every unique MERRA-2 grid cell that holds a district.

Usage: python3 -I scripts/data/fetch_power.py [--update] <districts.json> <raw_out_dir> <geo_out_dir> <metadata_dir>

- District centroids are snapped to the MERRA-2 grid (0.5 deg lat x 0.625 deg lon) so each cell is requested
  once (POWER may block repeated requests for one cell).
- Raw responses are stored unchanged, gzip-compressed, one file per cell.
- POWER fill value -999 is kept in raw files and treated as MISSING (never zero) by later steps.
- No API key is needed for the POWER daily point API.

Default mode downloads the whole record for cells that are not on disk yet and skips cells that are.
--update mode (used by the daily GitHub Action) asks only for the recent gap of cells already on disk, and downloads
the whole record for any cell that is missing (the first run, or after the cache was cleared). The raw files are not kept
in the git repository; the Action keeps them in a cache. The gap starts OVERLAP_DAYS before the last valid day stored, because the newest days come from a provisional source and POWER later replaces them.
New values replace old ones, but a "missing" answer never overwrites a stored valid value.
If any cell cannot be updated or is stale, the script exits with an error so a broken refresh is never published.
"""

from __future__ import annotations

import datetime as dt
import gzip
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PARAMS = [
    "PRECTOTCORR",  # precipitation, mm/day
    "T2M",  # mean temperature at 2 m, C
    "T2M_MAX",
    "T2M_MIN",
    "RH2M",  # relative humidity, %
    "WS2M",  # wind speed at 2 m, m/s
    "ALLSKY_SFC_SW_DWN",  # solar radiation, MJ/m^2/day
    "GWETTOP",  # surface soil wetness, 0-1
    "GWETROOT",  # root-zone soil wetness, 0-1
]
START = "19810101"  # earliest date POWER daily data exist
API = "https://power.larc.nasa.gov/api/temporal/daily/point"
FILL = -999.0
OVERLAP_DAYS = 120  # re-request this many days before the last stored valid day
END_LAGS = (0, 3, 7)  # if POWER rejects an end date that is too recent, try an earlier one
MAX_STALE_DAYS = 30  # after an update, the newest valid day must be at most this old


class ClientError(RuntimeError):
    """POWER answered with a 4xx (bad request). Retrying the same request would not help."""


def cell_of(lat: float, lon: float) -> tuple[float, float]:
    i = round((lat + 90) / 0.5)
    j = round((lon + 180) / 0.625)
    return round(-90 + 0.5 * i, 3), round(-180 + 0.625 * j, 3)


def cell_id(lat: float, lon: float) -> str:
    return f"{lat:+07.3f}_{lon:+08.3f}"


def fetch(lat: float, lon: float, end: str, start: str = START) -> str:
    q = urllib.parse.urlencode(
        {
            "parameters": ",".join(PARAMS),
            "community": "ag",
            "longitude": lon,
            "latitude": lat,
            "start": start,
            "end": end,
            "format": "json",
        }
    )
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"{API}?{q}", timeout=180) as r:
                return r.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            if 400 <= e.code < 500 and e.code != 429:
                body = e.read().decode("utf-8", "replace")[:300]
                raise ClientError(f"POWER rejected the request for {lat},{lon} ({e.code}): {body}") from e
            last = e
            time.sleep(4 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last = e
            time.sleep(4 * (attempt + 1))
    raise RuntimeError(f"POWER request failed for {lat},{lon}: {last}")


def last_valid_day(obj: dict) -> str | None:
    """Newest YYYYMMDD on which rain and temperature are both present (not the fill value)."""
    par = obj["properties"]["parameter"]
    fill = obj.get("header", {}).get("fill_value", FILL)
    rain, temp = par["PRECTOTCORR"], par["T2M"]
    good = [d for d, v in rain.items() if v != fill and temp.get(d, fill) != fill]
    return max(good) if good else None


def merge_payload(old: dict, new: dict) -> dict:
    """Merge a newer POWER response into a stored one. New values win, except a fill value never replaces a valid one."""
    fill = new.get("header", {}).get("fill_value", FILL)
    merged = json.loads(json.dumps(old))  # deep copy
    mp = merged["properties"]["parameter"]
    for name, series in new["properties"]["parameter"].items():
        target = mp.setdefault(name, {})
        for day, val in series.items():
            if val == fill and target.get(day, fill) != fill:
                continue
            target[day] = val
        mp[name] = dict(sorted(target.items()))
    hdr = dict(new.get("header", {}))
    if "start" in old.get("header", {}):
        hdr["start"] = old["header"]["start"]
    merged["header"] = hdr
    return merged


def read_cell(path: Path) -> dict:
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        return json.loads(fh.read())


def write_cell(path: Path, obj_or_text) -> None:
    text = obj_or_text if isinstance(obj_or_text, str) else json.dumps(obj_or_text, separators=(",", ":"))
    with gzip.open(path, "wt", encoding="utf-8", compresslevel=9) as fh:
        fh.write(text)


def update_cell(path: Path, lat: float, lon: float, today: dt.date) -> dict:
    old = read_cell(path)
    last = last_valid_day(old)
    first_needed = dt.datetime.strptime(last, "%Y%m%d").date() - dt.timedelta(days=OVERLAP_DAYS) if last else dt.datetime.strptime(START, "%Y%m%d").date()
    start = max(first_needed, dt.datetime.strptime(START, "%Y%m%d").date()).strftime("%Y%m%d")
    err = None
    for lag in END_LAGS:
        end = (today - dt.timedelta(days=lag)).strftime("%Y%m%d")
        try:
            text = fetch(lat, lon, end, start)
        except ClientError as e:
            err = e
            continue
        new = json.loads(text)
        if "properties" not in new:
            raise RuntimeError(f"unexpected response for {lat},{lon}: {text[:300]}")
        merged = merge_payload(old, new)
        new_last = last_valid_day(merged)
        if new_last is None or dt.datetime.strptime(new_last, "%Y%m%d").date() < today - dt.timedelta(days=MAX_STALE_DAYS):
            raise RuntimeError(f"cell {lat},{lon} is stale after update (newest valid day {new_last})")
        write_cell(path, merged)
        return merged
    raise RuntimeError(f"POWER rejected every end date for {lat},{lon}: {err}")


def fetch_full(lat: float, lon: float, today: dt.date) -> str:
    """Whole record (1981 to the newest day). If POWER rejects an end date that is too recent, try a slightly earlier one."""
    err = None
    for lag in END_LAGS:
        end = (today - dt.timedelta(days=lag)).strftime("%Y%m%d")
        try:
            return fetch(lat, lon, end)
        except ClientError as e:
            err = e
    raise RuntimeError(f"POWER rejected every end date for {lat},{lon}: {err}")


def main(districts_path: Path, raw_dir: Path, geo_dir: Path, meta_dir: Path, update: bool = False) -> None:
    raw_dir.mkdir(parents=True, exist_ok=True)
    geo_dir.mkdir(parents=True, exist_ok=True)
    meta_dir.mkdir(parents=True, exist_ok=True)
    districts = json.loads(districts_path.read_text(encoding="utf-8"))
    today = dt.date.today()
    end = today.strftime("%Y%m%d")

    cells: dict[str, dict] = {}
    mapping: dict[str, str] = {}
    for d in districts:
        la, lo = cell_of(d["lat"], d["lon"])
        cid = cell_id(la, lo)
        cells.setdefault(cid, {"lat": la, "lon": lo, "districts": []})["districts"].append(d["slug"])
        mapping[d["slug"]] = cid
    (geo_dir / "district-cells.json").write_text(
        json.dumps({"grid": "MERRA-2 0.5 x 0.625 deg", "cells": cells, "district_to_cell": mapping}, indent=1),
        encoding="utf-8",
    )
    print(f"{len(districts)} districts -> {len(cells)} unique grid cells; end date {end}; update={update}", flush=True)

    records = []
    for n, (cid, c) in enumerate(sorted(cells.items()), 1):
        out = raw_dir / f"{cid}.json.gz"
        if out.exists() and update:
            obj = update_cell(out, c["lat"], c["lon"], today)
            print(f"[{n}/{len(cells)}] {cid}: updated, newest valid day {last_valid_day(obj)}", flush=True)
            time.sleep(1.5)
        elif out.exists():
            print(f"[{n}/{len(cells)}] {cid}: already downloaded", flush=True)
        else:
            text = fetch_full(c["lat"], c["lon"], today)
            obj = json.loads(text)
            if "properties" not in obj:
                raise RuntimeError(f"unexpected response for {cid}: {text[:300]}")
            write_cell(out, text)
            print(f"[{n}/{len(cells)}] {cid}: saved {out.stat().st_size // 1024} KB", flush=True)
            time.sleep(1.5)
        obj = read_cell(out)
        newest = last_valid_day(obj)
        if update and (newest is None or dt.datetime.strptime(newest, "%Y%m%d").date() < today - dt.timedelta(days=MAX_STALE_DAYS)):
            raise RuntimeError(f"cell {cid} is stale (newest valid day {newest}); not publishing")
        par = obj["properties"]["parameter"]
        days = sorted(par["T2M"])
        miss = {k: sum(1 for v in par[k].values() if v == FILL) for k in PARAMS}
        records.append(
            {
                "cell": cid,
                "first_day": days[0],
                "last_day": last_valid_day(obj),  # newest day with real values (days after it are fill values)
                "last_day_in_file": days[-1],
                "n_days": len(days),
                "missing_days_by_parameter": miss,
                "api": obj["header"]["api"],
                "sources": obj["header"]["sources"],
                "fill_value": obj["header"]["fill_value"],
            }
        )

    meta = {
        "dataset": "NASA POWER daily point, community=AG",
        "url": "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
        "retrieved": today.isoformat(),
        "request_start": START,
        "request_end": end,
        "updated_incrementally": update,
        "parameters": PARAMS,
        "cells": records,
    }
    (meta_dir / "power-retrieval.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    print("done", flush=True)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--update"]
    if len(args) != 4:
        sys.exit(__doc__)
    main(*(Path(a) for a in args), update="--update" in sys.argv[1:])
