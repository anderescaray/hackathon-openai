"use client";

import Image from "next/image";
import type { MouseEvent, RefObject } from "react";

import type { HomeProfile } from "@/domain/profile";

import type { FitResult } from "@/app/_lib/fit";
import { Homie } from "@/app/_ui/homie/Homie";

import { HomeDetails } from "./HomeDetails";

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
  const photoSlideCount = Math.max(1, photos.length);
  const totalPages = photoSlideCount + 1;

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
        photos.map((url, idx) => (
          <div key={`${url}-${idx}`} className="relative h-full w-full shrink-0 snap-start bg-cream">
            <div
              onClick={onTapPhoto}
              className="relative h-[560px] w-full cursor-pointer overflow-hidden bg-track/40"
            >
              <Image
                src={url}
                alt={`${home.displayName} — photo ${idx + 1} of ${photos.length}`}
                fill
                sizes="390px"
                preload={preload && idx === 0}
                draggable={false}
                className="pointer-events-none select-none object-cover"
              />
            </div>
          </div>
        ))
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
