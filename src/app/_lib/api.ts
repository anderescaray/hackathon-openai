/**
 * The ONLY way UI code reads or writes data. Components never call fetch() or read fixtures directly.
 *
 * NEXT_PUBLIC_DATA_SOURCE = "mock" (default) | "api"
 * - mock: fixtures + swipes in localStorage. localStorage is shared by windows of the same origin,
 *   so the two-window demo (tenant likes → landlord accepts → both see the match) works with no backend.
 * - api:  Asier's routes (docs/2-system-design.md). If a route fails, it falls back to mock and warns.
 *
 * Client only (uses window/localStorage in mock mode).
 */
import { feedItemSchema, profileSchema, type FeedItem, type Profile } from "@/domain/profile";
import type { Swipe } from "@/domain/swipe";

import {
  chats as chatFixtures,
  interestedByHome,
  landlordNames,
  profilesById,
  tenantFeed,
  type ChatThread,
} from "./fixtures";
import { countOk, evaluateRequirements } from "./fit";

export type DataSource = "mock" | "api";

export const DATA_SOURCE: DataSource = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "mock";

/** Homes per day shown to a tenant ("2 of 5 today"). */
export const DAILY_HOMES = 5;

/** How often the other window checks for a new match. */
export const MATCH_POLL_MS = 2000;

// ---------------------------------------------------------------------------------------------
// mock storage

const SWIPES_KEY = "homie.mock.swipes";
const PROFILES_KEY = "homie.mock.profiles";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function mockSwipes(): Swipe[] {
  return readJson<Swipe[]>(SWIPES_KEY, []);
}

function mockProfiles(): Record<string, Profile> {
  return readJson<Record<string, Profile>>(PROFILES_KEY, {});
}

function findMockProfile(id: string): Profile | undefined {
  return mockProfiles()[id] ?? profilesById.get(id);
}

/** Fixture tenants in interestedByHome count as having liked that home. */
function liked(from: string, to: string): boolean {
  if (mockSwipes().some((s) => s.fromProfileId === from && s.toProfileId === to && s.liked)) return true;
  return (interestedByHome[to] ?? []).some((entry) => entry.tenantId === from);
}

function swipedBy(from: string): Set<string> {
  return new Set(mockSwipes().filter((s) => s.fromProfileId === from).map((s) => s.toProfileId));
}

function toFeedItem(viewerId: string, other: Profile): FeedItem {
  const viewer = findMockProfile(viewerId);
  if (!viewer) return { profile: other, score: 0.9, reasons: [] };
  const fit = evaluateRequirements(viewer, other);
  const reasons = [
    `Fits all ${fit.musts.length} of your must-haves`,
    `You fit all ${fit.theyRequire.length} of theirs`,
  ];
  const nice = fit.nice.length ? countOk(fit.nice) / fit.nice.length : 1;
  return { profile: other, score: Number((0.7 * nice + 0.3).toFixed(2)), reasons };
}

const mock = {
  async getFeed(profileId: string): Promise<FeedItem[]> {
    const viewer = findMockProfile(profileId);
    if (viewer?.role === "home") return mock.getInterested(profileId);
    const done = swipedBy(profileId);
    return tenantFeed.filter((item) => !done.has(item.profile.id)).slice(0, DAILY_HOMES);
  },

  async swipe(from: string, to: string, isLike: boolean): Promise<{ match: FeedItem | null }> {
    const swipes = mockSwipes().filter((s) => !(s.fromProfileId === from && s.toProfileId === to));
    swipes.push({ fromProfileId: from, toProfileId: to, liked: isLike });
    writeJson(SWIPES_KEY, swipes);
    const other = findMockProfile(to);
    if (!isLike || !other || !liked(to, from)) return { match: null };
    return { match: toFeedItem(from, other) };
  },

  async getMatches(profileId: string): Promise<FeedItem[]> {
    const mine = mockSwipes().filter((s) => s.fromProfileId === profileId && s.liked);
    return mine
      .filter((s) => liked(s.toProfileId, profileId))
      .map((s) => findMockProfile(s.toProfileId))
      .filter((p): p is Profile => Boolean(p))
      .map((p) => toFeedItem(profileId, p));
  },

  async getInterested(homeId: string): Promise<FeedItem[]> {
    const done = swipedBy(homeId);
    const fromFixtures = (interestedByHome[homeId] ?? []).map((e) => e.tenantId);
    const fromSwipes = mockSwipes()
      .filter((s) => s.toProfileId === homeId && s.liked)
      .map((s) => s.fromProfileId);
    const ids = [...new Set([...fromSwipes.reverse(), ...fromFixtures])].filter((id) => !done.has(id));
    return ids
      .map((id) => findMockProfile(id))
      .filter((p): p is Profile => p?.role === "tenant")
      .map((p) => toFeedItem(homeId, p));
  },

  async getProfile(id: string): Promise<Profile> {
    const profile = findMockProfile(id);
    if (!profile) throw new Error(`Unknown profile ${id}`);
    return profile;
  },

  async saveProfile(profile: Profile): Promise<Profile> {
    const parsed = profileSchema.parse(profile);
    writeJson(PROFILES_KEY, { ...mockProfiles(), [parsed.id]: parsed });
    return parsed;
  },
};

// ---------------------------------------------------------------------------------------------
// api (Asier's routes). C2 keeps this in sync with the real routes.

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${url} → ${response.status}`);
  return response.json();
}

const feedItems = feedItemSchema.array();

const remote = {
  async getFeed(profileId: string): Promise<FeedItem[]> {
    return feedItems.parse(await getJson(`/api/feed?profileId=${encodeURIComponent(profileId)}`));
  },
  async swipe(from: string, to: string, isLike: boolean): Promise<{ match: FeedItem | null }> {
    const body = await getJson("/api/swipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromProfileId: from, toProfileId: to, liked: isLike } satisfies Swipe),
    });
    const match = (body as { match?: unknown }).match;
    return { match: match ? feedItemSchema.parse(match) : null };
  },
  async getMatches(profileId: string): Promise<FeedItem[]> {
    return feedItems.parse(await getJson(`/api/matches?profileId=${encodeURIComponent(profileId)}`));
  },
  async getInterested(homeId: string): Promise<FeedItem[]> {
    // Pending on Asier: GET /api/likes?profileId=<homeId> → FeedItem[]
    return feedItems.parse(await getJson(`/api/likes?profileId=${encodeURIComponent(homeId)}`));
  },
  async getProfile(id: string): Promise<Profile> {
    return profileSchema.parse(await getJson(`/api/profiles/${encodeURIComponent(id)}`));
  },
  async saveProfile(profile: Profile): Promise<Profile> {
    return profileSchema.parse(
      await getJson(`/api/profiles/${encodeURIComponent(profile.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      }),
    );
  },
};

type Adapter = typeof mock;

function withFallback<K extends keyof Adapter>(name: K): Adapter[K] {
  const run = (async (...args: unknown[]) => {
    if (DATA_SOURCE === "mock") return (mock[name] as (...a: unknown[]) => unknown)(...args);
    try {
      return await (remote[name] as (...a: unknown[]) => unknown)(...args);
    } catch (error) {
      console.warn(`[homie] api.${String(name)} failed, using mock data`, error);
      return (mock[name] as (...a: unknown[]) => unknown)(...args);
    }
  }) as Adapter[K];
  return run;
}

/** GET /api/feed — today's homes for a tenant (or interested tenants for a home). */
export const getFeed = withFallback("getFeed");
/** POST /api/swipes — like (true) or pass (false). Returns the match when the other side already liked. */
export const swipe = withFallback("swipe");
/** GET /api/matches — mutual likes. Poll every MATCH_POLL_MS to notice the other window's accept. */
export const getMatches = withFallback("getMatches");
/** Tenants who liked this home and pass both sides' must-haves (landlord "Interested" tab). */
export const getInterested = withFallback("getInterested");
/** GET /api/profiles/:id */
export const getProfile = withFallback("getProfile");
/** PATCH /api/profiles/:id — e.g. when the interview finishes. */
export const saveProfile = withFallback("saveProfile");

// ---------------------------------------------------------------------------------------------
// helpers for screens (sync, fixture-backed; fine in both modes for the demo)

/** Chat/match id: always "<tenantId>~<homeId>". */
export function matchIdFor(tenantId: string, homeId: string): string {
  return `${tenantId}~${homeId}`;
}

export function parseMatchId(matchId: string): { tenantId: string; homeId: string } {
  const [tenantId = "", homeId = ""] = decodeURIComponent(matchId).split("~");
  return { tenantId, homeId };
}

/** Landlord's first name for a home ("Marta"); profiles don't carry it. */
export function landlordNameFor(homeId: string): string {
  return landlordNames[homeId] ?? "the landlord";
}

/** "2h ago" for the Interested card. Live likes (from the other window) read "just now". */
export function likedAgo(homeId: string, tenantId: string): string {
  return (interestedByHome[homeId] ?? []).find((e) => e.tenantId === tenantId)?.likedAgo ?? "just now";
}

/** Fake chat threads (tenant point of view). */
export function listChats(): ChatThread[] {
  return chatFixtures;
}

/** A thread by match id; for a fresh match there is no history yet, so it returns an empty thread. */
export function getChat(matchId: string): ChatThread {
  const existing = chatFixtures.find((c) => c.id === matchId);
  if (existing) return existing;
  const { tenantId, homeId } = parseMatchId(matchId);
  return {
    id: matchId,
    tenantId,
    homeId,
    landlordName: landlordNameFor(homeId),
    lastAt: "now",
    unread: false,
    messages: [],
  };
}

/** Sync lookup for fixture/mock profiles (chat headers, listings). Prefer getProfile() for live data. */
export function peekProfile(id: string): Profile | undefined {
  return findMockProfile(id);
}

const SEEN_KEY = "homie.seenMatches";

/**
 * Matches already celebrated in THIS tab (sessionStorage: the tenant and landlord windows each celebrate once).
 */
function readSeen(): string[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function isMatchSeen(matchId: string): boolean {
  return readSeen().includes(matchId);
}

export function markMatchSeen(matchId: string): void {
  const seen = readSeen();
  if (!seen.includes(matchId)) window.sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, matchId]));
}

/** Demo reset: forget mock swipes, saved profiles and seen matches. */
export function resetMockData(): void {
  for (const key of [SWIPES_KEY, PROFILES_KEY]) window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(SEEN_KEY);
}
