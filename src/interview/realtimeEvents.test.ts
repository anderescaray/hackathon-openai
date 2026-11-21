import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildSessionUpdate,
  buildToolOutputEvent,
  extractToolCalls,
  readServerError,
  trackFarewell,
} from "./realtimeEvents.ts";

test("extracts the tool calls of a finished response with their arguments parsed", () => {
  const serverEvent = {
    type: "response.done",
    response: {
      output: [
        {
          type: "function_call",
          name: "save_facts",
          call_id: "call_1",
          arguments: '{"monthlyIncomeEur":2800,"hasPets":false}',
        },
        { type: "function_call", name: "complete_facts", call_id: "call_2", arguments: "{}" },
      ],
    },
  };

  assert.deepEqual(extractToolCalls(serverEvent), [
    { callId: "call_1", toolCall: { name: "save_facts", args: { monthlyIncomeEur: 2800, hasPets: false } } },
    { callId: "call_2", toolCall: { name: "complete_facts", args: {} } },
  ]);
});

test("finds no tool calls in a response where the agent only speaks", () => {
  const serverEvent = {
    type: "response.done",
    response: { output: [{ type: "message", role: "assistant", content: [] }] },
  };

  assert.deepEqual(extractToolCalls(serverEvent), []);
});

test("finds no tool calls in other server events", () => {
  assert.deepEqual(extractToolCalls({ type: "session.updated", session: {} }), []);
  assert.deepEqual(extractToolCalls("not an event"), []);
});

test("passes null arguments when the agent sends arguments that are not JSON", () => {
  const serverEvent = {
    type: "response.done",
    response: {
      output: [{ type: "function_call", name: "save_facts", call_id: "call_1", arguments: "{broken" }],
    },
  };

  assert.deepEqual(extractToolCalls(serverEvent), [
    { callId: "call_1", toolCall: { name: "save_facts", args: null } },
  ]);
});

test("builds the event that gives an agent its script and tools", () => {
  const tools = [
    {
      type: "function" as const,
      name: "complete_facts",
      description: "Cierra esta parte.",
      parameters: { type: "object" as const, properties: {} },
    },
  ];

  assert.deepEqual(buildSessionUpdate({ instructions: "Eres la entrevistadora.", tools }), {
    type: "session.update",
    session: { type: "realtime", instructions: "Eres la entrevistadora.", tools, tool_choice: "auto" },
  });
});

test("builds the event that returns a tool result to the agent as JSON text", () => {
  const event = buildToolOutputEvent("call_1", { ok: true, saved: ["hasPets"], missingFacts: [] });

  assert.deepEqual(event, {
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id: "call_1",
      output: '{"ok":true,"saved":["hasPets"],"missingFacts":[]}',
    },
  });
});

test("the farewell is not finished when the audio of an earlier response stops", () => {
  const started = trackFarewell(
    { farewellResponseId: undefined, isFinished: false },
    { type: "response.created", response: { id: "resp_farewell" } },
  );

  const progress = trackFarewell(started, { type: "output_audio_buffer.stopped", response_id: "resp_earlier" });

  assert.deepEqual(progress, { farewellResponseId: "resp_farewell", isFinished: false });
});

test("the farewell is finished when its own audio stops", () => {
  const started = trackFarewell(
    { farewellResponseId: undefined, isFinished: false },
    { type: "response.created", response: { id: "resp_farewell" } },
  );

  const progress = trackFarewell(started, { type: "output_audio_buffer.stopped", response_id: "resp_farewell" });

  assert.deepEqual(progress, { farewellResponseId: "resp_farewell", isFinished: true });
});

test("the farewell is not finished by audio that stops before the farewell starts", () => {
  const progress = trackFarewell(
    { farewellResponseId: undefined, isFinished: false },
    { type: "output_audio_buffer.stopped", response_id: "resp_earlier" },
  );

  assert.deepEqual(progress, { farewellResponseId: undefined, isFinished: false });
});

test("reads the message of an error event from the server", () => {
  const message = readServerError({ type: "error", error: { type: "invalid_request_error", message: "bad tools" } });

  assert.equal(message, "bad tools");
});

test("reads no error from other server events", () => {
  assert.equal(readServerError({ type: "response.done", response: { output: [] } }), undefined);
});
