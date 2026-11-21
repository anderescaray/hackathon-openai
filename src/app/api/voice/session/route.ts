import { logEvent } from "../../../../interview/log.ts";
import { createRateLimiter, isSameOriginRequest } from "../../../../interview/requestGuard.ts";
import { createVoiceClientSecret } from "../../../../interview/voiceSession.ts";

const MAX_SESSIONS_PER_WINDOW = 20;
const RATE_WINDOW_MS = 60_000;

// shortcut: one in-memory limit for the whole server and no accounts, enough for a local demo; add real auth before deploying.
const isWithinRateLimit = createRateLimiter({ limit: MAX_SESSIONS_PER_WINDOW, windowMs: RATE_WINDOW_MS });

function refuse(requestId: string, reason: string, status: number): Response {
  logEvent("warn", {
    msg: "Refused a voice session request",
    event_name: "voice_session.refused",
    request_id: requestId,
    data: { reason },
  });
  return Response.json({ error: "Could not start the voice session" }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  logEvent("info", {
    msg: "Requesting a temporary voice key",
    event_name: "voice_session.started",
    request_id: requestId,
  });

  if (!isSameOriginRequest(request.headers)) return refuse(requestId, "cross_origin", 403);
  if (!isWithinRateLimit(Date.now())) return refuse(requestId, "rate_limited", 429);

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
