import { profileSchema, type Profile, type Role } from "../domain/profile.ts";
import type { InterviewPhase } from "./agents.ts";
import type { ProfileWrite, SaveResult } from "./profileApi.ts";
import { applyToolCall, findMissingFacts, type ToolCall } from "./toolCall.ts";

export type InterviewState = { phase: InterviewPhase; profile: Profile };

export type ToolOutput =
  | { ok: true; saved: string[]; missingFacts: string[] }
  | { ok: false; error: string; missingFacts: string[] };

export type ToolCallReply = { state: InterviewState; output: ToolOutput };

const TOOLS_BY_PHASE: Record<InterviewPhase, string[]> = {
  facts: ["save_facts", "complete_facts"],
  requirements: ["save_requirement", "finish_interview"],
  done: [],
};

const NEXT_PHASE_BY_TOOL: Record<string, InterviewPhase> = {
  complete_facts: "requirements",
  finish_interview: "done",
};

export function startInterview(role: Role, profileId: string): InterviewState {
  const profile = profileSchema.parse({
    id: profileId,
    role,
    displayName: "",
    photoUrls: [],
    notes: "",
    status: "draft",
    facts: {},
    requirements: [],
  });
  return { phase: "facts", profile };
}

export function handleToolCall(state: InterviewState, toolCall: ToolCall): ToolCallReply {
  if (!TOOLS_BY_PHASE[state.phase].includes(toolCall.name)) {
    return {
      state,
      output: {
        ok: false,
        error: `${toolCall.name} is not available in the ${state.phase} phase`,
        missingFacts: findMissingFacts(state.profile),
      },
    };
  }

  const outcome = applyToolCall(state.profile, toolCall);
  if (!outcome.ok) {
    return { state, output: { ok: false, error: outcome.error, missingFacts: outcome.missingFacts } };
  }
  return {
    state: { phase: NEXT_PHASE_BY_TOOL[toolCall.name] ?? state.phase, profile: outcome.profile },
    output: { ok: true, saved: outcome.saved, missingFacts: outcome.missingFacts },
  };
}

/** The server write for a tool call that changes the profile; complete_facts only reads it. */
export function toProfileWrite(toolCall: ToolCall): ProfileWrite | null {
  // Only called after handleToolCall accepted the call, so args is already a validated object.
  const args = toolCall.args as Record<string, unknown>;
  switch (toolCall.name) {
    case "save_facts":
      return { action: "set_facts", facts: args };
    case "save_requirement":
      return { action: "add_requirement", ...args };
    case "finish_interview":
      return { action: "finish_interview", notes: args.notes };
    default:
      return null;
  }
}

/**
 * Checks the tool call locally, then saves it on the server. The interview only moves on with the
 * profile the server stored; a server rejection goes back to the agent and nothing changes.
 */
export async function handleAndSaveToolCall(
  state: InterviewState,
  toolCall: ToolCall,
  save: (write: ProfileWrite) => Promise<SaveResult>,
): Promise<ToolCallReply> {
  const reply = handleToolCall(state, toolCall);
  const write = reply.output.ok ? toProfileWrite(toolCall) : null;
  if (!write) return reply;

  const saved = await save(write);
  if (!saved.ok) {
    return { state, output: { ok: false, error: saved.error, missingFacts: findMissingFacts(state.profile) } };
  }
  const missingFacts = findMissingFacts(saved.profile);
  return {
    state: { ...reply.state, profile: saved.profile },
    output: { ...reply.output, missingFacts },
  };
}
