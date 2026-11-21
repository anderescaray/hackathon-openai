import assert from "node:assert/strict";
import { test } from "node:test";

import { formatRequirement, formatValue } from "./labels.ts";

test("shows a boolean as yes or no", () => {
  assert.equal(formatValue(true), "Yes");
  assert.equal(formatValue(false), "No");
});

test("shows a contract value with its English name", () => {
  assert.equal(formatValue("self_employed"), "Self-employed");
});

test("shows a list of districts with their names", () => {
  assert.equal(formatValue(["gracia", "sants_montjuic"]), "Gràcia, Sants-Montjuïc");
});

test("shows numbers and dates as they are", () => {
  assert.equal(formatValue(2800), "2800");
  assert.equal(formatValue("2027-01-01"), "2027-01-01");
});

test("describes a maximum requirement with its field name", () => {
  const text = formatRequirement({ field: "monthlyRentEur", operator: "lte", value: 1500 });

  assert.equal(text, "Monthly rent (€): max 1500");
});

test("describes an equality requirement without an operator word", () => {
  const text = formatRequirement({ field: "hasPets", operator: "eq", value: false });

  assert.equal(text, "Pets: No");
});
