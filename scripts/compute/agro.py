"""Deterministic climate-shift maths for CropOrbit. No model or LLM touches a number here.

All inputs are plain lists/arrays of daily values; missing data (NASA POWER -999) must already be NaN.
"""

from __future__ import annotations

import math
from typing import Sequence

import numpy as np
from scipy import stats


def rain_onset(
    rain: Sequence[float],
    start: int,
    end: int,
    window: int = 7,
    threshold_mm: float = 50.0,
    dry_mm: float = 1.0,
    dry_run: int = 7,
    lookahead: int = 14,
) -> int | None:
    """Index of the first day i in [start, end) that begins a `window`-day spell with >= threshold_mm of rain
    and is NOT followed, within `lookahead` days, by a dry run (>= dry_run consecutive days under dry_mm).
    Windows containing missing days are skipped. Returns None when no such day exists."""
    r = np.asarray(rain, dtype=float)
    n = len(r)
    for i in range(start, min(end, n - window)):
        w = r[i : i + window]
        if np.isnan(w).any() or w.sum() < threshold_mm:
            continue
        after = r[i + window : i + window + lookahead]
        if np.isnan(after).any():
            continue
        run = longest = 0
        for v in after:
            run = run + 1 if v < dry_mm else 0
            longest = max(longest, run)
        if longest < dry_run:
            return i
    return None


def cumulative_fraction_day(rain: Sequence[float], start: int, end: int, fraction: float) -> int | None:
    """Index of the first day in [start, end) on which cumulative rain since `start` reaches `fraction` of the
    total over [start, end). Scale-free: multiplying every rainfall value by a constant does not move the result,
    which keeps it usable across NASA rainfall-record steps that change amounts. None if any day is missing."""
    r = np.asarray(rain, dtype=float)[start:end]
    if len(r) == 0 or np.isnan(r).any() or r.sum() <= 0:
        return None
    c = np.cumsum(r) / r.sum()
    return int(start + np.argmax(c >= fraction))


def growing_degree_days(tmean: Sequence[float], base: float = 10.0) -> float:
    t = np.asarray(tmean, dtype=float)
    return float(np.nansum(np.clip(t - base, 0, None)))


def longest_dry_spell(rain: Sequence[float], dry_mm: float = 1.0) -> int:
    run = longest = 0
    for v in np.asarray(rain, dtype=float):
        run = run + 1 if (not math.isnan(v) and v < dry_mm) else 0
        longest = max(longest, run)
    return longest


def count_days(values: Sequence[float], at_least: float) -> int:
    v = np.asarray(values, dtype=float)
    return int(np.sum(v[~np.isnan(v)] >= at_least))


def trend(years: Sequence[int], values: Sequence[float]) -> dict:
    """Sen's slope (per year) and Kendall-tau p-value (the Mann-Kendall test). NaN pairs are dropped."""
    x = np.asarray(years, dtype=float)
    y = np.asarray(values, dtype=float)
    ok = ~np.isnan(y)
    if ok.sum() < 8:
        return {"n": int(ok.sum()), "slope_per_year": None, "p": None}
    slope = stats.theilslopes(y[ok], x[ok])[0]
    p = stats.kendalltau(x[ok], y[ok]).pvalue
    return {"n": int(ok.sum()), "slope_per_year": float(slope), "p": float(p)}


def compare_periods(a: Sequence[float], b: Sequence[float]) -> dict:
    """Median of each period, median shift (b - a) and a two-sided Mann-Whitney U p-value."""
    a = np.asarray([v for v in a if v is not None and not math.isnan(v)], dtype=float)
    b = np.asarray([v for v in b if v is not None and not math.isnan(v)], dtype=float)
    if len(a) < 5 or len(b) < 5:
        return {"n_a": len(a), "n_b": len(b), "median_a": None, "median_b": None, "shift": None, "p": None}
    p = stats.mannwhitneyu(a, b, alternative="two-sided").pvalue
    ma, mb = float(np.median(a)), float(np.median(b))
    return {"n_a": len(a), "n_b": len(b), "median_a": ma, "median_b": mb, "shift": mb - ma, "p": float(p)}
