import { promises as fs } from "node:fs";
import path from "node:path";
import type { Climate, District, Division } from "./types";

const read = async <T,>(rel: string): Promise<T> => JSON.parse(await fs.readFile(path.join(process.cwd(), rel), "utf8")) as T;
export const getDistricts = () => read<District[]>("data/districts.json");
export const getDivisions = () => read<Division[]>("data/divisions.json");
export const getClimate = (slug: string) => read<Climate>(`public/data/climate/${slug}.json`);
export const getCatalog = () => read<{ datasets: Record<string, unknown>[]; data_quality: Record<string, unknown> }>("data/metadata/dataset-catalog.json");
export type IndexRow = { slug: string; hot_days_per_decade: number | null; t_per_decade: number | null; aus_shift: number; aman_shift: number };
export const getIndex = () => read<IndexRow[]>("public/data/climate/index.json");
export type Status = { data_through: string; first_day: string; last_complete_year: number; cells: number; districts: number; period_a: number[]; period_b: number[]; long_a: number[]; long_b: number[]; rain_soil_basis: number[]; built: string };
export const getStatus = () => read<Status>("public/data/climate/status.json");
export type Quality = { changes: { rain_ratio_97: number; rain_ratio_16: number; dT_97: number }; cells: number };
export const getQuality = () => read<Quality>("data/metadata/data-quality.json");
