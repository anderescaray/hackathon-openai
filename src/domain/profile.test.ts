import assert from "node:assert/strict";
import { test } from "node:test";

import { profileSchema } from "./profile.ts";

const completeHome = {
  id: "home-1",
  role: "home",
  displayName: "Piso luminoso en Gràcia",
  photoUrls: ["/photos/home-1.jpg"],
  facts: {
    monthlyRentEur: 900,
    district: "gracia",
    rentalType: "entire_home",
    bedrooms: 2,
    sizeM2: 65,
    furnished: true,
    availableFrom: "2027-01-01",
  },
  requirements: [
    { field: "employmentContract", operator: "in", value: ["permanent"], isMust: true },
    { field: "hasPets", operator: "eq", value: false, isMust: true },
    { field: "stayMonths", operator: "gte", value: 12, isMust: false },
  ],
  notes: "Vecinos tranquilos, mucha luz.",
  status: "complete",
};

const completeTenant = {
  id: "tenant-1",
  role: "tenant",
  displayName: "Marta",
  photoUrls: [],
  facts: {
    monthlyIncomeEur: 2800,
    employmentContract: "permanent",
    occupants: 1,
    hasPets: false,
    smokes: false,
    moveInDate: "2027-01-15",
    stayMonths: 24,
  },
  requirements: [
    { field: "monthlyRentEur", operator: "lte", value: 900, isMust: true },
    { field: "district", operator: "in", value: ["gracia", "eixample"], isMust: false },
  ],
  notes: "",
  status: "complete",
};

test("accepts a home whose landlord requires a permanent contract and no pets", () => {
  const parsed = profileSchema.safeParse(completeHome);

  assert.equal(parsed.success, true);
});

test("accepts a tenant with requirements about the home", () => {
  const parsed = profileSchema.safeParse(completeTenant);

  assert.equal(parsed.success, true);
});

test("accepts a draft profile whose facts are still incomplete", () => {
  const draft = { ...completeTenant, facts: { occupants: 2 }, status: "draft" };

  const parsed = profileSchema.safeParse(draft);

  assert.equal(parsed.success, true);
});

test("rejects a requirement about a field that is not in the contract", () => {
  const home = {
    ...completeHome,
    requirements: [{ field: "nationality", operator: "eq", value: "es", isMust: true }],
  };

  const parsed = profileSchema.safeParse(home);

  assert.equal(parsed.success, false);
  assert.deepEqual(parsed.error?.issues[0].path, ["requirements", 0, "field"]);
  assert.equal(parsed.error?.issues[0].code, "invalid_value");
});

test("rejects a tenant requirement that targets a tenant fact", () => {
  const tenant = {
    ...completeTenant,
    requirements: [{ field: "hasPets", operator: "eq", value: false, isMust: true }],
  };

  const parsed = profileSchema.safeParse(tenant);

  assert.equal(parsed.success, false);
  assert.deepEqual(parsed.error?.issues[0].path, ["requirements", 0, "field"]);
});

test("rejects a fact that is not in the contract", () => {
  const tenant = { ...completeTenant, facts: { ...completeTenant.facts, age: 31 } };

  const parsed = profileSchema.safeParse(tenant);

  assert.equal(parsed.success, false);
  assert.deepEqual(parsed.error?.issues[0].path, ["facts"]);
  assert.equal(parsed.error?.issues[0].code, "unrecognized_keys");
});
