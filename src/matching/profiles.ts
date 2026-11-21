import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import { z } from "zod";

import {
  REQUIREMENT_OPERATORS,
  homeFactsSchema,
  homeRequirementSchema,
  profileSchema,
  tenantFactsSchema,
  tenantRequirementSchema,
  type Profile,
} from "../domain/profile.ts";
import { findProfile, saveEmbedding, saveProfile } from "../db/store.ts";
import { embedNotes } from "./embedding.ts";
import { HttpError } from "./http.ts";
import { requirementError, type Requirement } from "./requirements.ts";

const createProfileInputSchema = z.strictObject({
  role: z.enum(["tenant", "home"]),
  displayName: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
});

const profileActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("set_fact"), field: z.string(), value: z.unknown() }),
  z.strictObject({
    action: z.literal("add_requirement"),
    field: z.string(),
    operator: z.enum(REQUIREMENT_OPERATORS),
    value: z.unknown(),
    isMust: z.boolean(),
  }),
  z.strictObject({ action: z.literal("finish_interview"), notes: z.string() }),
]);

export function requireProfile(database: DatabaseSync, id: string): Profile {
  const profile = findProfile(database, id);
  if (!profile) throw new HttpError(404, `Profile ${id} not found`);
  return profile;
}

export function createDraft(database: DatabaseSync, input: unknown): Profile {
  const { role, displayName = "", photoUrls = [] } = createProfileInputSchema.parse(input);
  const profile = profileSchema.parse({
    id: randomUUID(),
    role,
    displayName,
    photoUrls,
    facts: {},
    requirements: [],
    notes: "",
    status: "draft",
  });
  saveProfile(database, profile);
  return profile;
}

/** Applies one interview tool call (set_fact, add_requirement or finish_interview) to a profile. */
export async function applyAction(database: DatabaseSync, id: string, input: unknown): Promise<Profile> {
  const action = profileActionSchema.parse(input);
  const profile = requireProfile(database, id);

  if (profile.status === "complete") {
    // A retried identical finish succeeds; anything else would change a profile already in feeds.
    if (action.action === "finish_interview" && action.notes === profile.notes) return profile;
    throw new HttpError(409, "Profile is already complete");
  }

  if (action.action === "set_fact") {
    // Parsing the whole profile checks that the field belongs to this role and the value has its type.
    const updated = profileSchema.parse({ ...profile, facts: { ...profile.facts, [action.field]: action.value } });
    saveProfile(database, updated);
    return updated;
  }

  if (action.action === "add_requirement") {
    const requirementSchema = profile.role === "tenant" ? tenantRequirementSchema : homeRequirementSchema;
    const requirement: Requirement = requirementSchema.parse({
      field: action.field,
      operator: action.operator,
      value: action.value,
      isMust: action.isMust,
    });
    const error = requirementError(requirement);
    if (error) throw new HttpError(400, error);
    const others = (profile.requirements as Requirement[]).filter(
      (existing) => existing.field !== requirement.field || existing.operator !== requirement.operator,
    );
    const updated = profileSchema.parse({ ...profile, requirements: [...others, requirement] });
    saveProfile(database, updated);
    return updated;
  }

  const factsSchema = profile.role === "tenant" ? tenantFactsSchema : homeFactsSchema;
  factsSchema.parse(profile.facts);
  const embedding = await embedNotes(action.notes);
  const completed = profileSchema.parse({ ...profile, notes: action.notes, status: "complete" });
  if (embedding) saveEmbedding(database, completed.id, embedding);
  saveProfile(database, completed);
  return completed;
}
