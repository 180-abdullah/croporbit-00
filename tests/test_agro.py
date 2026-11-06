import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts", "compute"))
from agro import compare_periods, cumulative_fraction_day, count_days, growing_degree_days, longest_dry_spell, rain_onset, trend  # noqa: E402


def test_onset_finds_first_wet_spell_without_dry_run():
    r = [0.0] * 30 + [10.0] * 7 + [3.0] * 20
    assert rain_onset(r, 0, 60, threshold_mm=50) == 28  # window 28..34 already holds 50 mm


def test_onset_rejects_false_start_followed_by_dry_spell():
    false_start = [0.0] * 10 + [10.0] * 7 + [0.0] * 14
    real = [8.0] * 7 + [2.0] * 14
    r = false_start + real
    assert rain_onset(r, 0, len(r), threshold_mm=50) == 31  # first spell is rejected, the later one is accepted


def test_onset_skips_windows_with_missing_days():
    r = [10.0] * 3 + [math.nan] + [10.0] * 40
    assert rain_onset(r, 0, 20, threshold_mm=50) == 4


def test_onset_none_when_never_wet():
    assert rain_onset([0.5] * 100, 0, 90) is None


def test_onset_threshold_sensitivity_moves_date_later():
    r = [4.0] * 20 + [9.0] * 7 + [4.0] * 30
    low = rain_onset(r, 0, 40, threshold_mm=28)
    high = rain_onset(r, 0, 40, threshold_mm=55)
    assert low is not None and high is not None and low <= high


def test_gdd_ignores_cold_days_and_missing():
    assert growing_degree_days([5, 12, 20, math.nan], base=10) == 12.0


def test_dry_spell_and_heat_days():
    assert longest_dry_spell([0, 0, 5, 0, 0, 0, 2]) == 3
    assert count_days([30, 35, 36, math.nan], 35) == 2


def test_trend_detects_clear_slope_and_flat_series():
    years = list(range(1981, 2026))
    up = [0.1 * (y - 1981) + (0.3 if y % 2 else -0.3) for y in years]
    t = trend(years, up)
    assert abs(t["slope_per_year"] - 0.1) < 0.02 and t["p"] < 0.001
    flat = trend(years, [5.0 + (0.5 if y % 2 else -0.5) for y in years])
    assert flat["p"] > 0.3


def test_compare_periods_shift_and_small_sample_guard():
    rng = np.random.default_rng(0)
    a = rng.normal(100, 5, 22)
    b = rng.normal(111, 5, 22)
    c = compare_periods(a, b)
    assert 7 < c["shift"] < 15 and c["p"] < 0.001
    assert compare_periods([1, 2], [3, 4])["shift"] is None


def test_cumulative_fraction_day_is_scale_free_and_handles_missing():
    r = [0.0] * 10 + [5.0] * 10 + [20.0] * 10
    d1 = cumulative_fraction_day(r, 0, 30, 0.10)
    d2 = cumulative_fraction_day([2.0 * v for v in r], 0, 30, 0.10)
    assert d1 == d2 == 14  # 10% of 250 mm = 25 mm, reached on the 5th wet day
    assert cumulative_fraction_day([1.0, math.nan, 1.0], 0, 3, 0.5) is None
