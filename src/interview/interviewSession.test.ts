import assert from "node:assert/strict";
import { test } from "node:test";

import { handleToolCall, startInterview, type InterviewState } from "./interviewSession.ts";

const ALL_TENANT_FACTS = {
  monthlyIncomeEur: 2800,
  employmentContract: "permanent",
  occupants: 2,
  hasPets: false,
  smokes: false,
  moveInDate: "2027-01-01",
  stayMonths: 12,
};

function reachRequirementsPhase(): InterviewState {
  const started = startInterview("tenant", "tenant-1");
  const withFacts = handleToolCall(started, { name: "save_facts", args: ALL_TENANT_FACTS });
  return handleToolCall(withFacts.state, { name: "complete_facts", args: {} }).state;
}

test("starts in the facts phase with an empty draft of the role", () => {
  const state = startInterview("home", "home-1");

  assert.equal(state.phase, "facts");
  assert.deepEqual(state.profile, {
    id: "home-1",
    role: "home",
    displayName: "",
    photoUrls: [],
    notes: "",
    status: "draft",
    facts: {},
    requirements: [],
  });
});

test("stays in the facts phase after saving facts and tells the agent what is missing", () => {
  const started = startInterview("tenant", "tenant-1");

  const reply = handleToolCall(started, { name: "save_facts", args: { hasPets: true, smokes: false } });

  assert.equal(reply.state.phase, "facts");
  assert.deepEqual(reply.state.profile.facts, { hasPets: true, smokes: false });
  assert.deepEqual(reply.output, {
    ok: true,
    saved: ["hasPets", "smokes"],
    missingFacts: ["monthlyIncomeEur", "employmentContract", "occupants", "moveInDate", "stayMonths"],
  });
});

test("moves to the requirements phase when complete_facts is accepted", () => {
  const started = startInterview("tenant", "tenant-1");
  const withFacts = handleToolCall(started, { name: "save_facts", args: ALL_TENANT_FACTS });

  const reply = handleToolCall(withFacts.state, { name: "complete_facts", args: {} });

  assert.equal(reply.state.phase, "requirements");
  assert.deepEqual(reply.output, { ok: true, saved: [], missingFacts: [] });
});

test("stays in the facts phase when complete_facts is rejected", () => {
  const started = startInterview("tenant", "tenant-1");
  const withFacts = handleToolCall(started, {
    name: "save_facts",
    args: { ...ALL_TENANT_FACTS, stayMonths: undefined },
  });

  const reply = handleToolCall(withFacts.state, { name: "complete_facts", args: {} });

  assert.equal(reply.state.phase, "facts");
  assert.deepEqual(reply.output, { ok: false, error: "missing facts: stayMonths", missingFacts: ["stayMonths"] });
});

test("finishes the interview when finish_interview is accepted", () => {
  const reply = handleToolCall(reachRequirementsPhase(), {
    name: "finish_interview",
    args: { notes: "Busca un piso luminoso." },
  });

  assert.equal(reply.state.phase, "done");
  assert.equal(reply.state.profile.status, "complete");
  assert.equal(reply.state.profile.notes, "Busca un piso luminoso.");
});

test("rejects a requirements tool during the facts phase", () => {
  const started = startInterview("tenant", "tenant-1");

  const reply = handleToolCall(started, {
    name: "save_requirement",
    args: { field: "bedrooms", operator: "gte", value: 2, isMust: true },
  });

  assert.deepEqual(reply.state, started);
  assert.equal(reply.output.ok, false);
  assert.equal(
    reply.output.ok ? "" : reply.output.error,
    "save_requirement is not available in the facts phase",
  );
});

test("rejects a facts tool during the requirements phase", () => {
  const inRequirements = reachRequirementsPhase();

  const reply = handleToolCall(inRequirements, { name: "save_facts", args: { hasPets: true } });

  assert.deepEqual(reply.state, inRequirements);
  assert.equal(reply.output.ok ? "" : reply.output.error, "save_facts is not available in the requirements phase");
});

test("rejects every tool once the interview is done", () => {
  const finished = handleToolCall(reachRequirementsPhase(), { name: "finish_interview", args: { notes: "" } });

  const reply = handleToolCall(finished.state, {
    name: "save_requirement",
    args: { field: "bedrooms", operator: "gte", value: 2, isMust: true },
  });

  assert.deepEqual(reply.state, finished.state);
  assert.equal(reply.output.ok ? "" : reply.output.error, "save_requirement is not available in the done phase");
});
