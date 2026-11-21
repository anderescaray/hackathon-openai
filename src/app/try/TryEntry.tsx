"use client";

import { useEffect } from "react";

import { Homie } from "../_ui/homie/Homie";

/**
 * QR entry points for people trying roomie on their own phone. Each phone starts clean (its own browser storage).
 * - "swipe":     a ready-made demo tenant → straight to the 5 demo homes.
 * - "interview": the real voice interview → their own card → the same 5 demo homes.
 */
export function TryEntry({ mode }: { mode: "swipe" | "interview" }) {
  useEffect(() => {
    try {
      for (const store of [window.localStorage, window.sessionStorage]) {
        for (const key of Object.keys(store)) if (key.startsWith("homie.")) store.removeItem(key);
      }
      if (mode === "swipe") {
        window.sessionStorage.setItem("homie.session", JSON.stringify({ profileId: "tenant-demo", role: "tenant" }));
      }
    } catch {
      // storage unavailable: the screens fall back to the demo tenant anyway
    }
    window.location.replace(mode === "swipe" ? "/discover" : "/interview?role=tenant");
  }, [mode]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-cream">
      <Homie mood="wink" size={140} />
      <p className="font-display text-[24px] font-semibold text-granate">roomie</p>
    </div>
  );
}
