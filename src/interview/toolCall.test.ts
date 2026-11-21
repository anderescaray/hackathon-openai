import assert from "node:assert/strict";
import { test } from "node:test";

import type { HomeProfile, TenantProfile } from "../domain/profile.ts";
import { applyToolCall } from "./toolCall.ts";

function buildTenantDraft(): TenantProfile {
  return {
    id: "tenant-1",
    role: "tenant",
    displayName: "Marta",
    photoUrls: [],
    notes: "",
    status: "draft",
    facts: {},
    requirements: [],
  };
}

function buildTenantWithAllFacts(): TenantProfile {
  return {
    ...buildTenantDraft(),
    facts: {
      monthlyIncomeEur: 2800,
      employmentContract: "permanent",
      occupants: 2,
      hasPets: false,
      smokes: false,
      moveInDate: "2027-01-01",
      stayMonths: 12,
    },
  };
}

function buildHomeDraft(): HomeProfile {
  return {
    id: "home-1",
    role: "home",
    displayName: "Piso en Gràcia",
    photoUrls: [],
    notes: "",
    status: "draft",
    facts: {},
    requirements: [],
  };
}

test("saves several tenant facts from one call and reports the missing ones", () => {
  const outcome = applyToolCall(buildTenantDraft(), {
    name: "save_facts",
    args: { monthlyIncomeEur: 2800, employmentContract: "permanent", hasPets: false },
  });

  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.profile.facts, {
    monthlyIncomeEur: 2800,
    employmentContract: "permanent",
    hasPets: false,
  });
  assert.deepEqual(outcome.ok && outcome.saved, ["monthlyIncomeEur", "employmentContract", "hasPets"]);
  assert.deepEqual(outcome.missingFacts, ["occupants", "smokes", "moveInDate", "stayMonths"]);
});

test("keeps the facts saved earlier when new ones arrive", () => {
  const first = applyToolCall(buildTenantDraft(), { name: "save_facts", args: { occupants: 2 } });

  const second = applyToolCall(first.profile, { name: "save_facts", args: { smokes: true } });

  assert.deepEqual(second.profile.facts, { occupants: 2, smokes: true });
});

test("saves home facts for a home profile", () => {
  const outcome = applyToolCall(buildHomeDraft(), {
    name: "save_facts",
    args: { district: "gracia", monthlyRentEur: 1200 },
  });

  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.profile.facts, { district: "gracia", monthlyRentEur: 1200 });
  assert.deepEqual(outcome.missingFacts, ["rentalType", "bedrooms", "sizeM2", "furnished", "availableFrom"]);
});

test("rejects a fact that is not in the contract and leaves the profile unchanged", () => {
  const profile = buildTenantDraft();

  const outcome = applyToolCall(profile, { name: "save_facts", args: { nationality: "spanish" } });

  assert.equal(outcome.ok, false);
  assert.match(outcome.ok ? "" : outcome.error, /nationality/);
  assert.deepEqual(outcome.profile, buildTenantDraft());
});

test("rejects a fact with the wrong type", () => {
  const outcome = applyToolCall(buildTenantDraft(), { name: "save_facts", args: { hasPets: "sí" } });

  assert.equal(outcome.ok, false);
  assert.match(outcome.ok ? "" : outcome.error, /^facts\.hasPets: .*boolean/);
});

test("does not mutate the profile it receives", () => {
  const profile = buildTenantDraft();

  applyToolCall(profile, { name: "save_facts", args: { occupants: 3 } });
  applyToolCall(profile, {
    name: "save_requirement",
    args: { field: "bedrooms", operator: "gte", value: 2, isMust: true },
  });

  assert.deepEqual(profile, buildTenantDraft());
});

test("refuses to complete the facts phase while facts are missing", () => {
  const first = applyToolCall(buildTenantDraft(), {
    name: "save_facts",
    args: { monthlyIncomeEur: 2800, employmentContract: "permanent", occupants: 2, hasPets: false, smokes: false },
  });

  const outcome = applyToolCall(first.profile, { name: "complete_facts", args: {} });

  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok ? "" : outcome.error, "missing facts: moveInDate, stayMonths");
  assert.deepEqual(outcome.missingFacts, ["moveInDate", "stayMonths"]);
});

test("completes the facts phase when no fact is missing", () => {
  const outcome = applyToolCall(buildTenantWithAllFacts(), { name: "complete_facts", args: {} });

  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.missingFacts, []);
});

test("saves a tenant requirement on a home fact", () => {
  const outcome = applyToolCall(buildTenantWithAllFacts(), {
    name: "save_requirement",
    args: { field: "district", operator: "in", value: ["gracia", "eixample"], isMust: true },
  });

  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.profile.requirements, [
    { field: "district", operator: "in", value: ["gracia", "eixample"], isMust: true },
  ]);
  assert.deepEqual(outcome.ok && outcome.saved, ["district"]);
});

test("replaces the earlier requirement on the same field", () => {
  const first = applyToolCall(buildTenantWithAllFacts(), {
    name: "save_requirement",
    args: { field: "monthlyRentEur", operator: "lte", value: 1500, isMust: true },
  });

  const second = applyToolCall(first.profile, {
    name: "save_requirement",
    args: { field: "monthlyRentEur", operator: "lte", value: 1300, isMust: false },
  });

  assert.deepEqual(second.profile.requirements, [
    { field: "monthlyRentEur", operator: "lte", value: 1300, isMust: false },
  ]);
});

test("rejects a tenant requirement on a tenant fact", () => {
  const outcome = applyToolCall(buildTenantWithAllFacts(), {
    name: "save_requirement",
    args: { field: "hasPets", operator: "eq", value: false, isMust: true },
  });

  assert.equal(outcome.ok, false);
  assert.equal(
    outcome.ok ? "" : outcome.error,
    "field must be one of: monthlyRentEur, district, rentalType, bedrooms, sizeM2, furnished, availableFrom",
  );
  assert.deepEqual(outcome.profile.requirements, []);
});

test("rejects a requirement value that the field does not allow", () => {
  const outcome = applyToolCall(buildTenantWithAllFacts(), {
    name: "save_requirement",
    args: { field: "district", operator: "in", value: ["atlantis"], isMust: true },
  });

  assert.equal(outcome.ok, false);
  assert.match(outcome.ok ? "" : outcome.error, /^value\.0: .*gracia/);
});

test("finishes the interview saving the notes and marking the profile complete", () => {
  const outcome = applyToolCall(buildTenantWithAllFacts(), {
    name: "finish_interview",
    args: { notes: "Trabaja desde casa y busca un piso luminoso." },
  });

  assert.equal(outcome.ok, true);
  assert.equal(outcome.profile.notes, "Trabaja desde casa y busca un piso luminoso.");
  assert.equal(outcome.profile.status, "complete");
});

test("refuses to finish the interview while facts are missing", () => {
  const outcome = applyToolCall(buildTenantDraft(), { name: "finish_interview", args: { notes: "" } });

  assert.equal(outcome.ok, false);
  assert.match(outcome.ok ? "" : outcome.error, /^missing facts: monthlyIncomeEur, /);
  assert.equal(outcome.profile.status, "draft");
});

test("rejects a tool it does not know", () => {
  const outcome = applyToolCall(buildTenantDraft(), { name: "delete_profile", args: {} });

  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok ? "" : outcome.error, "unknown tool: delete_profile");
});
