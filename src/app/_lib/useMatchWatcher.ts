"use client";

import { useEffect, useState } from "react";

import type { FeedItem } from "@/domain/profile";

import { MATCH_POLL_MS, getMatches, isMatchSeen, markMatchSeen, matchIdFor } from "./api";

/** Match id for a FeedItem seen from `viewerId` (tenant~home regardless of who is looking). */
export function matchIdFromItem(viewerId: string, item: FeedItem): string {
  return item.profile.role === "home" ? matchIdFor(viewerId, item.profile.id) : matchIdFor(item.profile.id, viewerId);
}

/**
 * Polls /api/matches every 2 s and returns the first match this browser hasn't celebrated yet.
 * `dismiss()` marks it as seen. Mounted once per role layout (MatchWatcher), so a match accepted in the
 * other window pops up wherever the user is. Effects pause while Next hides the route (Activity).
 */
export function useMatchWatcher(profileId: string | null) {
  const [pending, setPending] = useState<FeedItem | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const matches = await getMatches(profileId);
        const fresh = matches.find((m) => !isMatchSeen(matchIdFromItem(profileId, m)));
        if (!cancelled && fresh) setPending((current) => current ?? fresh);
      } catch {
        // polling is best effort
      }
    };
    void tick();
    const timer = setInterval(tick, MATCH_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [profileId]);

  const dismiss = () => {
    if (pending && profileId) markMatchSeen(matchIdFromItem(profileId, pending));
    setPending(null);
  };

  return { match: pending, dismiss };
}
