import { logEvent } from "../../../../interview/log.ts";
import { createVoiceClientSecret } from "../../../../interview/voiceSession.ts";

export async function POST(): Promise<Response> {
  const requestId = crypto.randomUUID();
  logEvent("info", {
    msg: "Requesting a temporary voice key",
    event_name: "voice_session.started",
    request_id: requestId,
  });

  const outcome = await createVoiceClientSecret({ apiKey: process.env.OPENAI_API_KEY, fetchFn: fetch });

  if (!outcome.ok) {
    logEvent("error", {
      msg: "Could not get a temporary voice key",
      event_name: "voice_session.failed",
      request_id: requestId,
      data: { reason: outcome.reason, detail: outcome.detail },
    });
    return Response.json({ error: "Could not start the voice session" }, { status: 500 });
  }

  logEvent("info", {
    msg: "Temporary voice key issued",
    event_name: "voice_session.succeeded",
    request_id: requestId,
    data: { expires_at: outcome.expiresAt },
  });
  return Response.json({ clientSecret: outcome.clientSecret, expiresAt: outcome.expiresAt });
}
