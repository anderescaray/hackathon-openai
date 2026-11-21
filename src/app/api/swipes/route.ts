import { getDatabase } from "@/db/store.ts";
import { recordSwipe } from "@/matching/feed.ts";
import { readJson, toErrorResponse } from "@/matching/http.ts";

export async function POST(request: Request) {
  try {
    return Response.json(recordSwipe(getDatabase(), await readJson(request)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
