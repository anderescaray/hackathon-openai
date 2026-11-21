import type { HomeFacts, HomeProfile } from "@/domain/profile";

import { countOk, type FitResult } from "@/app/_lib/fit";
import { HOME_FACT_LABELS, formatEur, formatFactValue, homeSummary } from "@/app/_lib/format";

import { CheckIcon, CrossIcon, ShieldCheckIcon, SwipeArrowsIcon } from "./icons";

const FACT_ORDER: (keyof HomeFacts)[] = [
  "monthlyRentEur",
  "district",
  "rentalType",
  "bedrooms",
  "sizeM2",
  "furnished",
  "availableFrom",
];

type HomeDetailsProps = {
  home: HomeProfile;
  fit: FitResult;
};

export function HomeDetails({ home, fit }: HomeDetailsProps) {
  const mustsOk = countOk(fit.musts);
  const niceOk = countOk(fit.nice);
  const theyOk = countOk(fit.theyRequire);
  const summary = homeSummary(home.facts);

  return (
    <div className="min-h-full w-full bg-cream px-[16px] pt-[76px] pb-[116px]">
      <div className="flex flex-col gap-[12px]">
        <div className="flex items-start justify-between gap-3 px-[4px]">
          <div className="min-w-0">
            <h2 className="font-display text-[24px] font-semibold leading-[1.1] text-ink">{home.displayName}</h2>
            {summary && <p className="mt-[4px] text-[14px] text-muted">{summary}</p>}
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-[24px] font-semibold leading-[1.1] text-granate">
              {home.facts.monthlyRentEur !== undefined ? formatEur(home.facts.monthlyRentEur) : "—"}
            </div>
            <div className="text-[12px] text-muted">per month</div>
          </div>
        </div>

        {home.notes.trim().length > 0 && (
          <section className="rounded-tile bg-surface p-[16px]">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Landlord&rsquo;s note</h3>
            <p className="mt-[6px] text-[14px] italic leading-[1.45] text-ink-soft">
              &ldquo;{home.notes.trim()}&rdquo;
            </p>
          </section>
        )}

        {(fit.musts.length > 0 || fit.nice.length > 0) && (
          <section className="flex flex-col gap-[12px] rounded-tile bg-surface p-[16px]">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-[20px] font-semibold leading-tight text-ink">
                Your requirements
              </h3>
              {fit.musts.length > 0 && (
                <span className="text-[13px] font-semibold text-granate">
                  {mustsOk}/{fit.musts.length} musts
                </span>
              )}
            </div>

            {fit.musts.length > 0 && (
              <div className="flex flex-col gap-[9px] text-[14px]">
                {fit.musts.map((check) => (
                  <div key={`must-${check.field}-${check.label}`} className="flex items-center gap-[10px]">
                    <span
                      className={`flex size-[20px] flex-none items-center justify-center rounded-[6px] ${
                        check.ok ? "bg-granate text-white" : "bg-line text-muted"
                      }`}
                    >
                      {check.ok ? <CheckIcon size={11} /> : <CrossIcon size={10} />}
                    </span>
                    <span className="flex-1 text-ink">{check.label}</span>
                    <span className="text-muted">{check.value}</span>
                  </div>
                ))}
              </div>
            )}

            {fit.nice.length > 0 && (
              <div className="border-t border-line pt-[10px]">
                <div className="mb-[8px] text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                  Nice to have &middot; {niceOk} of {fit.nice.length}
                </div>
                <div className="flex flex-col gap-[8px] text-[14px]">
                  {fit.nice.map((check) => (
                    <div key={`nice-${check.field}-${check.label}`} className="flex items-center gap-[10px]">
                      <span
                        className={`flex size-[20px] flex-none items-center justify-center rounded-[6px] ${
                          check.ok ? "bg-granate-50 text-granate" : "bg-cream text-subtle"
                        }`}
                      >
                        {check.ok ? <CheckIcon size={11} /> : <CrossIcon size={10} />}
                      </span>
                      <span className={check.ok ? "flex-1 text-ink" : "flex-1 text-subtle line-through"}>
                        {check.label}
                      </span>
                      <span className={check.ok ? "text-muted" : "text-subtle"}>{check.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {fit.theyRequire.length > 0 && (
          <section className="flex items-center gap-[12px] rounded-tile bg-granate p-[14px] text-cream">
            <ShieldCheckIcon className="shrink-0" />
            <div className="text-[13px] leading-[1.35]">
              <div className="font-bold">
                {theyOk === fit.theyRequire.length
                  ? "You fit the landlord’s must-haves too"
                  : `You fit ${theyOk} of ${fit.theyRequire.length} landlord must-haves`}
              </div>
              <div>{fit.theyRequire.map((c) => c.label).join(" · ")}</div>
            </div>
          </section>
        )}

        <section className="rounded-tile bg-surface p-[16px]">
          <h3 className="mb-[8px] text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Home facts</h3>
          <dl className="divide-y divide-line text-[14px]">
            {FACT_ORDER.map((field) => (
              <div key={field} className="flex items-center justify-between gap-4 py-[8px] first:pt-0 last:pb-0">
                <dt className="text-muted">{HOME_FACT_LABELS[field]}</dt>
                <dd className="font-semibold text-ink">{formatFactValue(field, home.facts[field])}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex items-center justify-center gap-[8px] pt-[4px] text-[12px] text-subtle">
          <SwipeArrowsIcon />
          <span>Swipe left to pass &middot; right to like</span>
        </div>
      </div>
    </div>
  );
}
