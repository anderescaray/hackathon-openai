import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { z } from "zod";

import { profileSchema, type Profile, type Role } from "../domain/profile.ts";
import type { Swipe } from "../domain/swipe.ts";

const IN_MEMORY_PATH = ":memory:";
const DEFAULT_DATABASE_PATH = "data/app.db";

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    profile_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS swipes (
    from_profile_id TEXT NOT NULL,
    to_profile_id TEXT NOT NULL,
    liked INTEGER NOT NULL,
    PRIMARY KEY (from_profile_id, to_profile_id)
  );
  CREATE TABLE IF NOT EXISTS profile_embeddings (
    profile_id TEXT PRIMARY KEY,
    embedding_json TEXT NOT NULL
  );
`;

const embeddingRowSchema = z.object({ embedding_json: z.string() });

const profileRowSchema = z.object({ profile_json: z.string() });

const swipeRowSchema = z.object({
  from_profile_id: z.string(),
  to_profile_id: z.string(),
  liked: z.number(),
});

declare global {
  var appDatabase: DatabaseSync | undefined;
}

export function openDatabase(path: string): DatabaseSync {
  if (path !== IN_MEMORY_PATH) {
    mkdirSync(dirname(path), { recursive: true });
  }
  const database = new DatabaseSync(path);
  database.exec(CREATE_TABLES_SQL);
  return database;
}

// Kept on globalThis so `next dev` hot reloads reuse one connection instead of opening the file again.
export function getDatabase(): DatabaseSync {
  globalThis.appDatabase ??= openDatabase(process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH);
  return globalThis.appDatabase;
}

export function saveProfile(database: DatabaseSync, profile: Profile): void {
  database
    .prepare(
      `INSERT INTO profiles (id, role, profile_json) VALUES (?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET role = excluded.role, profile_json = excluded.profile_json`,
    )
    .run(profile.id, profile.role, JSON.stringify(profile));
}

export function findProfile(database: DatabaseSync, id: string): Profile | undefined {
  const row = database.prepare("SELECT profile_json FROM profiles WHERE id = ?").get(id);
  return row === undefined ? undefined : parseProfileRow(row);
}

export function listProfilesByRole(database: DatabaseSync, role: Role): Profile[] {
  return database
    .prepare("SELECT profile_json FROM profiles WHERE role = ? ORDER BY id")
    .all(role)
    .map(parseProfileRow);
}

export function saveSwipe(database: DatabaseSync, swipe: Swipe): void {
  database
    .prepare(
      `INSERT INTO swipes (from_profile_id, to_profile_id, liked) VALUES (?, ?, ?)
       ON CONFLICT (from_profile_id, to_profile_id) DO UPDATE SET liked = excluded.liked`,
    )
    .run(swipe.fromProfileId, swipe.toProfileId, swipe.liked ? 1 : 0);
}

export function findSwipe(
  database: DatabaseSync,
  fromProfileId: string,
  toProfileId: string,
): Swipe | undefined {
  const row = database
    .prepare(
      "SELECT from_profile_id, to_profile_id, liked FROM swipes WHERE from_profile_id = ? AND to_profile_id = ?",
    )
    .get(fromProfileId, toProfileId);
  return row === undefined ? undefined : parseSwipeRow(row);
}

export function listSwipesFrom(database: DatabaseSync, fromProfileId: string): Swipe[] {
  return database
    .prepare(
      "SELECT from_profile_id, to_profile_id, liked FROM swipes WHERE from_profile_id = ? ORDER BY to_profile_id",
    )
    .all(fromProfileId)
    .map(parseSwipeRow);
}

// Kept outside profile_json because profileSchema is strict and the vector is server-only data.
export function saveEmbedding(database: DatabaseSync, profileId: string, embedding: number[]): void {
  database
    .prepare(
      `INSERT INTO profile_embeddings (profile_id, embedding_json) VALUES (?, ?)
       ON CONFLICT (profile_id) DO UPDATE SET embedding_json = excluded.embedding_json`,
    )
    .run(profileId, JSON.stringify(embedding));
}

export function findEmbedding(database: DatabaseSync, profileId: string): number[] | null {
  const row = database
    .prepare("SELECT embedding_json FROM profile_embeddings WHERE profile_id = ?")
    .get(profileId);
  if (row === undefined) return null;
  return z.array(z.number()).parse(JSON.parse(embeddingRowSchema.parse(row).embedding_json));
}

function parseProfileRow(row: unknown): Profile {
  const { profile_json: profileJson } = profileRowSchema.parse(row);
  return profileSchema.parse(JSON.parse(profileJson));
}

function parseSwipeRow(row: unknown): Swipe {
  const swipeRow = swipeRowSchema.parse(row);
  return {
    fromProfileId: swipeRow.from_profile_id,
    toProfileId: swipeRow.to_profile_id,
    liked: swipeRow.liked === 1,
  };
}
