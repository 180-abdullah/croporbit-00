"""Tests for the daily NASA refresh: merging new days into stored data, and analysis windows that move with the data."""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "data"))
sys.path.insert(0, str(ROOT / "scripts" / "compute"))

import analyze  # noqa: E402
import fetch_power as fp  # noqa: E402


def payload(rain, temp, start="19810101"):
    return {"header": {"fill_value": -999.0, "api": {"version": "v2.x"}, "sources": ["x"], "start": start},
            "properties": {"parameter": {"PRECTOTCORR": dict(rain), "T2M": dict(temp)}}}


def test_new_days_are_appended_and_sorted():
    old = payload({"20260101": 1.0, "20260102": 2.0}, {"20260101": 20.0, "20260102": 21.0})
    new = payload({"20260102": 2.5, "20260103": 3.0}, {"20260102": 21.5, "20260103": 22.0}, start="20260102")
    m = fp.merge_payload(old, new)
    rain = m["properties"]["parameter"]["PRECTOTCORR"]
    assert list(rain) == ["20260101", "20260102", "20260103"]
    assert rain["20260102"] == 2.5  # NASA's revised value wins
    assert m["header"]["start"] == "19810101"  # the stored record still starts where it did


def test_missing_answer_never_overwrites_a_stored_value():
    old = payload({"20260101": 4.0}, {"20260101": 20.0})
    new = payload({"20260101": -999.0, "20260102": -999.0}, {"20260101": -999.0, "20260102": -999.0})
    m = fp.merge_payload(old, new)
    assert m["properties"]["parameter"]["PRECTOTCORR"]["20260101"] == 4.0
    assert m["properties"]["parameter"]["PRECTOTCORR"]["20260102"] == -999.0  # unknown day stays unknown, not zero


def test_last_valid_day_ignores_fill_values():
    o = payload({"20260101": 1.0, "20260102": -999.0}, {"20260101": 20.0, "20260102": 21.0})
    assert fp.last_valid_day(o) == "20260101"
    assert fp.last_valid_day(payload({"20260101": -999.0}, {"20260101": -999.0})) is None


def test_windows_move_forward_with_the_last_complete_year():
    analyze.configure(2025)
    assert analyze.PERIOD_A == (1998, 2011) and analyze.PERIOD_B == (2012, 2025) and analyze.LONG_B == (2004, 2025)
    analyze.configure(2026)
    assert analyze.PERIOD_A == (1999, 2012) and analyze.PERIOD_B == (2013, 2026) and analyze.LONG_B == (2004, 2026)
    assert analyze.YEARS[-1] == 2026
    with pytest.raises(ValueError):
        analyze.configure(2024)  # would reach before 1998, when the NASA model inputs changed
    analyze.configure(2025)  # leave module state as the default for other tests


def _frame(last_day):
    idx = pd.date_range("2024-01-01", last_day)
    return pd.DataFrame({"PRECTOTCORR": np.ones(len(idx)), "T2M": np.ones(len(idx))}, index=idx)


def test_last_complete_year_needs_data_through_31_december():
    assert analyze.last_complete_year(_frame("2026-11-01")) == 2025
    assert analyze.last_complete_year(_frame("2026-12-30")) == 2025
    assert analyze.last_complete_year(_frame("2026-12-31")) == 2026
    assert analyze.last_complete_year(_frame("2027-01-04")) == 2026


def stored_cell(path, last="20261101"):
    """A small stored cell: every parameter for 2026-09-01 .. last, all valid."""
    import datetime as dt

    d0, d1 = dt.date(2026, 9, 1), dt.datetime.strptime(last, "%Y%m%d").date()
    days = [(d0 + dt.timedelta(days=i)).strftime("%Y%m%d") for i in range((d1 - d0).days + 1)]
    obj = {"header": {"fill_value": -999.0, "api": {"version": "v2.x"}, "sources": ["x"], "start": "19810101"},
           "properties": {"parameter": {k: {d: 1.0 for d in days} for k in fp.PARAMS}}}
    fp.write_cell(path, obj)
    return obj


def fake_api(calls, new_days=("20261103", "20261104")):
    import json

    def fake(lat, lon, end, start=fp.START):
        calls.append((end, start))
        par = {k: {d: 2.0 for d in new_days} for k in fp.PARAMS}
        return json.dumps({"header": {"fill_value": -999.0, "api": {"version": "v2.x"}, "sources": ["x"], "start": start}, "properties": {"parameter": par}})

    return fake


def test_update_cell_end_to_end_with_a_fake_api(tmp_path, monkeypatch):
    import datetime as dt

    dst = tmp_path / "cell.json.gz"
    before = stored_cell(dst)
    calls = []
    monkeypatch.setattr(fp, "fetch", fake_api(calls))
    out = fp.update_cell(dst, 24.5, 88.75, dt.date(2026, 11, 5))
    assert fp.last_valid_day(out) == "20261104"
    assert calls[0] == ("20261105", (dt.date(2026, 11, 1) - dt.timedelta(days=fp.OVERLAP_DAYS)).strftime("%Y%m%d"))  # only the recent gap
    assert fp.read_cell(dst) == out  # written back to disk
    assert out["properties"]["parameter"]["T2M"]["20260901"] == before["properties"]["parameter"]["T2M"]["20260901"]  # older record untouched
    assert out["properties"]["parameter"]["T2M"]["20261103"] == 2.0


def test_stale_data_is_refused(tmp_path, monkeypatch):
    import datetime as dt

    dst = tmp_path / "cell.json.gz"
    stored_cell(dst)
    monkeypatch.setattr(fp, "fetch", fake_api([], new_days=()))  # NASA returns nothing new
    with pytest.raises(RuntimeError, match="stale"):
        fp.update_cell(dst, 24.5, 88.75, dt.date(2027, 3, 1))


def test_full_download_retries_with_an_earlier_end_date(monkeypatch):
    import datetime as dt

    asked = []

    def fake(lat, lon, end, start=fp.START):
        asked.append(end)
        if end == "20261105":
            raise fp.ClientError("end date too recent")
        return "{}"

    monkeypatch.setattr(fp, "fetch", fake)
    assert fp.fetch_full(24.5, 88.75, dt.date(2026, 11, 5)) == "{}"
    assert asked == ["20261105", "20261102"]  # second try is 3 days earlier


def test_update_mode_downloads_a_missing_cell_in_full(tmp_path, monkeypatch):
    import datetime as dt
    import json

    class FakeDate(dt.date):
        @classmethod
        def today(cls):
            return cls(2026, 11, 5)

    districts = [{"slug": "a", "lat": 24.52, "lon": 88.7}, {"slug": "b", "lat": 24.6, "lon": 88.8}]  # both fall in one grid cell
    (tmp_path / "d.json").write_text(json.dumps(districts))
    calls = []
    monkeypatch.setattr(fp, "fetch", fake_api(calls, new_days=("20261101", "20261104")))
    monkeypatch.setattr(fp.time, "sleep", lambda s: None)
    monkeypatch.setattr(fp.dt, "date", FakeDate)
    fp.main(tmp_path / "d.json", tmp_path / "raw", tmp_path / "geo", tmp_path / "meta", update=True)
    assert len(calls) == 1 and calls[0][1] == fp.START  # no file on disk, so the whole record was requested once
    assert len(list((tmp_path / "raw").glob("*.json.gz"))) == 1
    meta = json.loads((tmp_path / "meta" / "power-retrieval.json").read_text())
    assert meta["cells"][0]["last_day"] == "20261104" and meta["updated_incrementally"] is True
