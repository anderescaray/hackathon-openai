"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Profile } from "@/domain/profile";

import { getInterested, getProfile, peekProfile } from "../../_lib/api";
import { demoLandlord } from "../../_lib/fixtures";
import { formatEur, homeSummary } from "../../_lib/format";
import { setSession, useSession } from "../../_lib/session";
import { HouseOutlineIcon } from "./icons";

export function ListingsScreen() {
  const session = useSession("home");
  const router = useRouter();

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadedHomes, setLoadedHomes] = useState<Record<string, Profile>>({});

  const activeHomeId = session
    ? session.role === "home"
      ? session.profileId
      : demoLandlord.homeIds[0]!
    : null;

  const listingIdsKey = activeHomeId
    ? (demoLandlord.homeIds.includes(activeHomeId)
        ? demoLandlord.homeIds
        : [activeHomeId, ...demoLandlord.homeIds]
      ).join(",")
    : "";

  useEffect(() => {
    if (!listingIdsKey) return;
    let cancelled = false;
    const ids = listingIdsKey.split(",");

    const load = async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const [interested, fetchedProfile] = await Promise.all([
            getInterested(id).catch(() => []),
            peekProfile(id) ? Promise.resolve(null) : getProfile(id).catch(() => null),
          ]);
          return { id, count: interested.length, fetchedProfile };
        }),
      );

      if (cancelled) return;
      setCounts((prev) => {
        const next = { ...prev };
        for (const row of results) next[row.id] = row.count;
        return next;
      });
      setLoadedHomes((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const row of results) {
          if (row.fetchedProfile) {
            next[row.id] = row.fetchedProfile;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [listingIdsKey]);

  if (!session || !activeHomeId) {
    return <div className="absolute inset-0 bg-cream" />;
  }

  const listingIds = listingIdsKey.split(",");

  const handleSelect = (id: string) => {
    setSession({ profileId: id, role: "home" });
    router.push("/interested");
  };

  return (
    <div className="no-scrollbar absolute inset-0 overflow-y-auto bg-cream pb-[106px]">
      <header className="px-[20px] pt-[26px]">
        <h1 className="font-display text-[32px] leading-[1.15] font-semibold text-ink">
          My listings
        </h1>
        <p className="mt-[2px] text-[14px] text-muted">
          Tap a home to review interested tenants
        </p>
      </header>

      <div className="mt-[16px] flex flex-col gap-[14px] px-[12px]">
        {listingIds.map((id) => {
          const home = peekProfile(id) ?? loadedHomes[id];
          if (!home || home.role !== "home") return null;

          const photo = home.photoUrls[0];
          const rent = home.facts.monthlyRentEur;
          const summary = homeSummary(home.facts);
          const count = counts[id];
          const isActive = id === activeHomeId;

          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              className={`w-full overflow-hidden rounded-card bg-surface text-left shadow-card transition-transform active:scale-[0.99] ${
                isActive ? "ring-[1.5px] ring-ochre-300" : ""
              }`}
            >
              <div className="relative flex h-[140px] w-full items-center justify-center overflow-hidden rounded-t-card bg-granate-50">
                {photo ? (
                  <Image
                    src={photo}
                    alt={home.displayName}
                    fill
                    sizes="366px"
                    className="object-cover"
                  />
                ) : (
                  <HouseOutlineIcon size={34} color="#7C1D2E" strokeWidth={2} />
                )}
              </div>

              <div className="flex flex-col gap-[6px] p-[16px]">
                <div className="flex items-start justify-between gap-[12px]">
                  <div className="font-display text-[20px] leading-[1.2] font-semibold text-ink">
                    {home.displayName}
                  </div>
                  {rent !== undefined && (
                    <div className="shrink-0 text-right">
                      <span className="font-display text-[20px] leading-[1.2] font-semibold text-granate">
                        {formatEur(rent)}
                      </span>
                      <span className="text-[12px] text-muted">/mo</span>
                    </div>
                  )}
                </div>

                {summary && <div className="text-[13px] text-muted">{summary}</div>}

                <div className="mt-[6px] flex items-center justify-between">
                  <span className="inline-flex items-center rounded-chip bg-granate-50 px-[10px] py-[5px] text-[12px] font-bold text-granate">
                    {count !== undefined ? `${count} interested` : "Loading…"}
                  </span>
                  {isActive && (
                    <span className="text-[12px] font-semibold text-subtle">Selected</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
