import type { DatabaseSync } from "node:sqlite";

import type { FeedItem, Role } from "../domain/profile.ts";
import { swipeSchema } from "../domain/swipe.ts";
import { findEmbedding, findProfile, findSwipe, listProfilesByRole, listSwipesFrom, saveSwipe } from "../db/store.ts";
import { HttpError } from "./http.ts";
import { isCompatible, toFeedItem } from "./match.ts";
import { requireProfile } from "./profiles.ts";

const FEED_SIZE = 5;

function oppositeRole(role: Role): Role {
  return role === "tenant" ? "home" : "tenant";
}

/** The best compatible profiles of the other role that the viewer has not swiped yet. */
export function getFeed(database: DatabaseSync, profileId: string): FeedItem[] {
  const viewer = requireProfile(database, profileId);
  if (viewer.status !== "complete") return [];

  const swiped = new Set(listSwipesFrom(database, viewer.id).map((swipe) => swipe.toProfileId));
  const viewerEmbedding = findEmbedding(database, viewer.id);
  return listProfilesByRole(database, oppositeRole(viewer.role))
    .filter((candidate) => !swiped.has(candidate.id) && isCompatible(viewer, candidate))
    .map((candidate) => toFeedItem(viewer, candidate, viewerEmbedding, findEmbedding(database, candidate.id)))
    .sort((a, b) => b.score - a.score || a.profile.id.localeCompare(b.profile.id))
    .slice(0, FEED_SIZE);
}

/**
 * Records a like or a pass. Everything below is synchronous, so two requests cannot interleave
 * between the check and the write.
 */
export function recordSwipe(database: DatabaseSync, input: unknown): { match: FeedItem | null } {
  const swipe = swipeSchema.parse(input);
  const from = requireProfile(database, swipe.fromProfileId);
  const to = requireProfile(database, swipe.toProfileId);
  if (!isCompatible(from, to)) throw new HttpError(409, "These profiles are not a compatible pair");

  const previous = findSwipe(database, from.id, to.id);
  if (previous && previous.liked !== swipe.liked) throw new HttpError(409, "This profile was already swiped");
  if (!previous) saveSwipe(database, swipe);

  const isMatch = swipe.liked && findSwipe(database, to.id, from.id)?.liked === true;
  return {
    match: isMatch ? toFeedItem(from, to, findEmbedding(database, from.id), findEmbedding(database, to.id)) : null,
  };
}

/** Mutual likes of a profile, seen from that profile. */
export function listMatches(database: DatabaseSync, profileId: string): FeedItem[] {
  const viewer = requireProfile(database, profileId);
  const viewerEmbedding = findEmbedding(database, viewer.id);
  return listSwipesFrom(database, viewer.id)
    .filter((swipe) => swipe.liked && findSwipe(database, swipe.toProfileId, viewer.id)?.liked === true)
    .flatMap((swipe) => {
      const other = findProfile(database, swipe.toProfileId);
      return other ? [toFeedItem(viewer, other, viewerEmbedding, findEmbedding(database, other.id))] : [];
    });
}
