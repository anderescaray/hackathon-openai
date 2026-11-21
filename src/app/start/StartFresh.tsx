"use client";

import { useEffect } from "react";

/** Wipes everything the app keeps in this browser (session, mock swipes, seen matches) and opens the landing. */
export function StartFresh() {
  useEffect(() => {
    try {
      for (const store of [window.localStorage, window.sessionStorage]) {
        for (const key of Object.keys(store)) if (key.startsWith("homie.")) store.removeItem(key);
      }
    } catch {
      // storage unavailable: nothing to clear
    }
    window.location.replace("/");
  }, []);
  return <div className="absolute inset-0 bg-cream" />;
}
