import { getDatabase } from "@/db/store.ts";
import { readJson, toErrorResponse } from "@/matching/http.ts";
import { applyAction } from "@/matching/profiles.ts";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return Response.json(await applyAction(getDatabase(), id, await readJson(request)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
