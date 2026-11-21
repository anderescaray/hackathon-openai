import assert from "node:assert/strict";
import { test } from "node:test";

import { ZodError } from "zod";

import { findProfile, openDatabase } from "../db/store.ts";
import { HttpError } from "./http.ts";
import { applyAction, createDraft } from "./profiles.ts";

// No OPENAI_API_KEY in tests, so finishing never calls the network and stores no embedding.
delete process.env.OPENAI_API_KEY;

const homeFacts = {
  monthlyRentEur: 900,
  district: "gracia",
  rentalType: "entire_home",
  bedrooms: 2,
  sizeM2: 65,
  furnished: true,
  availableFrom: "2027-01-01",
};

function isStatus(status: number) {
  return (error: unknown) => error instanceof HttpError && error.status === status;
}

async function draftWithAllFacts() {
  const database = openDatabase(":memory:");
  const draft = createDraft(database, { role: "home", displayName: "Piso en Gràcia" });
  for (const [field, value] of Object.entries(homeFacts)) {
    await applyAction(database, draft.id, { action: "set_fact", field, value });
  }
  return { database, id: draft.id };
}

test("creates an empty draft for a role", () => {
  const database = openDatabase(":memory:");

  const draft = createDraft(database, { role: "tenant" });

  assert.equal(draft.status, "draft");
  assert.deepEqual(draft.facts, {});
  assert.deepEqual(findProfile(database, draft.id), draft);
});

test("set_fact rejects a field of the other role and a value of the wrong type", async () => {
  const database = openDatabase(":memory:");
  const { id } = createDraft(database, { role: "home" });

  await assert.rejects(applyAction(database, id, { action: "set_fact", field: "hasPets", value: false }), ZodError);
  await assert.rejects(applyAction(database, id, { action: "set_fact", field: "monthlyRentEur", value: "900" }), ZodError);
});

test("add_requirement rejects values outside the closed list", async () => {
  const database = openDatabase(":memory:");
  const { id } = createDraft(database, { role: "home" });

  await assert.rejects(
    applyAction(database, id, { action: "add_requirement", field: "employmentContract", operator: "in", value: ["indefinido"], isMust: true }),
    isStatus(400),
  );
});

test("a requirement with the same field and operator replaces the previous one", async () => {
  const database = openDatabase(":memory:");
  const { id } = createDraft(database, { role: "home" });
  const requirement = { action: "add_requirement", field: "stayMonths", operator: "gte", isMust: false };

  await applyAction(database, id, { ...requirement, value: 6 });
  const updated = await applyAction(database, id, { ...requirement, value: 12, isMust: true });

  assert.deepEqual(updated.requirements, [{ field: "stayMonths", operator: "gte", value: 12, isMust: true }]);
});

test("finish_interview needs every fact of the role", async () => {
  const database = openDatabase(":memory:");
  const { id } = createDraft(database, { role: "home" });
  await applyAction(database, id, { action: "set_fact", field: "monthlyRentEur", value: 900 });

  await assert.rejects(applyAction(database, id, { action: "finish_interview", notes: "" }), ZodError);
});

test("finish_interview completes the profile, can be retried and then locks it", async () => {
  const { database, id } = await draftWithAllFacts();

  const completed = await applyAction(database, id, { action: "finish_interview", notes: "Mucha luz." });
  const retried = await applyAction(database, id, { action: "finish_interview", notes: "Mucha luz." });

  assert.equal(completed.status, "complete");
  assert.deepEqual(retried, completed);
  await assert.rejects(applyAction(database, id, { action: "finish_interview", notes: "Otra cosa." }), isStatus(409));
  await assert.rejects(applyAction(database, id, { action: "set_fact", field: "bedrooms", value: 3 }), isStatus(409));
});

test("an unknown profile is a 404", async () => {
  const database = openDatabase(":memory:");

  await assert.rejects(applyAction(database, "missing", { action: "finish_interview", notes: "" }), isStatus(404));
});
