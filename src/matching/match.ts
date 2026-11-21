import type { FeedItem, Profile } from "../domain/profile.ts";
import { buildReasons } from "./reasons.ts";
import { meetsRequirement, type Requirement } from "./requirements.ts";

export type Embedding = number[] | null;

const PREFERENCES_WEIGHT = 0.7;
const NOTES_WEIGHT = 0.3;
// Used when a side has no preferences or no embedding, so missing data neither helps nor hurts.
const NEUTRAL = 0.5;

function requirementsOf(profile: Profile): Requirement[] {
  return profile.requirements;
}

function meetsAllMusts(owner: Profile, other: Profile): boolean {
  return requirementsOf(owner).every((requirement) => !requirement.isMust || meetsRequirement(other.facts, requirement));
}

export function isCompatible(a: Profile, b: Profile): boolean {
  return (
    a.status === "complete" &&
    b.status === "complete" &&
    a.role !== b.role &&
    meetsAllMusts(a, b) &&
    meetsAllMusts(b, a)
  );
}

function preferenceResults(owner: Profile, other: Profile): boolean[] {
  return requirementsOf(owner)
    .filter((requirement) => !requirement.isMust)
    .map((requirement) => meetsRequirement(other.facts, requirement));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return Math.min(1, Math.max(0, dot / Math.sqrt(normA * normB)));
}

export function score(a: Profile, b: Profile, embeddingA: Embedding, embeddingB: Embedding): number {
  const preferences = [...preferenceResults(a, b), ...preferenceResults(b, a)];
  const preferenceScore =
    preferences.length === 0 ? NEUTRAL : preferences.filter(Boolean).length / preferences.length;
  const notesScore = embeddingA && embeddingB ? cosineSimilarity(embeddingA, embeddingB) : NEUTRAL;
  return PREFERENCES_WEIGHT * preferenceScore + NOTES_WEIGHT * notesScore;
}

export function toFeedItem(
  viewer: Profile,
  other: Profile,
  viewerEmbedding: Embedding,
  otherEmbedding: Embedding,
): FeedItem {
  return {
    profile: other,
    score: score(viewer, other, viewerEmbedding, otherEmbedding),
    reasons: buildReasons(viewer, other),
  };
}
