"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { searchDistricts } from "@/lib/search";
import type { District, Division } from "@/lib/types";
import { useI18n } from "./LocaleProvider";

export function DistrictPicker({ districts, divisions }: { districts: District[]; divisions: Division[] }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [div, setDiv] = useState<string>("");
  const list = useMemo(() => searchDistricts(div ? districts.filter((d) => d.division_id === div) : districts, q), [districts, div, q]);
  const nm = (x: { name_bn: string; name_en: string }) => (locale === "bn" ? x.name_bn : x.name_en);
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <label htmlFor="dsearch" className="mb-1.5 block text-sm font-medium">{t("home.search")}</label>
        <input
          id="dsearch" className="field w-full" value={q} placeholder={t("home.searchPlaceholder")} autoComplete="off"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && list[0]) router.push(`/${locale}/area/${list[0].slug}/`); }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("home.all")}>
        <button type="button" onClick={() => setDiv("")} aria-pressed={!div} className="chip">{t("home.all")}</button>
        {divisions.map((v) => (
          <button key={v.id} type="button" onClick={() => setDiv(v.id)} aria-pressed={div === v.id} className="chip">{nm(v)}</button>
        ))}
      </div>
      <p className="text-sm text-ink-2" aria-live="polite">{t("home.districts")}: {list.length}</p>
      {list.length === 0 ? (
        <p className="rounded-xl bg-surface-2 p-4 text-sm text-ink-2">{t("home.noResult")}</p>
      ) : (
        <ul className="grid max-h-[22rem] grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {list.map((d) => (
            <li key={d.slug}>
              <Link href={`/${locale}/area/${d.slug}/`} className="block rounded-xl border border-transparent bg-surface px-3 py-2 text-sm hover:border-line hover:bg-green-soft">{nm(d)}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
