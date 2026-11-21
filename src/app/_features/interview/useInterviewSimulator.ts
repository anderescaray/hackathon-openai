"use client";

import { useState } from "react";

import type { Role } from "@/domain/profile";

import { demoTenant, homes } from "../../_lib/fixtures";
import type { InterviewViewProps } from "./types";

/**
 * STUB (F0). G2 implements a fake 8–10 step script (~1.5 s per step) for each role that returns exactly
 * InterviewViewProps, filling `profile` step by step from an empty draft.
 */
export function useInterviewSimulator(role: Role): InterviewViewProps {
  const [status, setStatus] = useState<InterviewViewProps["status"]>("idle");
  const profile = role === "tenant" ? demoTenant : homes[0]!;
  return {
    role,
    status,
    phase: "facts",
    profile,
    speaker: "none",
    onStart: () => setStatus("live"),
    onEnd: () => setStatus("finished"),
  };
}
