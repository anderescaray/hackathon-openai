import assert from "node:assert/strict";
import { test } from "node:test";

import { formatBarcelonaDate } from "./today.ts";

test("gives the Barcelona date just after local midnight, when UTC is still on the day before", () => {
  assert.equal(formatBarcelonaDate(new Date("2026-11-30T23:30:00Z")), "2026-12-01");
});

test("gives the same date as UTC in the middle of the day", () => {
  assert.equal(formatBarcelonaDate(new Date("2026-11-21T12:00:00Z")), "2026-11-21");
});
