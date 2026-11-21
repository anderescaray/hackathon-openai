import assert from "node:assert/strict";
import { test } from "node:test";

import type { Profile } from "../domain/profile.ts";
import {
  findProfile,
  findSwipe,
  listProfilesByRole,
  listSwipesFrom,
  openDatabase,
  saveProfile,
  saveSwipe,
} from "./store.ts";

const IN_MEMORY = ":memory:";

const tenant: Profile = {
  id: "tenant-1",
  role: "tenant",
  displayName: "Marta",
  photoUrls: [],
  facts: { monthlyIncomeEur: 2800, hasPets: false },
  requirements: [{ field: "monthlyRentEur", operator: "lte", value: 900, isMust: true }],
  notes: "",
  status: "draft",
};

const home: Profile = {
  id: "home-1",
  role: "home",
  displayName: "Piso luminoso en Gràcia",
  photoUrls: ["/photos/home-1.jpg"],
  facts: { monthlyRentEur: 900, district: "gracia" },
  requirements: [{ field: "hasPets", operator: "eq", value: false, isMust: true }],
  notes: "Vecinos tranquilos.",
  status: "complete",
};

test("returns a saved profile exactly as it was saved", () => {
  const database = openDatabase(IN_MEMORY);

  saveProfile(database, tenant);

  assert.deepEqual(findProfile(database, "tenant-1"), tenant);
});

test("returns nothing for a profile that does not exist", () => {
  const database = openDatabase(IN_MEMORY);

  assert.equal(findProfile(database, "missing"), undefined);
});

test("saving a profile again replaces the previous version", () => {
  const database = openDatabase(IN_MEMORY);
  saveProfile(database, tenant);

  saveProfile(database, { ...tenant, notes: "Teletrabajo.", status: "complete" });

  assert.equal(findProfile(database, "tenant-1")?.notes, "Teletrabajo.");
  assert.equal(listProfilesByRole(database, "tenant").length, 1);
});

test("lists only the profiles of the requested role", () => {
  const database = openDatabase(IN_MEMORY);
  saveProfile(database, tenant);
  saveProfile(database, home);

  assert.deepEqual(listProfilesByRole(database, "home"), [home]);
});

test("returns a saved swipe and lists it under the profile that made it", () => {
  const database = openDatabase(IN_MEMORY);
  const like = { fromProfileId: "tenant-1", toProfileId: "home-1", liked: true };

  saveSwipe(database, like);

  assert.deepEqual(findSwipe(database, "tenant-1", "home-1"), like);
  assert.deepEqual(listSwipesFrom(database, "tenant-1"), [like]);
  assert.equal(findSwipe(database, "home-1", "tenant-1"), undefined);
});

test("swiping the same profile again keeps only the latest decision", () => {
  const database = openDatabase(IN_MEMORY);
  saveSwipe(database, { fromProfileId: "tenant-1", toProfileId: "home-1", liked: false });

  saveSwipe(database, { fromProfileId: "tenant-1", toProfileId: "home-1", liked: true });

  assert.deepEqual(listSwipesFrom(database, "tenant-1"), [
    { fromProfileId: "tenant-1", toProfileId: "home-1", liked: true },
  ]);
});
