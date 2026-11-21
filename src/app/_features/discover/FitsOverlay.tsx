"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";

import type { HomeProfile } from "@/domain/profile";

import { countOk, type FitResult } from "@/app/_lib/fit";

import { CheckIcon, CrossIcon, ShieldCheckIcon } from "./icons";

const OVERLAY_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

type FitsOverlayProps = {
  home: HomeProfile;
  fit: FitResult;
  photoUrl: string | undefined;
  onClose: () => void;
};

export function FitsOverlay({ home, fit, photoUrl, onClose }: FitsOverlayProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const mustsOk = countOk(fit.musts);
  const niceOk = countOk(fit.nice);
  const theyOk = countOk(fit.theyRequire);
  const transition = prefersReducedMotion ? { duration: 0.15 } : OVERLAY_SPRING;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Fits you ${mustsOk} of ${fit.musts.length}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
      className="absolute inset-0 z-20 cursor-pointer bg-cream"
    >
      {/* Top photo shrinks to 300px */}
      <motion.div
        initial={prefersReducedMotion ? { height: 300 } : { height: 560 }}
        animate={{ height: 300 }}
        exit={prefersReducedMotion ? { height: 300 } : { height: 560 }}
        transition={transition}
        className="absolute inset-x-0 top-0 overflow-hidden bg-track/40"
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={home.displayName}
            fill
            sizes="390px"
            draggable={false}
            className="pointer-events-none select-none object-cover"
          />
        ) : (
          <div className="h-full w-full bg-house-wall" />
        )}
      </motion.div>

      {/* Logo pill (Phone 2 shows only the left homie pill) */}
      <div className="pointer-events-none absolute top-[20px] left-[20px] z-10">
        <span className="inline-block rounded-full bg-cream/94 px-[14px] py-[6px] font-display text-[24px] font-semibold leading-[1.2] text-granate">
          homie
        </span>
      </div>

      {/* Sheet slides up from 420px to 190px */}
      <motion.div
        initial={prefersReducedMotion ? { top: 190, opacity: 0 } : { top: 420 }}
        animate={prefersReducedMotion ? { top: 190, opacity: 1 } : { top: 190 }}
        exit={prefersReducedMotion ? { top: 190, opacity: 0 } : { top: 420 }}
        transition={transition}
        className="no-scrollbar absolute inset-x-[12px] bottom-[108px] flex flex-col gap-[14px] overflow-y-auto rounded-sheet bg-surface px-[20px] py-[22px] shadow-sheet"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-[26px] font-semibold leading-[1.15] text-ink">
            Fits you{" "}
            <span className="text-granate">
              {mustsOk}/{fit.musts.length}
            </span>
          </h2>
          <span className="text-[12px] text-subtle">tap to close</span>
        </div>

        {fit.musts.length > 0 && (
          <div className="flex flex-col gap-[10px] text-[15px]">
            {fit.musts.map((check) => (
              <div key={`fit-must-${check.field}-${check.label}`} className="flex items-center gap-[12px]">
                <span
                  className={`flex size-[22px] flex-none items-center justify-center rounded-[7px] ${
                    check.ok ? "bg-granate text-white" : "bg-line text-muted"
                  }`}
                >
                  {check.ok ? <CheckIcon size={12} /> : <CrossIcon size={11} />}
                </span>
                <span className="flex-1 text-ink">{check.label}</span>
                <span className="text-muted">{check.value}</span>
              </div>
            ))}
          </div>
        )}

        {fit.nice.length > 0 && (
          <div className="flex flex-col gap-[8px] rounded-tile bg-cream p-[14px]">
            <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted">
              Nice to have &middot; {niceOk} of {fit.nice.length}
            </div>
            <div className="flex flex-wrap gap-[6px]">
              {fit.nice.map((check) =>
                check.ok ? (
                  <span
                    key={`fit-nice-${check.field}-${check.label}`}
                    className="rounded-chip bg-surface px-[10px] py-[6px] text-[13px] font-semibold text-ink"
                  >
                    {check.label}
                  </span>
                ) : (
                  <span
                    key={`fit-nice-${check.field}-${check.label}`}
                    className="rounded-chip px-[10px] py-[6px] text-[13px] text-subtle line-through"
                  >
                    {check.label}
                  </span>
                ),
              )}
            </div>
          </div>
        )}

        {fit.theyRequire.length > 0 && (
          <div className="flex items-center gap-[12px] rounded-tile bg-granate p-[14px] text-cream">
            <ShieldCheckIcon className="shrink-0" />
            <div className="text-[13px] leading-[1.35]">
              <div className="font-bold">
                {theyOk === fit.theyRequire.length
                  ? "You fit the landlord’s must-haves too"
                  : `You fit ${theyOk} of ${fit.theyRequire.length} landlord must-haves`}
              </div>
              <div>{fit.theyRequire.map((c) => c.label).join(" · ")}</div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
