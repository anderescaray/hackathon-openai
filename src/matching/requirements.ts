import { z } from "zod";

import {
  DISTRICTS,
  EMPLOYMENT_CONTRACTS,
  RENTAL_TYPES,
  type HomeFacts,
  type HomeRequirement,
  type TenantFacts,
  type TenantRequirement,
} from "../domain/profile.ts";

export type Requirement = TenantRequirement | HomeRequirement;
export type FactField = keyof TenantFacts | keyof HomeFacts;
type FactValue = Requirement["value"];

type FieldKind =
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "date" }
  | { kind: "enum"; values: readonly string[] };

const NUMBER: FieldKind = { kind: "number" };
const BOOLEAN: FieldKind = { kind: "boolean" };
const DATE: FieldKind = { kind: "date" };

// The domain schema accepts any value type for any field, so this table adds the per-field rules.
const FIELD_KINDS: Record<FactField, FieldKind> = {
  monthlyIncomeEur: NUMBER,
  employmentContract: { kind: "enum", values: EMPLOYMENT_CONTRACTS },
  occupants: NUMBER,
  hasPets: BOOLEAN,
  smokes: BOOLEAN,
  moveInDate: DATE,
  stayMonths: NUMBER,
  monthlyRentEur: NUMBER,
  district: { kind: "enum", values: DISTRICTS },
  rentalType: { kind: "enum", values: RENTAL_TYPES },
  bedrooms: NUMBER,
  sizeM2: NUMBER,
  furnished: BOOLEAN,
  availableFrom: DATE,
};

const isoDate = z.iso.date();

function fitsKind(kind: FieldKind, value: FactValue): boolean {
  switch (kind.kind) {
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "date":
      return isoDate.safeParse(value).success;
    case "enum":
      return typeof value === "string" && kind.values.includes(value);
  }
}

/** Returns why the requirement makes no sense for its field, or null when it is valid. */
export function requirementError(requirement: Requirement): string | null {
  const kind = FIELD_KINDS[requirement.field];
  const { field, operator, value } = requirement;

  if (operator === "in") {
    if (kind.kind !== "enum") return `"in" only applies to fields with a closed list; ${field} is not one`;
    if (!Array.isArray(value) || value.length === 0) return `"in" on ${field} needs a non-empty list`;
    const unknown = value.filter((item) => !kind.values.includes(item));
    if (unknown.length > 0) {
      return `${field} does not accept ${unknown.join(", ")}; valid values: ${kind.values.join(", ")}`;
    }
    return null;
  }

  if (operator === "lte" || operator === "gte") {
    if (kind.kind !== "number" && kind.kind !== "date") {
      return `"${operator}" only applies to numbers or dates; ${field} is neither`;
    }
    return fitsKind(kind, value) ? null : `${field} needs a ${kind.kind} value for "${operator}"`;
  }

  if (!fitsKind(kind, value)) {
    const expected = kind.kind === "enum" ? `one of ${kind.values.join(", ")}` : `a ${kind.kind}`;
    return `${field} needs ${expected} for "eq"`;
  }
  return null;
}

/** A missing fact fails the requirement. ISO dates compare correctly as strings. */
export function meetsRequirement(facts: Partial<Record<FactField, unknown>>, requirement: Requirement): boolean {
  const actual = facts[requirement.field];
  const { operator, value } = requirement;
  if (actual === undefined) return false;

  switch (operator) {
    case "eq":
      return actual === value;
    case "in":
      return Array.isArray(value) && typeof actual === "string" && value.includes(actual);
    case "lte":
      return typeof actual === typeof value && (actual as number | string) <= (value as number | string);
    case "gte":
      return typeof actual === typeof value && (actual as number | string) >= (value as number | string);
  }
}
