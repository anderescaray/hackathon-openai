"use client";

import Image from "next/image";
import { useEffect, type MouseEvent, type RefObject } from "react";

import type { HomeProfile } from "@/domain/profile";

import type { FitResult } from "@/app/_lib/fit";
import { Homie } from "@/app/_ui/homie/Homie";

import { HomeDetails } from "./HomeDetails";

/**
 * Scroll pages: 0 = first photo with the summary sheet, 1 = the same first photo full screen (sheet hidden),
 * 2… = the other photos, last = HomeDetails. The first photo has two snap stops and stays still between them.
 */
export function photoIndexForPage(page: number): number {
  return Math.max(0, page - 1);
}

export function scrollPageCount(photoCount: number): number {
  return Math.max(1, photoCount) + 2;
}

type PhotoPagerProps = {
  home: HomeProfile;
  fit: FitResult;
  preload?: boolean;
  activePage: number;
  onPageChange: (page: number) => void;
  onTapPhoto: (event: MouseEvent<HTMLDivElement>) => void;
  scrollerRef: RefObject<HTMLDivElement | null>;
};

export function PhotoPager({
  home,
  fit,
  preload = false,
  activePage,
  onPageChange,
  onTapPhoto,
  scrollerRef,
}: PhotoPagerProps) {
  const photos = home.photoUrls;
  const totalPages = scrollPageCount(photos.length);
  const firstHeight = activePage === 0 ? "560px" : "100%";

  // Mouse wheel / trackpad: one gesture = one step (hide sheet → photo 2 → … → details), so it behaves the same
  // in every browser regardless of snap heuristics. Inside the details page, normal scrolling.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let lockedUntil = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      const page = el.clientHeight;
      const lastStart = (totalPages - 1) * page;
      const inDetails = el.scrollTop >= lastStart - 2;
      if (inDetails && (event.deltaY > 0 || el.scrollTop > lastStart + 2)) return;
      event.preventDefault();
      const now = performance.now();
      if (now < lockedUntil || Math.abs(event.deltaY) < 4) return;
      lockedUntil = now + 550;
      const current = Math.round(el.scrollTop / page);
      const next = Math.max(0, Math.min(totalPages - 1, current + (event.deltaY > 0 ? 1 : -1)));
      el.scrollTo({ top: next * page, behavior: "smooth" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollerRef, totalPages]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientHeight === 0) return;
    const rawPage = Math.round(el.scrollTop / el.clientHeight);
    const clamped = Math.max(0, Math.min(totalPages - 1, rawPage));
    if (clamped !== activePage) {
      onPageChange(clamped);
    }
  };

  return (
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      className="no-scrollbar absolute inset-0 snap-y snap-mandatory overflow-y-auto bg-cream"
    >
      {photos.length > 0 ? (
        photos.map((url, idx) =>
          idx === 0 ? (
            // Two screens tall: snap stops at 0 (with sheet) and 100% (sheet hidden); the photo stays sticky.
            <div key={`${url}-${idx}`} className="relative h-[200%] w-full shrink-0 bg-cream">
              <div className="absolute inset-x-0 top-0 h-1/2 snap-start" aria-hidden="true" />
              <div className="absolute inset-x-0 top-1/2 h-1/2 snap-start" aria-hidden="true" />
              <div className="sticky top-0 h-1/2 w-full">
                <div
                  onClick={onTapPhoto}
                  style={{ height: firstHeight }}
                  className="relative w-full cursor-pointer overflow-hidden bg-track/40 transition-[height] duration-300 ease-out"
                >
                  <Image
                    src={url}
                    alt={`${home.displayName} — photo 1 of ${photos.length}`}
                    fill
                    sizes="390px"
                    preload={preload}
                    draggable={false}
                    className="pointer-events-none select-none object-cover"
                  />
                </div>
              </div>
            </div>
          ) : (
          <div key={`${url}-${idx}`} className="relative h-full w-full shrink-0 snap-start bg-cream">
            <div
              onClick={onTapPhoto}
              className="relative h-full w-full cursor-pointer overflow-hidden bg-track/40"
            >
              <Image
                src={url}
                alt={`${home.displayName} — photo ${idx + 1} of ${photos.length}`}
                fill
                sizes="390px"
                draggable={false}
                className="pointer-events-none select-none object-cover"
              />
            </div>
          </div>
          ),
        )
      ) : (
        <div className="relative h-full w-full shrink-0 snap-start bg-cream">
          <div
            onClick={onTapPhoto}
            className="flex h-[560px] w-full cursor-pointer flex-col items-center justify-center gap-3 bg-house-wall pb-[80px]"
          >
            <Homie mood="idle" size={110} />
            <p className="text-[14px] text-muted">Photos coming soon</p>
          </div>
        </div>
      )}

      <div className="min-h-full w-full shrink-0 snap-start bg-cream">
        <HomeDetails home={home} fit={fit} />
      </div>
    </div>
  );
}
