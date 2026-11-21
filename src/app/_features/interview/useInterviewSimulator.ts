"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  HomeFacts,
  HomeProfile,
  HomeRequirement,
  Profile,
  Role,
  TenantFacts,
  TenantProfile,
  TenantRequirement,
} from "@/domain/profile";

import type { InterviewPhase, InterviewStatus, InterviewViewProps, Speaker } from "./types";

type TenantStep = {
  delayMs: number;
  phase: InterviewPhase;
  speaker: Speaker;
  agentLine?: string;
  userLine?: string;
  displayName?: string;
  facts?: Partial<TenantFacts>;
  requirements?: TenantRequirement[];
  notes?: string;
  justSaved?: string[];
  finish?: boolean;
};

type HomeStep = {
  delayMs: number;
  phase: InterviewPhase;
  speaker: Speaker;
  agentLine?: string;
  userLine?: string;
  displayName?: string;
  facts?: Partial<HomeFacts>;
  requirements?: HomeRequirement[];
  notes?: string;
  justSaved?: string[];
  finish?: boolean;
};

const TENANT_SCRIPT: TenantStep[] = [
  {
    delayMs: 1400,
    phase: "facts",
    speaker: "agent",
    agentLine: "Hi! Tell me a bit about your work and monthly income.",
  },
  {
    delayMs: 1600,
    phase: "facts",
    speaker: "user",
    userLine: "I earn €2,900 a month on a permanent contract.",
    displayName: "Laura M.",
    facts: { monthlyIncomeEur: 2900, employmentContract: "permanent" },
    justSaved: ["monthlyIncomeEur", "employmentContract"],
  },
  {
    delayMs: 1400,
    phase: "facts",
    speaker: "agent",
    agentLine: "Just you moving in? Any pets or smoking?",
  },
  {
    delayMs: 1600,
    phase: "facts",
    speaker: "user",
    userLine: "Just me, no pets and I don't smoke.",
    facts: { occupants: 1, hasPets: false, smokes: false },
    justSaved: ["occupants", "hasPets", "smokes"],
  },
  {
    delayMs: 1400,
    phase: "facts",
    speaker: "agent",
    agentLine: "When are you hoping to move in, and for how long?",
  },
  {
    delayMs: 1600,
    phase: "facts",
    speaker: "user",
    userLine: "From December 1st, ideally for at least a year.",
    facts: { moveInDate: "2026-12-01", stayMonths: 12 },
    justSaved: ["moveInDate", "stayMonths"],
  },
  {
    delayMs: 1500,
    phase: "requirements",
    speaker: "agent",
    agentLine: "Is that budget a must, or a nice-to-have?",
  },
  {
    delayMs: 1600,
    phase: "requirements",
    speaker: "user",
    userLine: "…a must. I can't go over a thousand.",
    requirements: [{ field: "monthlyRentEur", operator: "lte", value: 1000, isMust: true }],
    justSaved: ["monthlyRentEur"],
  },
  {
    delayMs: 1400,
    phase: "requirements",
    speaker: "agent",
    agentLine: "Which neighbourhoods and type of home are must-haves?",
  },
  {
    delayMs: 1600,
    phase: "requirements",
    speaker: "user",
    userLine: "Gràcia or Eixample, and an entire home — both musts.",
    requirements: [
      { field: "district", operator: "in", value: ["gracia", "eixample"], isMust: true },
      { field: "rentalType", operator: "eq", value: "entire_home", isMust: true },
    ],
    justSaved: ["district", "rentalType"],
  },
  {
    delayMs: 1500,
    phase: "requirements",
    speaker: "agent",
    agentLine: "Furnished? And anything else you'd like landlords to know?",
  },
  {
    delayMs: 1600,
    phase: "requirements",
    speaker: "user",
    userLine: "Furnished is nice to have. I work from home twice a week and love plants.",
    requirements: [{ field: "furnished", operator: "eq", value: true, isMust: false }],
    notes: "I work from home two days a week, I'm quiet and I look after plants.",
    justSaved: ["furnished"],
  },
  {
    delayMs: 1300,
    phase: "done",
    speaker: "none",
    justSaved: [],
    finish: true,
  },
];

const HOME_SCRIPT: HomeStep[] = [
  {
    delayMs: 1400,
    phase: "facts",
    speaker: "agent",
    agentLine: "Hi! Tell me about your place — area, type and monthly rent?",
  },
  {
    delayMs: 1600,
    phase: "facts",
    speaker: "user",
    userLine: "It's an entire flat in Gràcia for €950 a month.",
    facts: { monthlyRentEur: 950, district: "gracia", rentalType: "entire_home" },
    justSaved: ["monthlyRentEur", "district", "rentalType"],
  },
  {
    delayMs: 1400,
    phase: "facts",
    speaker: "agent",
    agentLine: "How many bedrooms, how big is it, and is it furnished?",
  },
  {
    delayMs: 1600,
    phase: "facts",
    speaker: "user",
    userLine: "Two bedrooms, 68 square metres, and fully furnished.",
    displayName: "Sunny 2-bed in Gràcia",
    facts: { bedrooms: 2, sizeM2: 68, furnished: true },
    justSaved: ["bedrooms", "sizeM2", "furnished"],
  },
  {
    delayMs: 1400,
    phase: "facts",
    speaker: "agent",
    agentLine: "When is the flat available to move into?",
  },
  {
    delayMs: 1600,
    phase: "facts",
    speaker: "user",
    userLine: "It's ready from December 1st.",
    facts: { availableFrom: "2026-12-01" },
    justSaved: ["availableFrom"],
  },
  {
    delayMs: 1500,
    phase: "requirements",
    speaker: "agent",
    agentLine: "Now who you're looking for. Any must-haves on contract or smoking?",
  },
  {
    delayMs: 1600,
    phase: "requirements",
    speaker: "user",
    userLine: "A permanent contract and no smoking — both are musts.",
    requirements: [
      { field: "employmentContract", operator: "in", value: ["permanent"], isMust: true },
      { field: "smokes", operator: "eq", value: false, isMust: true },
    ],
    justSaved: ["employmentContract", "smokes"],
  },
  {
    delayMs: 1500,
    phase: "requirements",
    speaker: "agent",
    agentLine: "Minimum stay? And anything nice tenants should know about the flat?",
  },
  {
    delayMs: 1600,
    phase: "requirements",
    speaker: "user",
    userLine: "At least 12 months is a must. Quiet street off Verdi with morning sun.",
    requirements: [{ field: "stayMonths", operator: "gte", value: 12, isMust: true }],
    notes: "Quiet street off Carrer de Verdi, lots of light in the morning. Neighbours are lovely.",
    justSaved: ["stayMonths"],
  },
  {
    delayMs: 1300,
    phase: "done",
    speaker: "none",
    justSaved: [],
    finish: true,
  },
];

function createDraftProfile(role: Role): Profile {
  if (role === "tenant") {
    const draft: TenantProfile = {
      id: "tenant-sim",
      role: "tenant",
      displayName: "",
      photoUrls: [],
      notes: "",
      status: "draft",
      facts: {},
      requirements: [],
    };
    return draft;
  }

  const draft: HomeProfile = {
    id: "home-sim",
    role: "home",
    displayName: "",
    photoUrls: [],
    notes: "",
    status: "draft",
    facts: {},
    requirements: [],
  };
  return draft;
}

type SimulatorState = {
  status: InterviewStatus;
  phase: InterviewPhase;
  speaker: Speaker;
  agentLine?: string;
  userLine?: string;
  justSaved: string[];
  muted: boolean;
  profile: Profile;
};

function createInitialState(role: Role): SimulatorState {
  return {
    status: "idle",
    phase: "facts",
    speaker: "none",
    agentLine:
      role === "tenant"
        ? "Tap the mic and tell me a bit about yourself."
        : "Tap the mic and tell me about your place.",
    userLine: undefined,
    justSaved: [],
    muted: false,
    profile: createDraftProfile(role),
  };
}

export function useInterviewSimulator(role: Role): InterviewViewProps {
  const [state, setState] = useState<SimulatorState>(() => createInitialState(role));
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const onStart = useCallback(() => {
    clearTimers();

    setState({
      status: "connecting",
      phase: "facts",
      speaker: "none",
      agentLine: undefined,
      userLine: undefined,
      justSaved: [],
      muted: false,
      profile: createDraftProfile(role),
    });

    const connectTimer = window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        status: "live",
      }));

      let elapsed = 0;

      if (role === "tenant") {
        for (const step of TENANT_SCRIPT) {
          const timerId = window.setTimeout(() => {
            setState((prev) => {
              if (prev.profile.role !== "tenant") return prev;
              const nextProfile: TenantProfile = {
                ...prev.profile,
                displayName: step.displayName ?? prev.profile.displayName,
                notes: step.notes ?? prev.profile.notes,
                facts: step.facts ? { ...prev.profile.facts, ...step.facts } : prev.profile.facts,
                requirements: step.requirements
                  ? [...prev.profile.requirements, ...step.requirements]
                  : prev.profile.requirements,
              };
              return {
                ...prev,
                status: step.finish ? "finished" : "live",
                phase: step.phase,
                speaker: step.speaker,
                agentLine: step.agentLine ?? prev.agentLine,
                userLine: step.userLine ?? (step.speaker === "agent" ? undefined : prev.userLine),
                justSaved: step.justSaved ?? [],
                profile: nextProfile,
              };
            });
          }, elapsed);
          timersRef.current.push(timerId);
          elapsed += step.delayMs;
        }
      } else {
        for (const step of HOME_SCRIPT) {
          const timerId = window.setTimeout(() => {
            setState((prev) => {
              if (prev.profile.role !== "home") return prev;
              const nextProfile: HomeProfile = {
                ...prev.profile,
                displayName: step.displayName ?? prev.profile.displayName,
                notes: step.notes ?? prev.profile.notes,
                facts: step.facts ? { ...prev.profile.facts, ...step.facts } : prev.profile.facts,
                requirements: step.requirements
                  ? [...prev.profile.requirements, ...step.requirements]
                  : prev.profile.requirements,
              };
              return {
                ...prev,
                status: step.finish ? "finished" : "live",
                phase: step.phase,
                speaker: step.speaker,
                agentLine: step.agentLine ?? prev.agentLine,
                userLine: step.userLine ?? (step.speaker === "agent" ? undefined : prev.userLine),
                justSaved: step.justSaved ?? [],
                profile: nextProfile,
              };
            });
          }, elapsed);
          timersRef.current.push(timerId);
          elapsed += step.delayMs;
        }
      }
    }, 800);

    timersRef.current.push(connectTimer);
  }, [clearTimers, role]);

  const onEnd = useCallback(() => {
    clearTimers();
    setState((prev) => ({
      ...prev,
      status: "finished",
      phase: "done",
      speaker: "none",
      justSaved: [],
    }));
  }, [clearTimers]);

  const onToggleMute = useCallback(() => {
    setState((prev) => ({
      ...prev,
      muted: !prev.muted,
    }));
  }, []);

  const activeState = state.profile.role === role ? state : createInitialState(role);

  return {
    role,
    status: activeState.status,
    phase: activeState.phase,
    profile: activeState.profile,
    speaker: activeState.speaker,
    agentLine: activeState.agentLine,
    userLine: activeState.userLine,
    justSaved: activeState.justSaved,
    muted: activeState.muted,
    onStart,
    onEnd,
    onToggleMute,
  };
}
