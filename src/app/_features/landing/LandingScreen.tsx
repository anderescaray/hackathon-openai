"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, KeyRound } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { demoSession, setSession } from "../../_lib/session";
import { Homie } from "../../_ui/homie/Homie";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

function HomeOutlineIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
    </svg>
  );
}

export function LandingScreen() {
  const router = useRouter();
  const reducedMotion = Boolean(useReducedMotion());
  const [showDemo, setShowDemo] = useState(false);

  const itemInitial = reducedMotion ? false : { opacity: 0, y: 12 };
  const itemAnimate = { opacity: 1, y: 0 };

  const enterDemo = (role: "tenant" | "home") => {
    setSession(demoSession(role));
    router.push(role === "tenant" ? "/discover" : "/interested");
  };

  return (
    <div className="no-scrollbar absolute inset-0 flex flex-col overflow-y-auto bg-cream text-ink">
      {/* Top logo */}
      <motion.header
        initial={itemInitial}
        animate={itemAnimate}
        transition={{ ...SPRING, delay: 0 }}
        className="shrink-0 px-[20px] pt-[22px]"
      >
        <span className="font-display text-[24px] font-semibold leading-none text-granate">roomie</span>
      </motion.header>

      {/* Mascot + hero copy */}
      <main className="flex flex-1 flex-col px-[20px]">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ ...SPRING, delay: reducedMotion ? 0 : 0.05 }}
          className="mt-[4px] flex justify-center"
        >
          <Homie mood="wink" size={200} />
        </motion.div>

        <motion.h1
          initial={itemInitial}
          animate={itemAnimate}
          transition={{ ...SPRING, delay: reducedMotion ? 0 : 0.11 }}
          className="font-display mt-[4px] text-center text-[34px] font-semibold leading-[1.08] tracking-[-0.015em] text-ink"
        >
          Find a home that fits — both ways.
        </motion.h1>

        <motion.p
          initial={itemInitial}
          animate={itemAnimate}
          transition={{ ...SPRING, delay: reducedMotion ? 0 : 0.16 }}
          className="mx-auto mt-[10px] max-w-[320px] text-center text-[15px] leading-[1.42] text-muted"
        >
          Talk to Roomie for five minutes. We only show you what fits your must-haves — and theirs.
        </motion.p>

        {/* Role choice buttons */}
        <div className="mt-[22px] flex flex-col gap-[12px]">
          <motion.div
            initial={itemInitial}
            animate={itemAnimate}
            transition={{ ...SPRING, delay: reducedMotion ? 0 : 0.21 }}
            whileTap={reducedMotion ? undefined : { scale: 0.985 }}
          >
            <Link
              href="/interview?role=tenant"
              className="group flex min-h-[72px] items-center gap-[14px] rounded-card bg-surface px-[16px] py-[14px] shadow-card transition-colors hover:bg-surface-2"
            >
              <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-granate-50 text-granate">
                <HomeOutlineIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold leading-[1.2] text-ink">
                  I&apos;m looking for a home
                </span>
                <span className="mt-[3px] block text-[13px] leading-[1.3] text-muted">
                  Tell Roomie what you need
                </span>
              </span>
              <ChevronRight
                className="h-[20px] w-[20px] shrink-0 text-subtle transition-transform group-hover:translate-x-[2px] group-hover:text-granate"
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </Link>
          </motion.div>

          <motion.div
            initial={itemInitial}
            animate={itemAnimate}
            transition={{ ...SPRING, delay: reducedMotion ? 0 : 0.27 }}
            whileTap={reducedMotion ? undefined : { scale: 0.985 }}
          >
            <Link
              href="/interview?role=home"
              className="group flex min-h-[72px] items-center gap-[14px] rounded-card bg-surface px-[16px] py-[14px] shadow-card transition-colors hover:bg-surface-2"
            >
              <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-ochre-100 text-ochre-ink">
                <KeyRound className="h-[22px] w-[22px]" strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold leading-[1.2] text-ink">
                  I&apos;m renting one out
                </span>
                <span className="mt-[3px] block text-[13px] leading-[1.3] text-muted">
                  Describe your place and who fits
                </span>
              </span>
              <ChevronRight
                className="h-[20px] w-[20px] shrink-0 text-subtle transition-transform group-hover:translate-x-[2px] group-hover:text-granate"
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </Link>
          </motion.div>
        </div>

        {/* Demo quick-load */}
        <motion.div
          initial={itemInitial}
          animate={itemAnimate}
          transition={{ ...SPRING, delay: reducedMotion ? 0 : 0.33 }}
          className="mt-auto flex flex-col items-center pb-[24px] pt-[18px]"
        >
          <button
            type="button"
            onClick={() => setShowDemo((open) => !open)}
            aria-expanded={showDemo}
            className="min-h-[36px] px-[12px] text-[13px] font-medium text-subtle underline decoration-dash underline-offset-4 transition-colors hover:text-muted"
          >
            Demo: load a ready profile
          </button>

          <AnimatePresence initial={false}>
            {showDemo && (
              <motion.div
                key="demo-choices"
                initial={reducedMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="mt-[8px] flex flex-wrap items-center justify-center gap-[8px]"
              >
                <button
                  type="button"
                  onClick={() => enterDemo("tenant")}
                  className="min-h-[38px] rounded-full border border-stone bg-surface-2 px-[14px] text-[13px] font-semibold text-granate transition-colors hover:bg-granate-50"
                >
                  Tenant (Laura)
                </button>
                <button
                  type="button"
                  onClick={() => enterDemo("home")}
                  className="min-h-[38px] rounded-full border border-stone bg-surface-2 px-[14px] text-[13px] font-semibold text-granate transition-colors hover:bg-granate-50"
                >
                  Landlord (Marta)
                </button>
                <Link
                  href="/interview-preview?role=tenant"
                  className="flex min-h-[38px] items-center rounded-full border border-stone bg-surface-2 px-[14px] text-[13px] font-semibold text-granate transition-colors hover:bg-granate-50"
                >
                  Interview (no mic)
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
