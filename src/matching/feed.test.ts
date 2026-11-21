import assert from "node:assert/strict";
import { test } from "node:test";

import type { HomeProfile, Profile, TenantProfile } from "../domain/profile.ts";
import { openDatabase, saveEmbedding, saveProfile } from "../db/store.ts";
import { HttpError } from "./http.ts";
import { getFeed, listMatches, recordSwipe } from "./feed.ts";
import { score } from "./match.ts";

const tenant: TenantProfile = {
  id: "tenant-1",
  role: "tenant",
  displayName: "Marta",
  photoUrls: [],
  facts: {
    monthlyIncomeEur: 2800,
    employmentContract: "temporary",
    occupants: 1,
    hasPets: false,
    smokes: false,
    moveInDate: "2027-01-15",
    stayMonths: 24,
  },
  requirements: [
    { field: "monthlyRentEur", operator: "lte", value: 900, isMust: true },
    { field: "district", operator: "in", value: ["gracia"], isMust: false },
  ],
  notes: "",
  status: "complete",
};

function home(id: string, overrides: Partial<HomeProfile> = {}): HomeProfile {
  return {
    id,
    role: "home",
    displayName: `Casa ${id}`,
    photoUrls: [],
    facts: {
      monthlyRentEur: 850,
      district: "gracia",
      rentalType: "entire_home",
      bedrooms: 2,
      sizeM2: 60,
      furnished: true,
      availableFrom: "2027-01-01",
    },
    requirements: [{ field: "hasPets", operator: "eq", value: false, isMust: true }],
    notes: "",
    status: "complete",
    ...overrides,
  };
}

const tooExpensive = home("home-expensive", { facts: { ...home("x").facts, monthlyRentEur: 1200 } });
const needsPermanent = home("home-permanent", {
  requirements: [{ field: "employmentContract", operator: "in", value: ["permanent"], isMust: true }],
});
const compatible = home("home-ok");

function seeded(...profiles: Profile[]) {
  const database = openDatabase(":memory:");
  for (const profile of profiles) saveProfile(database, profile);
  return database;
}

function feedIds(database: ReturnType<typeof openDatabase>, id: string): string[] {
  return getFeed(database, id).map((item) => item.profile.id);
}

test("filters in both directions: budget for the tenant, contract for the landlord", () => {
  const database = seeded(tenant, tooExpensive, needsPermanent, compatible);

  assert.deepEqual(feedIds(database, tenant.id), ["home-ok"]);
  assert.deepEqual(feedIds(database, needsPermanent.id), []);
  assert.deepEqual(feedIds(database, tooExpensive.id), []);
  assert.deepEqual(feedIds(database, compatible.id), ["tenant-1"]);
});

test("feed items carry reasons from both sides", () => {
  const database = seeded(tenant, compatible);

  const [item] = getFeed(database, tenant.id);

  assert.deepEqual(item.reasons, [
    "Cumple tu máximo de alquiler: 900 €",
    "Barrio: Gràcia, como pides",
    "Cumples lo que pide sobre mascotas: no",
  ]);
});

test("a draft gets an empty feed and never shows up in others' feeds", () => {
  const draftHome = home("home-draft", { status: "draft" });
  const database = seeded({ ...tenant }, draftHome);

  assert.deepEqual(feedIds(database, tenant.id), []);
  assert.deepEqual(feedIds(database, draftHome.id), []);
});

test("ranks by preferences and notes, and still ranks when embeddings are missing", () => {
  const otherDistrict = home("home-a", { facts: { ...compatible.facts, district: "sants_montjuic" } });
  const database = seeded(tenant, otherDistrict, home("home-b"), home("home-c"));
  saveEmbedding(database, tenant.id, [1, 0]);
  saveEmbedding(database, "home-c", [1, 0]);

  // home-c: preference met and identical notes; home-b: preference met, no embedding; home-a: preference missed.
  assert.deepEqual(feedIds(database, tenant.id), ["home-c", "home-b", "home-a"]);
});

test("missing preferences and embeddings count as neutral", () => {
  const noPreferences = { ...tenant, requirements: [tenant.requirements[0]] };

  assert.equal(score(noPreferences, home("h", { requirements: [] }), null, null), 0.5);
});

test("shows at most five and hides profiles already swiped", () => {
  const homes = ["h1", "h2", "h3", "h4", "h5", "h6", "h7"].map((id) => home(id));
  const database = seeded(tenant, ...homes);

  assert.equal(getFeed(database, tenant.id).length, 5);
  recordSwipe(database, { fromProfileId: tenant.id, toProfileId: "h1", liked: false });
  assert.equal(feedIds(database, tenant.id).includes("h1"), false);
});

test("the second like returns the match and both sides list it", () => {
  const database = seeded(tenant, compatible);

  const first = recordSwipe(database, { fromProfileId: tenant.id, toProfileId: compatible.id, liked: true });
  const second = recordSwipe(database, { fromProfileId: compatible.id, toProfileId: tenant.id, liked: true });

  assert.equal(first.match, null);
  assert.equal(second.match?.profile.id, tenant.id);
  assert.deepEqual(listMatches(database, tenant.id).map((item) => item.profile.id), [compatible.id]);
  assert.deepEqual(listMatches(database, compatible.id).map((item) => item.profile.id), [tenant.id]);
});

test("a pass never matches", () => {
  const database = seeded(tenant, compatible);

  recordSwipe(database, { fromProfileId: tenant.id, toProfileId: compatible.id, liked: true });
  const result = recordSwipe(database, { fromProfileId: compatible.id, toProfileId: tenant.id, liked: false });

  assert.equal(result.match, null);
  assert.deepEqual(listMatches(database, tenant.id), []);
});

test("an identical swipe can be retried and a different one is rejected", () => {
  const database = seeded(tenant, compatible);
  const like = { fromProfileId: tenant.id, toProfileId: compatible.id, liked: true };

  recordSwipe(database, like);
  assert.deepEqual(recordSwipe(database, like), { match: null });
  assert.throws(() => recordSwipe(database, { ...like, liked: false }), (error: unknown) => {
    return error instanceof HttpError && error.status === 409;
  });
});

test("a retried like keeps the decision and reports the current match state", () => {
  const database = seeded(tenant, compatible);
  const like = { fromProfileId: tenant.id, toProfileId: compatible.id, liked: true };

  assert.equal(recordSwipe(database, like).match, null);
  recordSwipe(database, { fromProfileId: compatible.id, toProfileId: tenant.id, liked: true });

  assert.equal(recordSwipe(database, like).match?.profile.id, compatible.id);
});

test("swiping an incompatible or unknown profile fails with 409 or 404", () => {
  const database = seeded(tenant, tooExpensive);

  assert.throws(
    () => recordSwipe(database, { fromProfileId: tenant.id, toProfileId: tooExpensive.id, liked: true }),
    (error: unknown) => error instanceof HttpError && error.status === 409,
  );
  assert.throws(
    () => recordSwipe(database, { fromProfileId: tenant.id, toProfileId: "missing", liked: true }),
    (error: unknown) => error instanceof HttpError && error.status === 404,
  );
});
