import assert from "node:assert/strict";
import { test } from "node:test";

import { formatRequirement, formatValue } from "./labels.ts";

test("shows a boolean as sí or no", () => {
  assert.equal(formatValue(true), "Sí");
  assert.equal(formatValue(false), "No");
});

test("shows a contract value with its Spanish name", () => {
  assert.equal(formatValue("self_employed"), "Autónomo");
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

  assert.equal(text, "Alquiler al mes (€): máximo 1500");
});

test("describes an equality requirement without an operator word", () => {
  const text = formatRequirement({ field: "hasPets", operator: "eq", value: false });

  assert.equal(text, "Mascotas: No");
});
