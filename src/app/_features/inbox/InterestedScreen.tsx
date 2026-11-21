"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";

import type { FeedItem, Profile, TenantProfile } from "@/domain/profile";

import {
  MATCH_POLL_MS,
  getInterested,
  getProfile,
  likedAgo,
  markMatchSeen,
  matchIdFor,
  peekProfile,
  swipe,
} from "../../_lib/api";
import { countOk, evaluateRequirements } from "../../_lib/fit";
import { demoLandlord } from "../../_lib/fixtures";
import {
  CONTRACT_LABELS,
  formatEur,
  householdSummary,
  incomeRatio,
  initials,
  moveInSummary,
} from "../../_lib/format";
import { setSession, useSession } from "../../_lib/session";
import { Homie } from "../../_ui/homie/Homie";
import { MatchCelebration } from "../match/MatchCelebration";
import { CheckIcon, ChevronDownIcon, HouseOutlineIcon } from "./icons";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

const cardVariants: Variants = {
  initial: (custom: { direction: "left" | "right"; reduced: boolean }) =>
    custom.reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: SPRING,
  },
  exit: (custom: { direction: "left" | "right"; reduced: boolean }) =>
    custom.reduced
      ? { opacity: 0, transition: { duration: 0.15 } }
      : {
          x: custom.direction === "right" ? 280 : -280,
          rotate: custom.direction === "right" ? 6 : -6,
          opacity: 0,
          transition: { duration: 0.24, ease: "easeIn" },
        },
};

function TenantCard({
  tenant,
  home,
  homeId,
  disabled,
  onDecline,
  onAccept,
}: {
  tenant: TenantProfile;
  home: Profile | null;
  homeId: string;
  disabled: boolean;
  onDecline(): void;
  onAccept(): void;
}) {
  const homeRent = home?.role === "home" ? home.facts.monthlyRentEur : undefined;
  const ratio = incomeRatio(tenant.facts.monthlyIncomeEur, homeRent);

  const mustBadge = (() => {
    if (!home) return null;
    const fit = evaluateRequirements(home, tenant);
    if (fit.musts.length === 0) return null;
    return `${countOk(fit.musts)}/${fit.musts.length} musts`;
  })();

  return (
    <div className="mx-[12px] mt-[14px] flex flex-col gap-[14px] rounded-[26px] bg-surface p-[18px] shadow-card">
      <div className="flex items-center gap-[12px]">
        <span className="flex size-[56px] shrink-0 items-center justify-center rounded-full bg-ochre-100 font-display text-[22px] font-semibold text-granate">
          {initials(tenant.displayName)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[20px] leading-[1.2] font-semibold text-ink">
            {tenant.displayName}
          </div>
          <div className="truncate text-[13px] text-muted">
            Liked your place · {likedAgo(homeId, tenant.id)}
          </div>
        </div>

        {mustBadge && (
          <span className="shrink-0 rounded-chip bg-granate px-[10px] py-[6px] text-[12px] font-bold text-ochre-100">
            {mustBadge}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-[8px]">
        <div className="rounded-[14px] bg-cream px-[12px] py-[10px]">
          <div className="text-[12px] text-muted">Income</div>
          <div className="text-[15px] font-bold text-ink">
            {tenant.facts.monthlyIncomeEur !== undefined
              ? formatEur(tenant.facts.monthlyIncomeEur)
              : "—"}
            {ratio && <span className="ml-[4px] text-[12px] font-medium text-muted">{ratio}</span>}
          </div>
        </div>

        <div className="rounded-[14px] bg-cream px-[12px] py-[10px]">
          <div className="text-[12px] text-muted">Contract</div>
          <div className="text-[15px] font-bold text-ink">
            {tenant.facts.employmentContract
              ? CONTRACT_LABELS[tenant.facts.employmentContract]
              : "—"}
          </div>
        </div>

        <div className="rounded-[14px] bg-cream px-[12px] py-[10px]">
          <div className="text-[12px] text-muted">Moves in</div>
          <div className="text-[15px] font-bold text-ink">{moveInSummary(tenant.facts)}</div>
        </div>

        <div className="rounded-[14px] bg-cream px-[12px] py-[10px]">
          <div className="text-[12px] text-muted">Household</div>
          <div className="text-[15px] font-bold text-ink">{householdSummary(tenant.facts)}</div>
        </div>
      </div>

      {tenant.notes && (
        <p className="text-[14px] leading-[1.45] text-ink-soft italic">“{tenant.notes}”</p>
      )}

      <div className="flex gap-[8px]">
        <button
          type="button"
          disabled={disabled}
          onClick={onDecline}
          className="min-h-[50px] flex-1 rounded-btn border-[1.5px] border-stone bg-surface text-[15px] font-bold text-ink transition-colors active:bg-cream disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onAccept}
          className="min-h-[50px] flex-[1.4] rounded-btn border-0 bg-granate text-[15px] font-bold text-white transition-colors active:bg-granate-700 disabled:opacity-50"
        >
          Accept · open chat
        </button>
      </div>
    </div>
  );
}

export function InterestedScreen() {
  const session = useSession("home");
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());

  const [byHome, setByHome] = useState<Record<string, FeedItem[]>>({});
  const [loadedHomes, setLoadedHomes] = useState<Record<string, Profile>>({});
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right">("left");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ item: FeedItem; matchId: string } | null>(null);

  const homeId = session
    ? session.role === "home"
      ? session.profileId
      : demoLandlord.homeIds[0]!
    : null;

  useEffect(() => {
    if (!homeId) return;
    let cancelled = false;

    const loadHomeProfile = async () => {
      if (peekProfile(homeId)) return;
      try {
        const profile = await getProfile(homeId);
        if (!cancelled) {
          setLoadedHomes((prev) => ({ ...prev, [homeId]: profile }));
        }
      } catch {
        // best effort
      }
    };

    const loadInterested = async () => {
      try {
        const items = await getInterested(homeId);
        if (!cancelled) {
          setByHome((prev) => ({ ...prev, [homeId]: items }));
        }
      } catch {
        // best effort
      }
    };

    void loadHomeProfile();
    void loadInterested();
    const timer = setInterval(loadInterested, MATCH_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [homeId]);

  if (!session || !homeId) {
    return <div className="absolute inset-0 bg-cream" />;
  }

  const listingIds = demoLandlord.homeIds.includes(homeId)
    ? demoLandlord.homeIds
    : [homeId, ...demoLandlord.homeIds];

  const currentHome = peekProfile(homeId) ?? loadedHomes[homeId] ?? null;
  const currentPhoto = currentHome?.photoUrls[0];
  const items = byHome[homeId];
  const loading = items === undefined;
  const queue = items ?? [];
  const topItem = queue[0];
  const topTenant = topItem?.profile.role === "tenant" ? topItem.profile : null;

  const subtitle = loading
    ? "Checking who fits your must-haves…"
    : queue.length === 1
      ? "1 person already fits your must-haves"
      : queue.length > 1
        ? `${queue.length} people already fit your must-haves`
        : "Everyone here already fits your must-haves";

  const handleSelectHome = (nextId: string) => {
    setSelectorOpen(false);
    if (nextId !== homeId) {
      setSession({ profileId: nextId, role: "home" });
    }
  };

  const handleDecision = async (tenantId: string, accept: boolean) => {
    if (busyId) return;
    setExitDirection(accept ? "right" : "left");
    setBusyId(tenantId);

    try {
      const { match } = await swipe(homeId, tenantId, accept);
      setByHome((prev) => ({
        ...prev,
        [homeId]: (prev[homeId] ?? []).filter((item) => item.profile.id !== tenantId),
      }));
      if (accept && match) {
        const matchId = matchIdFor(tenantId, homeId);
        markMatchSeen(matchId);
        setCelebration({ item: match, matchId });
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="no-scrollbar absolute inset-0 overflow-y-auto bg-cream pb-[106px]">
        <header className="px-[20px] pt-[26px]">
          <h1 className="font-display text-[32px] leading-[1.15] font-semibold text-ink">
            Interested
          </h1>
          <p className="mt-[2px] text-[14px] text-muted">{subtitle}</p>
        </header>

        <div className="relative mx-[20px] mt-[12px]">
          <button
            type="button"
            onClick={() => setSelectorOpen((open) => !open)}
            aria-expanded={selectorOpen}
            aria-haspopup="listbox"
            className="inline-flex min-h-[40px] items-center gap-[8px] rounded-full border border-stone bg-surface pr-[12px] pl-[6px] text-[13px] font-semibold text-ink transition-colors active:bg-surface-2"
          >
            <span className="relative flex size-[28px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-granate-50">
              {currentPhoto ? (
                <Image src={currentPhoto} alt="" fill sizes="28px" className="object-cover" />
              ) : (
                <HouseOutlineIcon size={14} color="#7C1D2E" strokeWidth={2.2} />
              )}
            </span>
            <span className="max-w-[240px] truncate">
              {currentHome?.displayName ?? "Your listing"}
            </span>
            <ChevronDownIcon
              size={14}
              color="#241A1C"
              className={`shrink-0 transition-transform ${selectorOpen ? "rotate-180" : ""}`}
            />
          </button>

          {selectorOpen && (
            <>
              <button
                type="button"
                aria-label="Close listing menu"
                onClick={() => setSelectorOpen(false)}
                className="fixed inset-0 z-10 cursor-default border-0 bg-transparent"
              />
              <div
                role="listbox"
                aria-label="Choose listing"
                className="absolute top-[46px] left-0 z-20 w-[290px] overflow-hidden rounded-[18px] border border-line bg-surface p-[6px] shadow-card"
              >
                {listingIds.map((id) => {
                  const home = peekProfile(id) ?? loadedHomes[id];
                  const photo = home?.photoUrls[0];
                  const active = id === homeId;
                  const rent = home?.role === "home" ? home.facts.monthlyRentEur : undefined;

                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => handleSelectHome(id)}
                      className={`flex w-full items-center gap-[10px] rounded-[12px] px-[10px] py-[8px] text-left transition-colors ${
                        active ? "bg-cream" : "hover:bg-surface-2"
                      }`}
                    >
                      <span className="relative flex size-[32px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-granate-50">
                        {photo ? (
                          <Image src={photo} alt="" fill sizes="32px" className="object-cover" />
                        ) : (
                          <HouseOutlineIcon size={16} color="#7C1D2E" strokeWidth={2} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">
                          {home?.displayName ?? id}
                        </span>
                        {rent !== undefined && (
                          <span className="block text-[12px] text-muted">{formatEur(rent)}/mo</span>
                        )}
                      </span>
                      {active && <CheckIcon size={15} color="#7C1D2E" strokeWidth={2.8} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <AnimatePresence
            mode="popLayout"
            custom={{ direction: exitDirection, reduced }}
          >
            {topTenant ? (
              <motion.div
                key={`${homeId}:${topTenant.id}`}
                custom={{ direction: exitDirection, reduced }}
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <TenantCard
                  tenant={topTenant}
                  home={currentHome}
                  homeId={homeId}
                  disabled={busyId === topTenant.id}
                  onDecline={() => void handleDecision(topTenant.id, false)}
                  onAccept={() => void handleDecision(topTenant.id, true)}
                />
              </motion.div>
            ) : !loading ? (
              <motion.div
                key="empty"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : SPRING}
                className="mt-[44px] flex flex-col items-center px-[32px] text-center"
              >
                <Homie mood="sleep" size={140} />
                <div className="mt-[12px] font-display text-[22px] font-semibold text-ink">
                  No one new yet
                </div>
                <p className="mt-[6px] text-[14px] leading-[1.45] text-muted">
                  When someone who fits your must-haves likes this home, they’ll appear right here.
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {queue.length > 1 && (
            <div
              aria-hidden="true"
              className="mx-[24px] mt-[10px] h-[40px] rounded-b-card bg-surface/60"
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {celebration && (
          <MatchCelebration
            item={celebration.item}
            viewer={currentHome}
            side="landlord"
            onSayHi={() => {
              const target = celebration.matchId;
              setCelebration(null);
              router.push(`/chat/${encodeURIComponent(target)}`);
            }}
            onClose={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
