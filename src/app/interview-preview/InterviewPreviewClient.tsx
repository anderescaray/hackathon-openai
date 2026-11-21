"use client";

import { useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { Profile, Role } from "@/domain/profile";

import { InterviewView } from "../_features/interview/InterviewView";
import { useInterviewSimulator } from "../_features/interview/useInterviewSimulator";
import { saveProfile } from "../_lib/api";
import { setSession } from "../_lib/session";

function markComplete(profile: Profile): Profile {
  if (profile.role === "tenant") {
    return { ...profile, status: "complete" };
  }
  return { ...profile, status: "complete" };
}

function InterviewPreviewRunner({ role }: { role: Role }) {
  const router = useRouter();
  const sim = useInterviewSimulator(role);
  const submittingRef = useRef(false);

  const handleContinue = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await saveProfile(markComplete(sim.profile));
      setSession({ profileId: sim.profile.id, role });
      router.push(role === "tenant" ? "/discover" : "/interested");
    } finally {
      submittingRef.current = false;
    }
  }, [role, router, sim.profile]);

  return (
    <InterviewView
      {...sim}
      onContinue={() => {
        void handleContinue();
      }}
    />
  );
}

export function InterviewPreviewClient() {
  const searchParams = useSearchParams();
  const role: Role = searchParams.get("role") === "home" ? "home" : "tenant";

  return <InterviewPreviewRunner key={role} role={role} />;
}
