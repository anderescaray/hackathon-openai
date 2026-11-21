"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import type { FeedItem, Profile } from "@/domain/profile";

import { landlordNameFor } from "../../_lib/api";
import { countOk, evaluateRequirements } from "../../_lib/fit";
import { initials } from "../../_lib/format";
import { Homie } from "../../_ui/homie/Homie";
import { CheckIcon, HouseOutlineIcon } from "../inbox/icons";

export type MatchCelebrationProps = {
  /** the other side: a home (tenant view) or a tenant (landlord view) */
  item: FeedItem;
  /** who is looking; null while loading */
  viewer: Profile | null;
  side: "tenant" | "landlord";
  /** go to /chat/<matchId> */
  onSayHi(): void;
  /** "Keep discovering" / close */
  onClose(): void;
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

export function MatchCelebration({ item, viewer, side, onSayHi, onClose }: MatchCelebrationProps) {
  const reduced = useReducedMotion();

  const home = side === "tenant" ? item.profile : viewer;
  const tenant = side === "tenant" ? viewer : item.profile;

  const landlordName = home ? landlordNameFor(home.id) : "the landlord";
  const otherPersonName = side === "tenant" ? landlordName : item.profile.displayName;
  const homePhoto = home?.photoUrls[0];
  const tenantInitials = initials(tenant?.displayName ?? "You");

  const reasons: string[] = (() => {
    if (viewer) {
      const fit = evaluateRequirements(viewer, item.profile);
      const list: string[] = [];
      if (fit.musts.length > 0) {
        const ok = countOk(fit.musts);
        list.push(
          ok === fit.musts.length
            ? `Fits all ${fit.musts.length} of your must-haves`
            : `Fits ${ok} of ${fit.musts.length} of your must-haves`,
        );
      }
      if (fit.theyRequire.length > 0) {
        const ok = countOk(fit.theyRequire);
        list.push(
          ok === fit.theyRequire.length
            ? `You fit all ${fit.theyRequire.length} of ${otherPersonName}’s`
            : `You fit ${ok} of ${fit.theyRequire.length} of ${otherPersonName}’s`,
        );
      }
      if (list.length > 0) return list;
    }
    return item.reasons.length > 0 ? item.reasons : ["Must-haves met on both sides"];
  })();

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="It’s a match"
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="no-scrollbar absolute inset-0 z-50 flex flex-col items-center overflow-y-auto bg-granate text-cream"
    >
      <motion.div
        initial={reduced ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.05 }}
        className="relative mt-[56px] shrink-0"
      >
        <Homie mood="wink" disc size={230} />
      </motion.div>

      <motion.h1
        initial={reduced ? false : { y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.14 }}
        className="mt-[6px] font-display text-[40px] leading-[1.1] font-semibold tracking-[-0.5px]"
      >
        It’s a match
      </motion.h1>

      <motion.p
        initial={reduced ? false : { y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 0.85 }}
        transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.2 }}
        className="mt-[6px] px-[40px] text-center text-[15px] leading-[1.4]"
      >
        {side === "tenant" ? (
          <>
            {landlordName} accepted you for <b className="font-bold">{item.profile.displayName}</b>
          </>
        ) : (
          <>
            You and <b className="font-bold">{item.profile.displayName}</b> both said yes
          </>
        )}
      </motion.p>

      <motion.div
        initial={reduced ? false : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.26 }}
        className="mt-[20px] flex items-center"
      >
        <div className="relative flex size-[64px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-cream bg-granate-50">
          {homePhoto ? (
            <Image src={homePhoto} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <HouseOutlineIcon size={26} color="#7C1D2E" strokeWidth={2} />
          )}
        </div>
        <span className="relative z-10 -ml-[14px] flex size-[64px] shrink-0 items-center justify-center rounded-full border-[3px] border-cream bg-ochre-300 font-display text-[22px] font-semibold text-ink">
          {tenantInitials}
        </span>
      </motion.div>

      <motion.div
        initial={reduced ? false : { y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.32 }}
        className="mx-[20px] mt-[20px] flex flex-col gap-[8px] self-stretch rounded-[20px] bg-cream/10 p-[16px] text-[14px]"
      >
        {reasons.map((reason, index) => (
          <div key={`${reason}-${index}`} className="flex items-center gap-[10px]">
            <CheckIcon size={16} color="#E2B04A" strokeWidth={3} className="shrink-0" />
            <span>{reason}</span>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={reduced ? false : { y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.38 }}
        className="mt-auto flex flex-col gap-[10px] self-stretch px-[20px] pt-[18px] pb-[30px]"
      >
        <button
          type="button"
          onClick={onSayHi}
          className="min-h-[56px] rounded-tile border-0 bg-ochre-300 text-[16px] font-bold text-ink transition-transform active:scale-[0.98]"
        >
          Say hi to {otherPersonName}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[48px] rounded-tile border-0 bg-transparent text-[15px] font-semibold text-cream/85 transition-opacity hover:text-cream"
        >
          {side === "landlord" ? "Back to interested" : "Keep discovering"}
        </button>
      </motion.div>
    </motion.div>
  );
}
