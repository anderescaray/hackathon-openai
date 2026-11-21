"use client";

import { useRouter } from "next/navigation";

import type { Role } from "@/domain/profile";

import { peekProfile } from "../../_lib/api";
import { useSession } from "../../_lib/session";
import { matchIdFromItem, useMatchWatcher } from "../../_lib/useMatchWatcher";
import { MatchCelebration } from "./MatchCelebration";

/**
 * Owned by Claude (integration logic). Mounted in the (tenant) and (landlord) layouts: polls matches and shows
 * MatchCelebration when the other window accepts. Screens that get a match straight from api.swipe() must call
 * markMatchSeen(matchId) before showing their own celebration, so this one doesn't show it twice.
 */
export function MatchWatcher({ role }: { role: Role }) {
  const session = useSession(role);
  const router = useRouter();
  const profileId = session?.profileId ?? null;
  const { match, dismiss } = useMatchWatcher(profileId);
  if (!match || !profileId) return null;
  return (
    <MatchCelebration
      item={match}
      viewer={peekProfile(profileId) ?? null}
      side={role === "tenant" ? "tenant" : "landlord"}
      onSayHi={() => {
        dismiss();
        router.push(`/chat/${encodeURIComponent(matchIdFromItem(profileId, match))}`);
      }}
      onClose={dismiss}
    />
  );
}
