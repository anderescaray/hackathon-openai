import { z } from "zod";

const CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";
const REALTIME_MODEL = "gpt-realtime-2.1";
const AGENT_VOICE = "marin";
const CLIENT_SECRET_LIFETIME_SECONDS = 120;

const clientSecretResponseSchema = z.object({
  value: z.string().min(1),
  expires_at: z.number(),
});

export type VoiceSessionOutcome =
  | { ok: true; clientSecret: string; expiresAt: number }
  | { ok: false; reason: "missing_api_key" | "openai_error" | "invalid_response"; detail: string };

export type VoiceSessionDependencies = { apiKey: string | undefined; fetchFn: typeof fetch };

export async function createVoiceClientSecret({
  apiKey,
  fetchFn,
}: VoiceSessionDependencies): Promise<VoiceSessionOutcome> {
  if (!apiKey) return { ok: false, reason: "missing_api_key", detail: "OPENAI_API_KEY is not set" };

  let response: Response;
  try {
    response = await fetchFn(CLIENT_SECRETS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: CLIENT_SECRET_LIFETIME_SECONDS },
        session: { type: "realtime", model: REALTIME_MODEL, audio: { output: { voice: AGENT_VOICE } } },
      }),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown network error";
    return { ok: false, reason: "openai_error", detail };
  }

  if (!response.ok) {
    return { ok: false, reason: "openai_error", detail: `OpenAI answered with status ${response.status}` };
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    return { ok: false, reason: "invalid_response", detail: "OpenAI answered with a body that is not JSON" };
  }

  const parsed = clientSecretResponseSchema.safeParse(responseBody);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_response", detail: z.prettifyError(parsed.error) };
  }
  return { ok: true, clientSecret: parsed.data.value, expiresAt: parsed.data.expires_at };
}
