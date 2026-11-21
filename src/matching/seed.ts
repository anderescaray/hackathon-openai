import { readFileSync } from "node:fs";

import { z } from "zod";

import { profileSchema } from "../domain/profile.ts";
import { getDatabase, saveEmbedding, saveProfile } from "../db/store.ts";
import { embedNotes } from "./embedding.ts";

// Upserts the demo profiles by stable id; interview profiles and swipes stay untouched.
const profiles = z
  .array(profileSchema)
  .parse(JSON.parse(readFileSync(new URL("./demo-data.json", import.meta.url), "utf8")));

const database = getDatabase();
let embedded = 0;
for (const profile of profiles) {
  saveProfile(database, profile);
  const embedding = await embedNotes(profile.notes);
  if (embedding) {
    saveEmbedding(database, profile.id, embedding);
    embedded++;
  }
}

console.log(`Seeded ${profiles.length} profiles, ${embedded} with notes embeddings.`);
