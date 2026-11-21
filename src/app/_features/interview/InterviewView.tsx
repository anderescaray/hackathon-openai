"use client";

import { MicOff } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { HomeFacts, Profile, Role, TenantFacts } from "@/domain/profile";

import {
  HOME_FACT_LABELS,
  REQUIREMENT_FIELD_LABELS,
  TENANT_FACT_LABELS,
  formatFactValue,
  requirementValue,
} from "../../_lib/format";
import { Homie, type HomieMood } from "../../_ui/homie/Homie";
import type { InterviewViewProps } from "./types";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

const TENANT_FACT_ORDER: (keyof TenantFacts)[] = [
  "monthlyIncomeEur",
  "employmentContract",
  "occupants",
  "hasPets",
  "smokes",
  "moveInDate",
  "stayMonths",
];

const HOME_FACT_ORDER: (keyof HomeFacts)[] = [
  "monthlyRentEur",
  "district",
  "rentalType",
  "bedrooms",
  "sizeM2",
  "furnished",
  "availableFrom",
];

const TENANT_REQ_ORDER: (keyof HomeFacts)[] = [
  "monthlyRentEur",
  "district",
  "rentalType",
  "availableFrom",
  "furnished",
  "bedrooms",
  "sizeM2",
];

const HOME_REQ_ORDER: (keyof TenantFacts)[] = [
  "employmentContract",
  "smokes",
  "stayMonths",
  "monthlyIncomeEur",
  "hasPets",
  "occupants",
];

type CardItem = {
  id: string;
  field: string;
  label: string;
  value: string;
  isMust: boolean;
  kind: "fact" | "requirement";
};

function buildCards(profile: Profile): {
  factCards: CardItem[];
  requirementCards: CardItem[];
  totalFacts: number;
} {
  const factCards: CardItem[] = [];

  if (profile.role === "tenant") {
    for (const key of TENANT_FACT_ORDER) {
      const value = profile.facts[key];
      if (value !== undefined && value !== null) {
        factCards.push({
          id: `fact-${key}`,
          field: key,
          label: TENANT_FACT_LABELS[key],
          value: formatFactValue(key, value),
          isMust: false,
          kind: "fact",
        });
      }
    }
  } else {
    for (const key of HOME_FACT_ORDER) {
      const value = profile.facts[key];
      if (value !== undefined && value !== null) {
        factCards.push({
          id: `fact-${key}`,
          field: key,
          label: HOME_FACT_LABELS[key],
          value: formatFactValue(key, value),
          isMust: false,
          kind: "fact",
        });
      }
    }
  }

  const requirementCards: CardItem[] = profile.requirements.map((req, index) => {
    const fieldLabel = REQUIREMENT_FIELD_LABELS[req.field] ?? req.field;
    return {
      id: `req-${req.field}-${req.operator}-${index}`,
      field: req.field,
      label: `${fieldLabel} · ${req.isMust ? "must" : "nice"}`,
      value: requirementValue(req),
      isMust: req.isMust,
      kind: "requirement",
    };
  });

  return {
    factCards,
    requirementCards,
    totalFacts: profile.role === "tenant" ? TENANT_FACT_ORDER.length : HOME_FACT_ORDER.length,
  };
}

function getNextSlotLabel(
  role: Role,
  phase: InterviewViewProps["phase"],
  profile: Profile,
): string | null {
  if (phase === "facts") {
    if (role === "tenant" && profile.role === "tenant") {
      const missing = TENANT_FACT_ORDER.find((key) => profile.facts[key] === undefined);
      return missing ? `${TENANT_FACT_LABELS[missing]}…` : "Must-haves…";
    }
    if (role === "home" && profile.role === "home") {
      const missing = HOME_FACT_ORDER.find((key) => profile.facts[key] === undefined);
      return missing ? `${HOME_FACT_LABELS[missing]}…` : "Must-haves…";
    }
  }

  if (phase === "requirements") {
    const existing = new Set<string>(profile.requirements.map((r) => r.field));
    const reqOrder: string[] = role === "tenant" ? TENANT_REQ_ORDER : HOME_REQ_ORDER;
    const missingReq = reqOrder.find((field) => !existing.has(field));
    if (missingReq) {
      return `${REQUIREMENT_FIELD_LABELS[missingReq] ?? missingReq}…`;
    }
    if (!profile.notes) {
      return "Personal note…";
    }
  }

  return null;
}

function StepHeader({ role, phase }: { role: Role; phase: InterviewViewProps["phase"] }) {
  const stepTwoActive = phase === "requirements" || phase === "done";
  const [stepOneLabel, stepTwoLabel] =
    role === "tenant"
      ? ["About you", "What you're after"]
      : ["Your place", "Who you're looking for"];

  return (
    <header className="shrink-0 px-[20px] pt-[22px]">
      <div className="flex items-center justify-between">
        <span className="font-display text-[24px] font-semibold leading-none text-granate">homie</span>
        <div
          className="flex items-center gap-[5px]"
          aria-label={stepTwoActive ? "Step 2 of 2" : "Step 1 of 2"}
        >
          <span className="h-[6px] w-[26px] rounded-[3px] bg-granate transition-colors duration-300" />
          <span
            className={`h-[6px] w-[26px] rounded-[3px] transition-colors duration-300 ${
              stepTwoActive ? "bg-granate" : "bg-track"
            }`}
          />
        </div>
      </div>
      <div className="mt-[6px] flex items-center gap-[6px] text-[12px] text-subtle">
        <span className={!stepTwoActive ? "font-semibold text-ink" : undefined}>{stepOneLabel}</span>
        <span aria-hidden="true">→</span>
        <span className={stepTwoActive ? "font-semibold text-ink" : undefined}>{stepTwoLabel}</span>
      </div>
    </header>
  );
}

function MicIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" />
    </svg>
  );
}

function InterviewCard({
  card,
  isJustSaved,
  compact,
  reducedMotion,
}: {
  card: CardItem;
  isJustSaved: boolean;
  compact: boolean;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={SPRING}
      className={`relative ${compact ? "rounded-[16px] p-[11px]" : "rounded-tile p-[14px]"} ${
        card.isMust ? "bg-granate text-white" : "bg-surface text-ink"
      }`}
    >
      {isJustSaved && !reducedMotion && (
        <motion.span
          key={`${card.id}-${card.value}`}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${compact ? "rounded-[16px]" : "rounded-tile"}`}
          initial={{ boxShadow: "0 0 0 3px #E2B04A", opacity: 1 }}
          animate={{ boxShadow: "0 0 0 3px rgba(226, 176, 74, 0)", opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      )}

      {card.isMust && (
        <motion.span
          initial={reducedMotion ? false : { scale: 1.4, opacity: 0, rotate: -14 }}
          animate={{ scale: 1, opacity: 1, rotate: -8 }}
          transition={SPRING}
          className={`pointer-events-none absolute right-[10px] top-[10px] rounded-[5px] border border-ochre-300/80 bg-granate-700/75 px-[6px] py-[2px] text-[9px] font-extrabold uppercase leading-none tracking-[0.08em] text-ochre-300`}
        >
          MUST
        </motion.span>
      )}

      <div
        className={`${compact ? "text-[11px]" : "text-[12px]"} ${
          card.isMust ? "pr-[44px] text-white/85" : "text-muted"
        }`}
      >
        {card.label}
      </div>
      <div
        className={`font-display mt-[4px] font-semibold leading-[1.2] break-words ${
          compact ? "text-[17px]" : "text-[20px]"
        }`}
      >
        {card.value}
      </div>
    </motion.div>
  );
}

export function InterviewView(props: InterviewViewProps) {
  const {
    role,
    status,
    phase,
    profile,
    speaker,
    agentLine,
    userLine,
    justSaved,
    muted = false,
    onStart,
    onEnd,
    onToggleMute,
    onTypeInstead,
    onContinue,
  } = props;

  const reducedMotion = Boolean(useReducedMotion());
  const { factCards, requirementCards, totalFacts } = buildCards(profile);
  const justSavedSet = new Set(justSaved ?? []);

  const isFinished = status === "finished" || phase === "done";

  if (isFinished) {
    const summaryCards = [...requirementCards, ...factCards];
    const ctaLabel = role === "tenant" ? "See your 5 homes" : "See who's interested";
    const readyNote =
      role === "tenant"
        ? "We'll only show you homes that fit your must-haves."
        : "We'll only send you tenants who fit your must-haves.";

    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden bg-cream text-ink">
        <StepHeader role={role} phase="done" />

        <div className="flex shrink-0 flex-col items-center px-[20px] pt-[12px] text-center">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={SPRING}
          >
            <Homie mood="wink" size={150} />
          </motion.div>
          <motion.h1
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: reducedMotion ? 0 : 0.06 }}
            className="font-display mt-[2px] text-[32px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink"
          >
            Your card is ready
          </motion.h1>
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: reducedMotion ? 0 : 0.1 }}
            className="mt-[6px] max-w-[290px] text-[14px] leading-[1.35] text-muted"
          >
            {readyNote}
          </motion.p>
        </div>

        <div className="no-scrollbar mt-[14px] min-h-0 flex-1 overflow-y-auto px-[14px] pb-[12px]">
          {summaryCards.length > 0 ? (
            <div className="grid grid-cols-2 gap-[8px]">
              {summaryCards.map((card) => (
                <InterviewCard
                  key={card.id}
                  card={card}
                  isJustSaved={false}
                  compact
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-tile border-[1.5px] border-dashed border-dash p-[16px] text-center text-[13px] text-subtle">
              No details saved yet — you can fill your card anytime.
            </div>
          )}

          {profile.notes.trim().length > 0 && (
            <div className="mt-[8px] rounded-[16px] bg-surface p-[13px] text-[13px] leading-[1.4] text-ink-soft">
              “{profile.notes}”
            </div>
          )}
        </div>

        <div className="shrink-0 px-[20px] pb-[28px] pt-[10px]">
          <button
            type="button"
            onClick={onContinue}
            className="min-h-[56px] w-full rounded-tile bg-granate px-[20px] text-[16px] font-bold text-white shadow-fab transition-colors active:bg-granate-700"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    );
  }

  const homieMood: HomieMood =
    speaker === "agent" ? "speaking" : speaker === "user" ? "listening" : "idle";

  const filledCount = factCards.length + requirementCards.length;
  const totalTarget = totalFacts + requirementCards.length;
  const nextSlotLabel = getNextSlotLabel(role, phase, profile);

  const showRequirementsFirst = phase === "requirements" || requirementCards.length > 0;
  const showThinkingDots = !agentLine && (status === "connecting" || status === "live");
  const isIdleOrFailed = status === "idle" || status === "failed";

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-cream text-ink">
      <StepHeader role={role} phase={phase} />

      {/* Homie + speech bubble */}
      <div className="flex shrink-0 items-end gap-[8px] px-[16px] pt-[10px]">
        <Homie mood={homieMood} size={132} />
        <div className="mb-[58px] min-w-0 flex-1 rounded-[20px] rounded-bl-[6px] bg-surface px-[16px] py-[14px] shadow-bubble">
          <div className="flex items-center gap-[6px] text-[11px] font-bold uppercase tracking-[0.06em] text-granate">
            <span className="h-[7px] w-[7px] shrink-0 rounded-[4px] bg-ochre" />
            Homie asks
          </div>
          <AnimatePresence mode="wait">
            {agentLine ? (
              <motion.div
                key={agentLine}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="font-display mt-[4px] text-[19px] font-semibold leading-[1.2] text-ink"
              >
                {agentLine}
              </motion.div>
            ) : showThinkingDots ? (
              <motion.div
                key="thinking"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0 }}
                className="font-display mt-[4px] text-[19px] font-semibold leading-[1.2] text-subtle"
                aria-label="Homie is thinking"
              >
                …
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* User transcript line */}
      <div className="min-h-[22px] shrink-0 px-[24px] pt-[2px] text-right text-[14px] leading-[1.3] text-muted">
        <AnimatePresence mode="wait">
          {userLine && (
            <motion.p
              key={userLine}
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="m-0"
            >
              “{userLine}”
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Your card header */}
      <div className="flex shrink-0 items-baseline justify-between px-[20px] pb-[8px] pt-[14px]">
        <h2 className="font-display text-[22px] font-semibold leading-tight text-ink">Your card</h2>
        <div className="text-[12px] text-subtle">
          {filledCount} of {totalTarget} · updates live
        </div>
      </div>

      {/* Live 2-column grid (scrolls if long) */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-[12px] py-[4px]">
        <div className="grid grid-cols-2 gap-[8px] pb-[8px]">
          {showRequirementsFirst ? (
            <>
              {requirementCards.map((card) => (
                <InterviewCard
                  key={card.id}
                  card={card}
                  isJustSaved={justSavedSet.has(card.field)}
                  compact={false}
                  reducedMotion={reducedMotion}
                />
              ))}
              {nextSlotLabel && (
                <div className="flex min-h-[76px] items-center justify-center rounded-tile border-[1.5px] border-dashed border-dash p-[14px] text-center text-[13px] text-subtle">
                  {nextSlotLabel}
                </div>
              )}
              {factCards.map((card) => (
                <InterviewCard
                  key={card.id}
                  card={card}
                  isJustSaved={justSavedSet.has(card.field)}
                  compact={false}
                  reducedMotion={reducedMotion}
                />
              ))}
            </>
          ) : (
            <>
              {factCards.map((card) => (
                <InterviewCard
                  key={card.id}
                  card={card}
                  isJustSaved={justSavedSet.has(card.field)}
                  compact={false}
                  reducedMotion={reducedMotion}
                />
              ))}
              {nextSlotLabel && (
                <div className="flex min-h-[76px] items-center justify-center rounded-tile border-[1.5px] border-dashed border-dash p-[14px] text-center text-[13px] text-subtle">
                  {nextSlotLabel}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mic error banner */}
      {status === "failed" && (
        <div
          role="alert"
          className="mx-[16px] mb-[2px] shrink-0 rounded-[14px] bg-granate-50 px-[14px] py-[10px] text-center text-[13px] font-medium text-granate"
        >
          Couldn&apos;t reach the microphone. Try again or type instead.
        </div>
      )}

      {/* Fixed bottom controls */}
      <div className="mt-auto flex shrink-0 items-center justify-between px-[22px] pb-[26px] pt-[14px]">
        <div className="flex min-w-[114px] justify-start">
          {onTypeInstead && (
            <button
              type="button"
              onClick={onTypeInstead}
              className="min-h-[44px] rounded-full bg-surface px-[16px] text-[14px] font-semibold text-ink shadow-bubble transition-transform active:scale-[0.98]"
            >
              Type instead
            </button>
          )}
        </div>

        <div className="relative flex flex-col items-center">
          {status === "connecting" && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-[6px] rounded-full border-2 border-granate/50"
              animate={
                reducedMotion
                  ? { opacity: 0.5 }
                  : { scale: [1, 1.24, 1], opacity: [0.65, 0, 0.65] }
              }
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          <button
            type="button"
            onClick={isIdleOrFailed ? onStart : status === "live" ? onToggleMute : undefined}
            disabled={status === "connecting"}
            aria-label={
              isIdleOrFailed
                ? "Start"
                : status === "connecting"
                  ? "Connecting microphone"
                  : muted
                    ? "Unmute microphone"
                    : "Mute microphone"
            }
            aria-pressed={status === "live" ? muted : undefined}
            className={`relative flex h-[64px] w-[64px] items-center justify-center rounded-[32px] text-white shadow-fab transition-colors active:bg-granate-700 disabled:opacity-90 ${
              status === "live" && muted ? "bg-granate-700" : "bg-granate"
            }`}
          >
            {status === "live" && muted ? (
              <MicOff className="h-[26px] w-[26px] text-white" strokeWidth={2.2} aria-hidden="true" />
            ) : (
              <MicIcon />
            )}
          </button>

          {isIdleOrFailed && (
            <span className="pointer-events-none absolute -bottom-[19px] text-[11px] font-bold tracking-[0.02em] text-granate">
              Start
            </span>
          )}
          {status === "connecting" && (
            <span className="pointer-events-none absolute -bottom-[19px] text-[11px] font-semibold text-subtle">
              Connecting…
            </span>
          )}
          {status === "live" && muted && (
            <span className="pointer-events-none absolute -bottom-[19px] text-[11px] font-semibold text-muted">
              Muted
            </span>
          )}
        </div>

        <div className="flex min-w-[114px] justify-end">
          <button
            type="button"
            onClick={onEnd}
            className="min-h-[44px] rounded-full bg-transparent px-[16px] text-[14px] font-semibold text-muted transition-colors hover:text-ink"
          >
            End
          </button>
        </div>
      </div>
    </div>
  );
}
