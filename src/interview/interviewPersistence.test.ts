import assert from "node:assert/strict";
import { test } from "node:test";

import type { DatabaseSync } from "node:sqlite";

import { findProfile, openDatabase, saveProfile } from "../db/store.ts";
import type { Profile } from "../domain/profile.ts";
import { getFeed } from "../matching/feed.ts";
import { HttpError } from "../matching/http.ts";
import { applyAction, createDraft } from "../matching/profiles.ts";
import { handleAndSaveToolCall, type InterviewState } from "./interviewSession.ts";
import type { ProfileWrite, SaveResult } from "./profileApi.ts";
import type { ToolCall } from "./toolCall.ts";

// No OPENAI_API_KEY, so finishing never calls the network.
delete process.env.OPENAI_API_KEY;

const TENANT_FACTS = {
  monthlyIncomeEur: 3600,
  employmentContract: "self_employed",
  occupants: 2,
  hasPets: false,
  smokes: false,
  moveInDate: "2027-02-01",
  stayMonths: 24,
};

const home: Profile = {
  id: "home-1",
  role: "home",
  displayName: "Piso en Gràcia",
  photoUrls: [],
  facts: {
    monthlyRentEur: 1100,
    district: "gracia",
    rentalType: "entire_home",
    bedrooms: 2,
    sizeM2: 70,
    furnished: true,
    availableFrom: "2027-01-01",
  },
  requirements: [{ field: "smokes", operator: "eq", value: false, isMust: true }],
  notes: "",
  status: "complete",
};

/** The same save the browser does through PATCH /api/profiles/:id, without HTTP. */
function saveThroughMatching(database: DatabaseSync, profileId: string) {
  const writes: ProfileWrite[] = [];
  const save = async (write: ProfileWrite): Promise<SaveResult> => {
    writes.push(write);
    try {
      return { ok: true, profile: await applyAction(database, profileId, write) };
    } catch (error) {
      return { ok: false, error: error instanceof HttpError ? error.message : String(error) };
    }
  };
  return { save, writes };
}

async function run(state: InterviewState, save: (write: ProfileWrite) => Promise<SaveResult>, calls: ToolCall[]) {
  let current = state;
  const outputs = [];
  for (const call of calls) {
    const reply = await handleAndSaveToolCall(current, call, save);
    current = reply.state;
    outputs.push(reply.output);
  }
  return { state: current, outputs };
}

test("an interview saved through the server shows up in a compatible feed only once it is complete", async () => {
  const database = openDatabase(":memory:");
  saveProfile(database, home);
  const draft = createDraft(database, { role: "tenant" });
  const { save, writes } = saveThroughMatching(database, draft.id);

  const facts = await run({ phase: "facts", profile: draft }, save, [
    { name: "save_facts", args: TENANT_FACTS },
    { name: "complete_facts", args: {} },
    { name: "save_requirement", args: { field: "monthlyRentEur", operator: "gte", value: 800, isMust: false } },
    { name: "save_requirement", args: { field: "monthlyRentEur", operator: "lte", value: 1200, isMust: true } },
  ]);
  assert.deepEqual(getFeed(database, home.id), []);

  const finished = await run(facts.state, save, [{ name: "finish_interview", args: { notes: "Teletrabajo." } }]);

  assert.equal(finished.state.phase, "done");
  assert.deepEqual(findProfile(database, draft.id), finished.state.profile);
  assert.equal(finished.state.profile.requirements.length, 2);
  assert.deepEqual(writes.map((write) => write.action), ["set_facts", "add_requirement", "add_requirement", "finish_interview"]);
  assert.deepEqual(getFeed(database, home.id).map((item) => item.profile.id), [draft.id]);
  assert.deepEqual(getFeed(database, draft.id).map((item) => item.profile.id), [home.id]);
});

test("a server rejection goes back to the agent and the interview does not change", async () => {
  const draft = createDraft(openDatabase(":memory:"), { role: "tenant" });
  const state: InterviewState = { phase: "facts", profile: draft };
  const reject = async (): Promise<SaveResult> => ({ ok: false, error: "facts.stayMonths: expected number" });

  const reply = await handleAndSaveToolCall(state, { name: "save_facts", args: { occupants: 2 } }, reject);

  assert.deepEqual(reply.state, state);
  assert.deepEqual(reply.output, { ok: false, error: "facts.stayMonths: expected number", missingFacts: Object.keys(TENANT_FACTS) });
});

test("calls rejected locally and complete_facts never reach the server", async () => {
  const draft = createDraft(openDatabase(":memory:"), { role: "tenant" });
  let calls = 0;
  const save = async (): Promise<SaveResult> => {
    calls++;
    return { ok: false, error: "unexpected" };
  };

  await handleAndSaveToolCall({ phase: "facts", profile: draft }, { name: "save_facts", args: { age: 31 } }, save);
  await handleAndSaveToolCall({ phase: "facts", profile: draft }, { name: "complete_facts", args: {} }, save);

  assert.equal(calls, 0);
});
