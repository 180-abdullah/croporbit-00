"use client";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClientOnly } from "./ClientOnly";
import { useI18n } from "./LocaleProvider";

export function YearChart({ years, values, unit, color = "#2e6f57", from, breaks = [], shadeBefore, digits = 1, height = 280 }: {
  years: number[]; values: (number | null)[]; unit: string; color?: string; from?: number; breaks?: number[]; shadeBefore?: number; digits?: number; height?: number;
}) {
  const { n, t } = useI18n();
  const data = years.map((y, i) => ({ year: y, v: values[i] })).filter((d) => (from ? d.year >= from : true));
  const vals = data.map((d) => d.v).filter((x): x is number => x != null);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.12 || 1;
  return (
    <ClientOnly height={height}>
      <div style={{ height }} role="img" aria-label={unit}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke="#d5e0da" />
            <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={{ fontSize: 11, fill: "#7e918d" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => String(n(v)).replace(/[,،]/g, "")} />
            <YAxis domain={[lo - pad, hi + pad]} tick={{ fontSize: 11, fill: "#7e918d" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => n(v, digits > 1 ? 1 : 0)} width={52} />
            {shadeBefore ? <ReferenceArea x1={data[0]?.year} x2={shadeBefore} fill="#c9d6cf" fillOpacity={0.45} /> : null}
            {breaks.map((b) => <ReferenceLine key={b} x={b} stroke="#a4714f" strokeDasharray="4 4" />)}
            <Tooltip formatter={(v) => [`${n(Number(v), digits)} ${unit}`, ""]} labelFormatter={(l) => `${t("env.year")} ${n(Number(l)).replace(/[,،]/g, "")}`} separator="" />
            <Line type="linear" dataKey="v" stroke={color} strokeWidth={2} dot={{ r: 2.5, fill: color }} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ClientOnly>
  );
}
