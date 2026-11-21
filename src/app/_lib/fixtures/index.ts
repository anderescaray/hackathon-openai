/**
 * Fixture bundle for "mock" mode. Everything is validated with the shared schemas at import time.
 */
import { feedItemSchema, type FeedItem, type Profile } from "@/domain/profile";

import { DEMO_HOME_ID, DEMO_TENANT_ID, allProfiles, demoTenant, homes, tenants } from "./profiles";

export { DEMO_HOME_ID, DEMO_TENANT_ID, allProfiles, demoTenant, homes, tenants };

/** The demo tenant's 5 homes for today, best first. */
export const tenantFeed: FeedItem[] = feedItemSchema.array().parse(
  homes.slice(0, 5).map((profile, index) => ({
    profile,
    score: Number((0.94 - index * 0.06).toFixed(2)),
    reasons: ["Fits all your must-haves", "You fit all the landlord's must-haves"],
  })),
);

/** Tenants who already liked each home (they pass both sides' must-haves). */
export const interestedByHome: Record<string, { tenantId: string; likedAgo: string }[]> = {
  "home-01": [
    { tenantId: "tenant-02", likedAgo: "2h ago" },
    { tenantId: "tenant-03", likedAgo: "5h ago" },
    { tenantId: "tenant-04", likedAgo: "yesterday" },
  ],
  "home-02": [{ tenantId: "tenant-02", likedAgo: "1h ago" }],
  "home-03": [{ tenantId: "tenant-04", likedAgo: "3h ago" }],
};

/** Who rents out each home. Profiles carry no landlord name, so the UI reads it from here. */
export const landlordNames: Record<string, string> = {
  "home-01": "Marta",
  "home-02": "Jordi",
  "home-03": "Marta",
  "home-04": "Núria",
  "home-05": "Àlex",
};

/** The demo landlord (window 2) and the listings shown in "My listings". */
export const demoLandlord = { name: "Marta", homeIds: ["home-01", "home-03"] };

export type ChatMessage = { from: "me" | "them"; text: string; time?: string };

export type ChatThread = {
  /** Same id format as matchIdFor(tenantId, homeId) in _lib/api.ts */
  id: string;
  tenantId: string;
  homeId: string;
  /** name of the person on the other side, as seen by the tenant (landlord name) */
  landlordName: string;
  lastAt: string;
  unread: boolean;
  messages: ChatMessage[];
  viewing?: { when: string; where: string };
};

/** Fake chats from the tenant's point of view ("me" = tenant). */
export const chats: ChatThread[] = [
  {
    id: "tenant-demo~home-02",
    tenantId: DEMO_TENANT_ID,
    homeId: "home-02",
    landlordName: "Jordi",
    lastAt: "12:40",
    unread: true,
    messages: [
      { from: "them", text: "Hi Laura! Happy to show you the loft this week." },
      { from: "me", text: "Great, could we do Thursday evening?" },
      { from: "them", text: "Thursday at 6:30 works for me!" },
    ],
    viewing: { when: "Thu 18:30", where: "Carrer del Consell de Cent, Eixample" },
  },
  {
    id: "tenant-demo~home-04",
    tenantId: DEMO_TENANT_ID,
    homeId: "home-04",
    landlordName: "Núria",
    lastAt: "Mon",
    unread: false,
    messages: [
      { from: "them", text: "Hello! The flat is still available from the 10th." },
      { from: "me", text: "Is the deposit one month or two?" },
    ],
  },
];

export const profilesById: Map<string, Profile> = new Map(allProfiles.map((p) => [p.id, p]));

