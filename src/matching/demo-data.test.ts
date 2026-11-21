import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { z } from "zod";

import { profileSchema } from "../domain/profile.ts";
import { isCompatible } from "./match.ts";
import { requirementError, type Requirement } from "./requirements.ts";

const profiles = z
  .array(profileSchema)
  .parse(JSON.parse(readFileSync(new URL("./demo-data.json", import.meta.url), "utf8")));
const tenants = profiles.filter((profile) => profile.role === "tenant");
const homes = profiles.filter((profile) => profile.role === "home");

test("demo data has 25 complete profiles per role with unique ids and valid requirements", () => {
  assert.equal(tenants.length, 25);
  assert.equal(homes.length, 25);
  assert.equal(new Set(profiles.map((profile) => profile.id)).size, profiles.length);
  for (const profile of profiles) {
    assert.equal(profile.status, "complete");
    for (const requirement of profile.requirements as Requirement[]) {
      assert.equal(requirementError(requirement), null, profile.id);
    }
  }
});

test("every demo profile has at least two compatible counterparts, so no seeded feed is empty", () => {
  for (const tenant of tenants) {
    assert.ok(homes.filter((home) => isCompatible(tenant, home)).length >= 2, tenant.id);
  }
  for (const home of homes) {
    assert.ok(tenants.filter((tenant) => isCompatible(tenant, home)).length >= 2, home.id);
  }
});
