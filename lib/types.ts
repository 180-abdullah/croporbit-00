export type District = { id: string; slug: string; name_en: string; name_bn: string; division_id: string; division_en: string; division_bn: string; lat: number; lon: number };
export type Division = { id: string; slug: string; name_en: string; name_bn: string; lat: number; lon: number };
export type Cmp = { n_a: number; n_b: number; median_a: number | null; median_b: number | null; shift: number | null; p: number | null };
export type Trend = { per_decade: number | null; p: number | null; n: number; trended: boolean; from?: number };
export type Onset = {
  kind: "rain_timing";
  definition: { fraction: number; season: string };
  onset_doy: (number | null)[];
  periods: { a: number[]; b: number[]; long_a: number[]; long_b: number[] };
  compare: Cmp; long_record: Cmp;
  trend_days_per_decade: number | null; trend_p: number | null;
  sensitivity: { lower: { fraction: number; shift_days: number | null; p: number | null }; upper: { fraction: number; shift_days: number | null; p: number | null } };
  direction_consistent: boolean; significant: boolean; recommended_shift_days: number; years_without_event: number[];
};
export type Gdd = { window: string; base_c: number; values: (number | null)[]; compare: Cmp; trend_per_decade: number | null; trend_p: number | null; periods: number[][] };
export type Climate = {
  slug: string; grid_cell: string;
  source: { dataset: string; sources: string[]; years: number[] };
  years: number[]; breaks: number[]; homogeneous_from: number;
  series: Record<"rain_total" | "rain_monsoon" | "t_mean" | "t_max" | "hot_days" | "soil_root" | "solar" | "humidity" | "wind" | "boro_cold_nights", (number | null)[]>;
  trends: Record<string, Trend>;
  monthly: { rain: (number | null)[]; t_mean: (number | null)[]; t_max: (number | null)[]; soil_root: (number | null)[]; basis: { rain_soil: string; temperature: string } };
  crops: { aus: { onset: Onset; gdd: Gdd }; aman: { onset: Onset; gdd: Gdd }; boro: { gdd: Gdd } };
  recent: { last_day: string; days: { d: string; rain: number | null; t: number | null }[]; normal_period: string; rain_7d_mm: number; rain_7d_normal_mm: number; rain_30d_mm: number; rain_30d_normal_mm: number };
};
export type CropKey = "aus" | "aman" | "boro";
