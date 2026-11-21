"use client";

import type { FeedItem, Profile } from "@/domain/profile";

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

/** STUB (F0). G3 replaces the body following docs/ui/mockups/after-swipe.html phone 1. Keep the props. */
export function MatchCelebration({ item, onSayHi, onClose }: MatchCelebrationProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-granate text-cream">
      <p className="font-display text-[40px]">It’s a match</p>
      <p>{item.profile.displayName}</p>
      <button onClick={onSayHi}>Say hi</button>
      <button onClick={onClose}>Keep discovering</button>
    </div>
  );
}
