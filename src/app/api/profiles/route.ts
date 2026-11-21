import { getDatabase } from "@/db/store.ts";
import { readJson, toErrorResponse } from "@/matching/http.ts";
import { createDraft } from "@/matching/profiles.ts";

export async function POST(request: Request) {
  try {
    return Response.json(createDraft(getDatabase(), await readJson(request)), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
