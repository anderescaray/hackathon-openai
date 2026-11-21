import assert from "node:assert/strict";
import { test } from "node:test";

import { createVoiceClientSecret } from "./voiceSession.ts";

type RecordedRequest = { url: string; headers: Headers; body: unknown };

function makeFakeOpenAi(respond: () => Response | Promise<Response>): {
  fetchFn: typeof fetch;
  requests: RecordedRequest[];
} {
  const requests: RecordedRequest[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    requests.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)),
    });
    return respond();
  };
  return { fetchFn, requests };
}

test("returns the temporary key that OpenAI issues", async () => {
  const openAi = makeFakeOpenAi(() => Response.json({ value: "ek_test_123", expires_at: 1795000000 }));

  const outcome = await createVoiceClientSecret({ apiKey: "sk-test", fetchFn: openAi.fetchFn });

  assert.deepEqual(outcome, { ok: true, clientSecret: "ek_test_123", expiresAt: 1795000000 });
});

test("asks OpenAI for a realtime session with the server key", async () => {
  const openAi = makeFakeOpenAi(() => Response.json({ value: "ek_test_123", expires_at: 1795000000 }));

  await createVoiceClientSecret({ apiKey: "sk-test", fetchFn: openAi.fetchFn });

  assert.equal(openAi.requests.length, 1);
  assert.equal(openAi.requests[0].url, "https://api.openai.com/v1/realtime/client_secrets");
  assert.equal(openAi.requests[0].headers.get("authorization"), "Bearer sk-test");
  assert.deepEqual(openAi.requests[0].body, {
    expires_after: { anchor: "created_at", seconds: 120 },
    session: { type: "realtime", model: "gpt-realtime-2.1", audio: { output: { voice: "marin" } } },
  });
});

test("fails without calling OpenAI when the server key is missing", async () => {
  const openAi = makeFakeOpenAi(() => Response.json({ value: "ek_test_123", expires_at: 1795000000 }));

  const outcome = await createVoiceClientSecret({ apiKey: undefined, fetchFn: openAi.fetchFn });

  assert.deepEqual(outcome, { ok: false, reason: "missing_api_key", detail: "OPENAI_API_KEY is not set" });
  assert.equal(openAi.requests.length, 0);
});

test("fails when OpenAI answers with an error status", async () => {
  const openAi = makeFakeOpenAi(() => Response.json({ error: { message: "bad key" } }, { status: 401 }));

  const outcome = await createVoiceClientSecret({ apiKey: "sk-test", fetchFn: openAi.fetchFn });

  assert.deepEqual(outcome, { ok: false, reason: "openai_error", detail: "OpenAI answered with status 401" });
});

test("fails when OpenAI cannot be reached", async () => {
  const openAi = makeFakeOpenAi(() => {
    throw new TypeError("fetch failed");
  });

  const outcome = await createVoiceClientSecret({ apiKey: "sk-test", fetchFn: openAi.fetchFn });

  assert.deepEqual(outcome, { ok: false, reason: "openai_error", detail: "fetch failed" });
});

test("fails when the answer from OpenAI has no temporary key", async () => {
  const openAi = makeFakeOpenAi(() => Response.json({ expires_at: 1795000000 }));

  const outcome = await createVoiceClientSecret({ apiKey: "sk-test", fetchFn: openAi.fetchFn });

  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok ? "" : outcome.reason, "invalid_response");
});

test("fails when OpenAI answers with a body that is not JSON", async () => {
  const openAi = makeFakeOpenAi(() => new Response("<html>gateway</html>", { status: 200 }));

  const outcome = await createVoiceClientSecret({ apiKey: "sk-test", fetchFn: openAi.fetchFn });

  assert.deepEqual(outcome, { ok: false, reason: "invalid_response", detail: "OpenAI answered with a body that is not JSON" });
});
