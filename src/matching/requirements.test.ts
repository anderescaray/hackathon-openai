import assert from "node:assert/strict";
import { test } from "node:test";

import { meetsRequirement, requirementError } from "./requirements.ts";

test("accepts sensible requirements for each kind of field", () => {
  assert.equal(requirementError({ field: "district", operator: "in", value: ["gracia", "eixample"], isMust: true }), null);
  assert.equal(requirementError({ field: "monthlyRentEur", operator: "lte", value: 900, isMust: true }), null);
  assert.equal(requirementError({ field: "availableFrom", operator: "lte", value: "2027-01-15", isMust: false }), null);
  assert.equal(requirementError({ field: "hasPets", operator: "eq", value: false, isMust: true }), null);
});

test("rejects an 'in' value outside the closed list, as a voice transcription could produce", () => {
  const error = requirementError({ field: "district", operator: "in", value: ["Gràcia"], isMust: true });

  assert.match(error ?? "", /Gràcia/);
});

test("rejects operators that do not fit the field type", () => {
  assert.notEqual(requirementError({ field: "hasPets", operator: "lte", value: 1, isMust: true }), null);
  assert.notEqual(requirementError({ field: "monthlyRentEur", operator: "lte", value: "900", isMust: true }), null);
  assert.notEqual(requirementError({ field: "monthlyRentEur", operator: "in", value: ["900"], isMust: true }), null);
  assert.notEqual(requirementError({ field: "employmentContract", operator: "eq", value: "indefinido", isMust: true }), null);
});

test("a missing fact fails the requirement", () => {
  assert.equal(meetsRequirement({}, { field: "monthlyRentEur", operator: "lte", value: 900, isMust: true }), false);
});

test("compares numbers and ISO dates with lte and gte", () => {
  assert.equal(meetsRequirement({ monthlyRentEur: 900 }, { field: "monthlyRentEur", operator: "lte", value: 900, isMust: true }), true);
  assert.equal(meetsRequirement({ monthlyRentEur: 901 }, { field: "monthlyRentEur", operator: "lte", value: 900, isMust: true }), false);
  assert.equal(
    meetsRequirement({ availableFrom: "2027-02-01" }, { field: "availableFrom", operator: "lte", value: "2027-01-15", isMust: true }),
    false,
  );
  assert.equal(meetsRequirement({ stayMonths: 24 }, { field: "stayMonths", operator: "gte", value: 12, isMust: false }), true);
});
