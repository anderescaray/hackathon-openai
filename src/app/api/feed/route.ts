import { getDatabase } from "@/db/store.ts";
import { getFeed } from "@/matching/feed.ts";
import { requireParam, toErrorResponse } from "@/matching/http.ts";

export function GET(request: Request) {
  // Read outside the try: Next interrupts prerendering on request.url and that signal must not be caught.
  const profileId = new URL(request.url).searchParams.get("profileId");
  try {
    return Response.json(getFeed(getDatabase(), requireParam(profileId, "profileId")));
  } catch (error) {
    return toErrorResponse(error);
  }
}
