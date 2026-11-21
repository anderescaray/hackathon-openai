/**
 * Which requirements a pair meets, for the "Fits you 4/4" sheet, the details page and the match screen.
 * Pure and synchronous. If Asier publishes the same function in src/matching, switch to his.
 */
import type { Profile } from "@/domain/profile";

import { formatFactValue, requirementLabel } from "./format";

type AnyRequirement = Profile["requirements"][number];

export type Check = {
  field: string;
  /** "Rent under €1,000" */
  label: string;
  /** The other side's actual value, formatted: "€950". "—" when unknown. */
  value: string;
  ok: boolean;
  isMust: boolean;
};

export type FitResult = {
  /** viewer's must-haves, evaluated on the other side's facts */
  musts: Check[];
  /** viewer's nice-to-haves */
  nice: Check[];
  /** the other side's must-haves, evaluated on the viewer's facts */
  theyRequire: Check[];
};

function meets(requirement: AnyRequirement, actual: unknown): boolean {
  if (actual === undefined || actual === null) return false;
  const { operator, value } = requirement;
  switch (operator) {
    case "eq":
      return actual === value;
    case "in":
      return Array.isArray(value) ? value.map(String).includes(String(actual)) : String(actual) === String(value);
    case "lte":
      return typeof actual === "number" ? actual <= Number(value) : String(actual) <= String(value);
    case "gte":
      return typeof actual === "number" ? actual >= Number(value) : String(actual) >= String(value);
    default:
      return false;
  }
}

function check(requirement: AnyRequirement, facts: Record<string, unknown>): Check {
  const actual = facts[requirement.field];
  return {
    field: requirement.field,
    label: requirementLabel(requirement),
    value: formatFactValue(requirement.field, actual),
    ok: meets(requirement, actual),
    isMust: requirement.isMust,
  };
}

export function evaluateRequirements(viewer: Profile, other: Profile): FitResult {
  const otherFacts = other.facts as Record<string, unknown>;
  const viewerFacts = viewer.facts as Record<string, unknown>;
  const mine = viewer.requirements.map((r) => check(r, otherFacts));
  return {
    musts: mine.filter((c) => c.isMust),
    nice: mine.filter((c) => !c.isMust),
    theyRequire: other.requirements.filter((r) => r.isMust).map((r) => check(r, viewerFacts)),
  };
}

export function countOk(checks: Check[]): number {
  return checks.filter((c) => c.ok).length;
}
