import { z } from "zod";

const EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const MODEL = "text-embedding-3-small";
// The interview waits on this call, so a slow API must not freeze the demo.
const TIMEOUT_MS = 3000;

const responseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()) })).min(1),
});

/** Embedding of the free-text notes, or null when there is no text, no key, or the API fails. */
export async function embedNotes(notes: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (notes.trim() === "" || !apiKey) return null;
  try {
    const response = await fetch(EMBEDDINGS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input: notes }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`Embedding request failed with status ${response.status}`);
      return null;
    }
    return responseSchema.parse(await response.json()).data[0].embedding;
  } catch (error) {
    console.warn("Embedding request failed", error);
    return null;
  }
}
