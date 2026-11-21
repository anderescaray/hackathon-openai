"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, type MouseEvent } from "react";

import type { HomeProfile, Profile } from "@/domain/profile";

import type { FitResult } from "@/app/_lib/fit";
import { formatEur, homeSummary, requirementChip } from "@/app/_lib/format";

import { CheckIcon, SwipeArrowsIcon } from "./icons";
import { PhotoPager, photoIndexForPage } from "./PhotoPager";

const SHEET_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

type HomeCardProps = {
  home: HomeProfile;
  viewer: Profile | null;
  fit: FitResult;
  preload?: boolean;
  activePage: number;
  onPageChange: (page: number) => void;
  onTapPhoto: (event: MouseEvent<HTMLElement>) => void;
};

export function HomeCard({
  home,
  viewer,
  fit,
  preload = false,
  activePage,
  onPageChange,
  onTapPhoto,
}: HomeCardProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;

  const photoSlideCount = Math.max(1, home.photoUrls.length);
  // Dots: one per photo + one for details. Scroll pages have an extra stop on photo 1 (see PhotoPager).
  const totalPages = photoSlideCount + 1;
  const isDetailsPage = activePage >= photoSlideCount + 1;
  const activeDot = isDetailsPage ? photoSlideCount : photoIndexForPage(activePage);
  // The summary sheet shows only before the first scroll; the first scroll hides it and keeps photo 1.
  const showSheet = activePage === 0;

  const summary = homeSummary(home.facts);

  // Build chips from the viewer's met must-haves (matching evaluateRequirements order).
  const viewerMustReqs = viewer ? viewer.requirements.filter((r) => r.isMust) : [];
  const metMustChips = viewerMustReqs
    .filter((_, idx) => fit.musts[idx]?.ok)
    .map((req) => requirementChip(req, home.facts as Record<string, unknown>));

  const visibleChips = metMustChips.slice(0, 2);
  const remainingMustCount = Math.max(0, metMustChips.length - visibleChips.length);

  const scrollToPage = (dotIndex: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const pageIndex = dotIndex === 0 ? 0 : dotIndex + 1;
    el.scrollTo({
      top: pageIndex * el.clientHeight,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-cream">
      <PhotoPager
        home={home}
        fit={fit}
        preload={preload}
        activePage={activePage}
        onPageChange={onPageChange}
        onTapPhoto={onTapPhoto}
        scrollerRef={scrollerRef}
      />

      {/* Vertical page indicators (photos + details) */}
      <div
        className="absolute top-[180px] right-[14px] z-10 flex flex-col gap-[6px]"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {Array.from({ length: totalPages }, (_, idx) => {
          const isActive = idx === activeDot;
          const isDetailsDot = idx === totalPages - 1;
          return (
            <button
              key={idx}
              type="button"
              aria-label={isDetailsDot ? "Home details" : `Photo ${idx + 1} of ${photoSlideCount}`}
              aria-current={isActive ? "step" : undefined}
              onClick={() => scrollToPage(idx)}
              className={`w-[6px] rounded-[3px] transition-all duration-200 ${
                isActive ? "h-[22px]" : "h-[6px]"
              } ${
                isDetailsPage
                  ? isActive
                    ? "bg-granate"
                    : "bg-granate/30"
                  : isActive
                    ? "bg-white shadow-[0_1px_4px_rgba(36,26,28,0.32)]"
                    : "bg-white/60 shadow-[0_1px_3px_rgba(36,26,28,0.22)]"
              }`}
            />
          );
        })}
      </div>

      {/* Floating white summary sheet (moves away on the HomeDetails page) */}
      <motion.div
        initial={false}
        animate={showSheet ? { y: 0, opacity: 1 } : { y: 440, opacity: 0 }}
        transition={prefersReducedMotion ? { duration: 0.15 } : SHEET_SPRING}
        className={`absolute inset-x-[12px] top-[min(420px,calc(100%-330px))] bottom-[108px] z-10 flex flex-col gap-[12px] rounded-sheet bg-surface p-[20px] shadow-sheet ${
          showSheet ? "" : "pointer-events-none"
        }`}
      >
        <div className="flex items-start justify-between gap-[12px]">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-semibold leading-[1.1] text-ink">{home.displayName}</h1>
            {summary && <p className="mt-[4px] text-[14px] text-muted">{summary}</p>}
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-[26px] font-semibold leading-[1.1] text-granate">
              {home.facts.monthlyRentEur !== undefined ? formatEur(home.facts.monthlyRentEur) : "—"}
            </div>
            <div className="text-[12px] text-muted">per month</div>
          </div>
        </div>

        {visibleChips.length > 0 && (
          <div onClick={onTapPhoto} className="flex cursor-pointer flex-wrap gap-[6px]">
            {visibleChips.map((chip, idx) => (
              <span
                key={`${chip}-${idx}`}
                className="inline-flex items-center gap-[5px] rounded-chip bg-granate-50 px-[10px] py-[6px] text-[13px] font-semibold text-granate"
              >
                <CheckIcon stroke="#7C1D2E" size={12} />
                {chip}
              </span>
            ))}
            {remainingMustCount > 0 && (
              <span className="inline-flex items-center gap-[5px] rounded-chip bg-granate-50 px-[10px] py-[6px] text-[13px] font-semibold text-granate">
                +{remainingMustCount} {remainingMustCount === 1 ? "must-have" : "must-haves"}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center gap-[8px] text-[12px] text-subtle">
          <SwipeArrowsIcon />
          <span>Swipe to decide &middot; scroll for photos</span>
        </div>
      </motion.div>
    </div>
  );
}
