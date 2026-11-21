import { z } from "zod";

import { profileSchema, type Profile, type Role } from "../domain/profile.ts";

export type ProfileWrite =
  | { action: "set_facts"; facts: unknown }
  | { action: "add_requirement"; [key: string]: unknown }
  | { action: "finish_interview"; notes: unknown };

export type SaveResult = { ok: true; profile: Profile } | { ok: false; error: string };

const errorBodySchema = z.object({
  error: z.string(),
  issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() })).optional(),
});

async function readError(response: Response): Promise<string> {
  const body = errorBodySchema.safeParse(await response.json().catch(() => null));
  if (!body.success) return `the server answered with status ${response.status}`;
  const { error, issues } = body.data;
  if (!issues?.length) return error;
  return issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

export async function createProfile(role: Role): Promise<Profile> {
  const response = await fetch("/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return profileSchema.parse(await response.json());
}

/** Saves one tool call on the server and returns the stored profile, or why it was rejected. */
export async function saveProfileWrite(profileId: string, write: ProfileWrite): Promise<SaveResult> {
  const request = {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(write),
  };
  const url = `/api/profiles/${encodeURIComponent(profileId)}`;
  let response: Response;
  try {
    response = await fetch(url, request);
  } catch {
    // The routes accept an identical retry, so a lost response is safe to send again once.
    try {
      response = await fetch(url, request);
    } catch {
      return { ok: false, error: "could not reach the server" };
    }
  }
  if (!response.ok) return { ok: false, error: await readError(response) };
  return { ok: true, profile: profileSchema.parse(await response.json()) };
}
