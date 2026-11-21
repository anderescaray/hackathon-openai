/**
 * Who is using this window: profileId + role (no accounts, see the system design).
 * Kept per tab in sessionStorage, so window 1 (tenant) and window 2 (landlord) of the demo don't overwrite each other;
 * localStorage keeps the last choice as the default for new tabs.
 * `?as=<profileId>` in any URL switches the window to that profile (demo: window 1 tenant, window 2 landlord).
 * Client only: read it with `useSession()` inside client components.
 */
import { useSyncExternalStore } from "react";

import type { Role } from "@/domain/profile";

import { DEMO_HOME_ID, DEMO_TENANT_ID, profilesById } from "./fixtures";

export type Session = { profileId: string; role: Role };

const KEY = "homie.session";
const EVENT = "homie:session";

function roleForId(profileId: string): Role {
  const known = profilesById.get(profileId);
  if (known) return known.role;
  return profileId.startsWith("home") ? "home" : "tenant";
}

function applyAsParam(): void {
  const as = new URLSearchParams(window.location.search).get("as");
  if (!as) return;
  const next = JSON.stringify({ profileId: as, role: roleForId(as) } satisfies Session);
  if (window.sessionStorage.getItem(KEY) !== next) window.sessionStorage.setItem(KEY, next);
}

function readRaw(): string {
  try {
    applyAsParam();
    return window.sessionStorage.getItem(KEY) ?? window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

let cachedRaw: string | null = null;
let cachedSession: Session | null = null;

function parse(raw: string): Session | null {
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  try {
    const value = JSON.parse(raw) as Partial<Session>;
    cachedSession =
      typeof value.profileId === "string" && (value.role === "tenant" || value.role === "home")
        ? { profileId: value.profileId, role: value.role }
        : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  return parse(readRaw());
}

export function setSession(session: Session): void {
  window.sessionStorage.setItem(KEY, JSON.stringify(session));
  window.localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession(): void {
  window.sessionStorage.removeItem(KEY);
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/** Ready-made demo profiles (plan B: "Demo: load a ready profile"). */
export function demoSession(role: Role): Session {
  return role === "tenant" ? { profileId: DEMO_TENANT_ID, role } : { profileId: DEMO_HOME_ID, role };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

const getServerSnapshot = (): string | null => null;

/**
 * Current session, or null on the server / during hydration / when nobody chose a role.
 * Pass a role to fall back to that role's demo profile (after hydration) instead of null.
 */
export function useSession(fallbackRole?: Role): Session | null {
  const raw = useSyncExternalStore(subscribe, readRaw, getServerSnapshot);
  if (raw === null) return null;
  const session = parse(raw);
  if (session) return session;
  return fallbackRole ? demoSession(fallbackRole) : null;
}
