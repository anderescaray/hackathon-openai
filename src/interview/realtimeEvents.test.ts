import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSessionUpdate, buildToolOutputEvent, extractToolCalls } from "./realtimeEvents.ts";

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
