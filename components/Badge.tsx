"use client";
import { useI18n } from "./LocaleProvider";

const tone = {
  nasa: "bg-[#dcebf3] text-[#255a7a]",
  analysis: "bg-green-soft text-green-deep",
  simulated: "bg-[#e6e5f2] text-[#4f4d82]",
  unavailable: "bg-surface-2 text-ink-2 ring-1 ring-line",
  demo: "bg-[#f6e8d3] text-[#8a5a1f]",
  sample: "bg-surface-2 text-ink-2",
} as const;

export function Badge({ kind }: { kind: keyof typeof tone }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[kind]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {t(`badge.${kind}`)}
    </span>
  );
}
