import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { saveProfileWrite } from "./profileApi.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const draft = {
  id: "tenant-1",
  role: "tenant",
  displayName: "",
  photoUrls: [],
  facts: { occupants: 2 },
  requirements: [],
  notes: "",
  status: "draft",
};

test("sends the same PATCH again once when the first response is lost", async () => {
  const bodies: string[] = [];
  globalThis.fetch = async (_url, init) => {
    bodies.push(String(init?.body));
    if (bodies.length === 1) throw new TypeError("network error");
    return Response.json(draft);
  };

  const result = await saveProfileWrite("tenant-1", { action: "set_facts", facts: { occupants: 2 } });

  assert.deepEqual(result, { ok: true, profile: draft });
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0], bodies[1]);
});

test("turns a 400 from the server into an error the agent can act on", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { error: "Invalid input", issues: [{ path: ["facts", "stayMonths"], message: "expected number" }] },
      { status: 400 },
    );

  const result = await saveProfileWrite("tenant-1", { action: "set_facts", facts: { stayMonths: "mucho" } });

  assert.deepEqual(result, { ok: false, error: "facts.stayMonths: expected number" });
});
