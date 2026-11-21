"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Profile, TenantFacts } from "@/domain/profile";

import { getProfile, peekProfile } from "../../_lib/api";
import {
  REQUIREMENT_FIELD_LABELS,
  TENANT_FACT_LABELS,
  formatFactValue,
  initials,
  requirementValue,
} from "../../_lib/format";
import { demoSession, useSession } from "../../_lib/session";

const FACT_KEYS = Object.keys(TENANT_FACT_LABELS) as (keyof TenantFacts)[];

export function TenantProfileScreen() {
  const session = useSession("tenant");
  const [loadedById, setLoadedById] = useState<Record<string, Profile>>({});

  const tenantId = session
    ? session.role === "tenant"
      ? session.profileId
      : demoSession("tenant").profileId
    : null;

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const fetched = await getProfile(tenantId);
        if (!cancelled) {
          setLoadedById((prev) => ({ ...prev, [tenantId]: fetched }));
        }
      } catch {
        // fallback to peekProfile
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (!session || !tenantId) {
    return <div className="absolute inset-0 bg-cream" />;
  }

  const profile = loadedById[tenantId] ?? peekProfile(tenantId) ?? null;

  if (!profile || profile.role !== "tenant") {
    return (
      <div className="no-scrollbar absolute inset-0 overflow-y-auto bg-cream pb-[106px]">
        <header className="px-[20px] pt-[26px]">
          <h1 className="font-display text-[32px] leading-[1.15] font-semibold text-ink">
            Your card
          </h1>
          <p className="mt-[2px] text-[14px] text-muted">What Homie knows about you</p>
        </header>
      </div>
    );
  }

  const mustRequirements = profile.requirements.filter((r) => r.isMust);
  const niceRequirements = profile.requirements.filter((r) => !r.isMust);
  const orderedRequirements = [...mustRequirements, ...niceRequirements];
  const presentFacts = FACT_KEYS.filter((key) => profile.facts[key] !== undefined);

  return (
    <div className="no-scrollbar absolute inset-0 overflow-y-auto bg-cream pb-[106px]">
      <header className="flex items-center justify-between gap-[12px] px-[20px] pt-[26px]">
        <div className="min-w-0">
          <h1 className="font-display text-[32px] leading-[1.15] font-semibold text-ink">
            Your card
          </h1>
          <p className="mt-[2px] text-[14px] text-muted">What Homie knows about you</p>
        </div>

        <span
          title={profile.displayName}
          className="flex size-[48px] shrink-0 items-center justify-center rounded-full bg-ochre-100 font-display text-[18px] font-semibold text-granate"
        >
          {initials(profile.displayName)}
        </span>
      </header>

      {orderedRequirements.length > 0 && (
        <section aria-label="What you are looking for">
          <div className="px-[20px] pt-[18px] pb-[8px] text-[12px] font-bold tracking-[0.06em] text-subtle uppercase">
            Looking for
          </div>
          <div className="mx-[12px] grid grid-cols-2 gap-[8px]">
            {orderedRequirements.map((req, index) => {
              const label = REQUIREMENT_FIELD_LABELS[req.field] ?? req.field;
              return (
                <div
                  key={`${req.field}-${index}`}
                  className={
                    req.isMust
                      ? "rounded-tile bg-granate p-[14px] text-white"
                      : "rounded-tile bg-surface p-[14px] text-ink"
                  }
                >
                  <div className={req.isMust ? "text-[12px] text-white/85" : "text-[12px] text-muted"}>
                    {label} · {req.isMust ? "must" : "nice"}
                  </div>
                  <div className="mt-[4px] font-display text-[20px] leading-[1.2] font-semibold">
                    {requirementValue(req)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {presentFacts.length > 0 && (
        <section aria-label="Your details">
          <div className="px-[20px] pt-[18px] pb-[8px] text-[12px] font-bold tracking-[0.06em] text-subtle uppercase">
            About you · {profile.displayName}
          </div>
          <div className="mx-[12px] grid grid-cols-2 gap-[8px]">
            {presentFacts.map((key) => (
              <div key={key} className="rounded-tile bg-surface p-[14px] text-ink">
                <div className="text-[12px] text-muted">{TENANT_FACT_LABELS[key]}</div>
                <div className="mt-[4px] font-display text-[20px] leading-[1.2] font-semibold">
                  {formatFactValue(key, profile.facts[key])}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {profile.notes && (
        <section aria-label="Your note" className="mx-[12px] mt-[14px] rounded-tile bg-surface p-[16px]">
          <div className="text-[12px] font-bold tracking-[0.06em] text-subtle uppercase">
            Your note
          </div>
          <p className="mt-[6px] text-[14px] leading-[1.45] text-ink-soft italic">
            “{profile.notes}”
          </p>
        </section>
      )}

      <div className="mt-[22px] flex justify-center px-[20px]">
        <Link
          href="/interview-preview?role=tenant"
          className="py-[8px] text-[13px] font-semibold text-muted underline decoration-stone underline-offset-4 transition-colors hover:text-granate"
        >
          Redo the interview
        </Link>
      </div>
    </div>
  );
}
