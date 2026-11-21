import { z } from "zod";

import {
  REQUIREMENT_OPERATORS,
  homeFactsSchema,
  profileSchema,
  tenantFactsSchema,
  type Profile,
  type Role,
} from "../domain/profile.ts";

export type ToolCall = { name: string; args: unknown };

export type ToolCallOutcome =
  | { ok: true; profile: Profile; saved: string[]; missingFacts: string[] }
  | { ok: false; profile: Profile; error: string; missingFacts: string[] };

const FACT_SCHEMAS: Record<Role, Record<string, z.ZodType>> = {
  tenant: tenantFactsSchema.shape,
  home: homeFactsSchema.shape,
};

const OTHER_ROLE: Record<Role, Role> = { tenant: "home", home: "tenant" };

const factsArgsSchema = z.record(z.string(), z.unknown());

const requirementArgsSchema = z.strictObject({
  field: z.string(),
  operator: z.enum(REQUIREMENT_OPERATORS),
  value: z.unknown(),
  isMust: z.boolean(),
});

const finishArgsSchema = z.strictObject({ notes: z.string() });

function findMissingFacts(profile: Profile): string[] {
  const facts: Record<string, unknown> = profile.facts;
  return Object.keys(FACT_SCHEMAS[profile.role]).filter((key) => facts[key] === undefined);
}

function describeIssues(error: z.ZodError, prefix: string[] = []): string {
  return error.issues
    .map((issue) => `${[...prefix, ...issue.path].join(".")}: ${issue.message}`)
    .join("; ");
}

function reject(profile: Profile, error: string): ToolCallOutcome {
  return { ok: false, profile, error, missingFacts: findMissingFacts(profile) };
}

function acceptCandidate(profile: Profile, candidate: unknown, saved: string[]): ToolCallOutcome {
  const parsed = profileSchema.safeParse(candidate);
  if (!parsed.success) return reject(profile, describeIssues(parsed.error));
  return { ok: true, profile: parsed.data, saved, missingFacts: findMissingFacts(parsed.data) };
}

function rejectIfFactsMissing(profile: Profile): ToolCallOutcome | undefined {
  const missingFacts = findMissingFacts(profile);
  if (missingFacts.length === 0) return undefined;
  return reject(profile, `missing facts: ${missingFacts.join(", ")}`);
}

function saveFacts(profile: Profile, args: unknown): ToolCallOutcome {
  const parsedArgs = factsArgsSchema.safeParse(args);
  if (!parsedArgs.success) return reject(profile, "arguments must be an object of facts");
  const candidate = { ...profile, facts: { ...profile.facts, ...parsedArgs.data } };
  return acceptCandidate(profile, candidate, Object.keys(parsedArgs.data));
}

function saveRequirement(profile: Profile, args: unknown): ToolCallOutcome {
  const parsedArgs = requirementArgsSchema.safeParse(args);
  if (!parsedArgs.success) return reject(profile, describeIssues(parsedArgs.error));
  const { field, operator, value, isMust } = parsedArgs.data;

  const otherRoleFacts = FACT_SCHEMAS[OTHER_ROLE[profile.role]];
  if (!Object.hasOwn(otherRoleFacts, field)) {
    return reject(profile, `field must be one of: ${Object.keys(otherRoleFacts).join(", ")}`);
  }
  const fieldSchema = otherRoleFacts[field];
  const valueSchema = operator === "in" ? z.array(fieldSchema).min(1) : fieldSchema;
  const parsedValue = valueSchema.safeParse(value);
  if (!parsedValue.success) return reject(profile, describeIssues(parsedValue.error, ["value"]));

  const currentRequirements: { field: string }[] = profile.requirements;
  const candidate = {
    ...profile,
    requirements: [
      ...currentRequirements.filter((requirement) => requirement.field !== field),
      { field, operator, value: parsedValue.data, isMust },
    ],
  };
  return acceptCandidate(profile, candidate, [field]);
}

function finishInterview(profile: Profile, args: unknown): ToolCallOutcome {
  const parsedArgs = finishArgsSchema.safeParse(args);
  if (!parsedArgs.success) return reject(profile, describeIssues(parsedArgs.error));
  return (
    rejectIfFactsMissing(profile) ??
    acceptCandidate(profile, { ...profile, notes: parsedArgs.data.notes, status: "complete" }, ["notes"])
  );
}

export function applyToolCall(profile: Profile, toolCall: ToolCall): ToolCallOutcome {
  switch (toolCall.name) {
    case "save_facts":
      return saveFacts(profile, toolCall.args);
    case "complete_facts":
      return rejectIfFactsMissing(profile) ?? { ok: true, profile, saved: [], missingFacts: [] };
    case "save_requirement":
      return saveRequirement(profile, toolCall.args);
    case "finish_interview":
      return finishInterview(profile, toolCall.args);
    default:
      return reject(profile, `unknown tool: ${toolCall.name}`);
  }
}
