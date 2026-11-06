"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Climate } from "@/lib/types";
import { ClientOnly } from "./ClientOnly";
import { useI18n } from "./LocaleProvider";

export function RainBars({ days }: { days: Climate["recent"]["days"] }) {
  const { locale, n } = useI18n();
  const fmt = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const data = days.map((d) => ({ label: fmt.format(new Date(Date.UTC(2025, Number(d.d.slice(0, 2)) - 1, Number(d.d.slice(3, 5))))), rain: d.rain ?? 0 }));
  return (
    <ClientOnly height={200}>
      <div className="h-[200px]" role="img" aria-label="Daily rain">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="#d5e0da" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7e918d" }} interval={8} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#7e918d" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => n(v)} />
            <Tooltip cursor={{ fill: "#e6ede8" }} formatter={(v) => [`${n(Number(v), 1)} mm`, ""]} separator="" />
            <Bar dataKey="rain" fill="#3b7da6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ClientOnly>
  );
}
