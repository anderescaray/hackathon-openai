import { z } from "zod";

import type { AgentConfig, ToolDefinition } from "./agents.ts";
import type { ToolOutput } from "./interviewSession.ts";
import type { ToolCall } from "./toolCall.ts";

export type RealtimeToolCall = { callId: string; toolCall: ToolCall };

export type SessionUpdateEvent = {
  type: "session.update";
  session: { type: "realtime"; instructions: string; tools: ToolDefinition[]; tool_choice: "auto" };
};

export type ToolOutputEvent = {
  type: "conversation.item.create";
  item: { type: "function_call_output"; call_id: string; output: string };
};

export type ResponseCreateEvent = { type: "response.create" };

export type RealtimeClientEvent = SessionUpdateEvent | ToolOutputEvent | ResponseCreateEvent;

const serverEventSchema = z.looseObject({ type: z.string() });

const responseDoneSchema = z.looseObject({
  type: z.literal("response.done"),
  response: z.looseObject({ output: z.array(z.unknown()) }),
});

const functionCallItemSchema = z.looseObject({
  type: z.literal("function_call"),
  name: z.string(),
  call_id: z.string(),
  arguments: z.string(),
});

function parseArguments(argumentsJson: string): unknown {
  try {
    return JSON.parse(argumentsJson);
  } catch {
    // The agent sent broken JSON: null makes the tool reject it and tell the agent.
    return null;
  }
}

export function extractToolCalls(serverEvent: unknown): RealtimeToolCall[] {
  const responseDone = responseDoneSchema.safeParse(serverEvent);
  if (!responseDone.success) return [];

  return responseDone.data.response.output.flatMap((outputItem) => {
    const functionCall = functionCallItemSchema.safeParse(outputItem);
    if (!functionCall.success) return [];
    return [
      {
        callId: functionCall.data.call_id,
        toolCall: { name: functionCall.data.name, args: parseArguments(functionCall.data.arguments) },
      },
    ];
  });
}

export function buildSessionUpdate(config: AgentConfig): SessionUpdateEvent {
  return {
    type: "session.update",
    session: { type: "realtime", instructions: config.instructions, tools: config.tools, tool_choice: "auto" },
  };
}

export function buildToolOutputEvent(callId: string, output: ToolOutput): ToolOutputEvent {
  return {
    type: "conversation.item.create",
    item: { type: "function_call_output", call_id: callId, output: JSON.stringify(output) },
  };
}

export function readEventType(serverEvent: unknown): string | undefined {
  const parsed = serverEventSchema.safeParse(serverEvent);
  return parsed.success ? parsed.data.type : undefined;
}
