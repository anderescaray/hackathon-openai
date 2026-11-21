import { getDatabase } from "@/db/store.ts";
import { listMatches } from "@/matching/feed.ts";
import { requireParam, toErrorResponse } from "@/matching/http.ts";

export function GET(request: Request) {
  // Read outside the try: Next interrupts prerendering on request.url and that signal must not be caught.
  const profileId = new URL(request.url).searchParams.get("profileId");
  try {
    return Response.json(listMatches(getDatabase(), requireParam(profileId, "profileId")));
  } catch (error) {
    return toErrorResponse(error);
  }
}
