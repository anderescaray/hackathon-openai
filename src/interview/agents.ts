import { z } from "zod";

import {
  DISTRICTS,
  EMPLOYMENT_CONTRACTS,
  RENTAL_TYPES,
  homeFactsSchema,
  homeRequirementSchema,
  tenantFactsSchema,
  tenantRequirementSchema,
  type HomeFacts,
  type Role,
  type TenantFacts,
} from "../domain/profile.ts";

export const INTERVIEW_PHASES = ["facts", "requirements", "done"] as const;
export type InterviewPhase = (typeof INTERVIEW_PHASES)[number];

export type ToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: z.core.JSONSchema.JSONSchema;
};

export type AgentConfig = { instructions: string; tools: ToolDefinition[] };

const LANGUAGE_RULE =
  "Always speak in English, even if the person speaks another language. Never switch languages.";

const PROTECTED_TRAITS_LIMIT =
  "Do not ask about or note down nationality, age, gender, children, religion or health. If the person mentions any of them, carry on without commenting and leave it out of the notes.";

const TENANT_FACT_HINTS: Record<keyof TenantFacts, string> = {
  monthlyIncomeEur: "net monthly income, in euros",
  employmentContract: `type of contract: ${EMPLOYMENT_CONTRACTS.join(", ")}`,
  occupants: "how many people will live in the home",
  hasPets: "whether they have pets",
  smokes: "whether they smoke",
  moveInDate: "when they want to move in; you turn it into a YYYY-MM-DD date",
  stayMonths: "how many months they plan to stay",
};

const HOME_FACT_HINTS: Record<keyof HomeFacts, string> = {
  monthlyRentEur: "monthly rent, in euros",
  district: `Barcelona district: ${DISTRICTS.join(", ")}`,
  rentalType: `what is being rented: ${RENTAL_TYPES.join(" or ")} (whole flat or a room)`,
  bedrooms: "number of bedrooms",
  sizeM2: "size in square metres",
  furnished: "whether it is furnished",
  availableFrom: "when it is available from; you turn it into a YYYY-MM-DD date",
};

const HOME_REQUIREMENT_HINTS: Record<keyof HomeFacts, string> = {
  monthlyRentEur: "maximum rent (lte)",
  district: `areas that work for them (in), from this list: ${DISTRICTS.join(", ")}`,
  rentalType: `whole flat or a room (eq): ${RENTAL_TYPES.join(" or ")}`,
  bedrooms: "minimum bedrooms (gte)",
  sizeM2: "minimum square metres (gte)",
  furnished: "furnished or not (eq)",
  availableFrom: "available by a date at the latest (lte); you turn it into YYYY-MM-DD",
};

const TENANT_REQUIREMENT_HINTS: Record<keyof TenantFacts, string> = {
  monthlyIncomeEur: "minimum monthly income (gte)",
  employmentContract: `contract types they accept (in), from this list: ${EMPLOYMENT_CONTRACTS.join(", ")}`,
  occupants: "maximum number of people (lte)",
  hasPets: "if they do not accept pets: eq false",
  smokes: "if they do not accept smokers: eq false",
  moveInDate: "moves in by a date at the latest (lte); you turn it into YYYY-MM-DD",
  stayMonths: "minimum stay in months (gte)",
};

function formatHints(hints: Record<string, string>): string {
  return Object.entries(hints)
    .map(([field, hint]) => `- ${field}: ${hint}`)
    .join("\n");
}

function buildParameters(schema: z.ZodType): z.core.JSONSchema.JSONSchema {
  const parameters = { ...z.toJSONSchema(schema) };
  delete parameters.$schema;
  return parameters;
}

const TONE = `# Tone
Warm and brief. Casual. One question at a time. ${LANGUAGE_RULE} Never say you are saving or noting something down, and never talk about formats or tools: just keep the conversation going.`;

function buildFactsInstructions(role: Role, today: string): string {
  const isTenant = role === "tenant";
  return `# Role
You are the interviewer for a rental app in Barcelona. You are talking to someone who ${
    isTenant
      ? "is looking for a home. In this part you only want to get to know them: who they are and what their situation is."
      : "is renting out their home. In this part you only want to learn about the home they are offering."
  }

${TONE}

# Facts you need
${formatHints(isTenant ? TENANT_FACT_HINTS : HOME_FACT_HINTS)}

Today is ${today}.

# How
- Introduce yourself in one sentence and ask an open question about ${isTenant ? "their situation" : "the home"}.
- Every time they give one or more facts, call save_facts with all of them. Do not say you are saving them or ask for permission.
- Talk like in a conversation: never name the fields or ask for a format.
- The tool response says what is missing. Ask about the next thing.
- If a fact is vague ("${isTenant ? "I earn a good salary" : "it's big"}"), ask for the number. Do not assume anything.
- If the tool returns an error, correct it or ask again.
- When nothing is missing, call complete_facts.

# Limits
- ${PROTECTED_TRAITS_LIMIT}
- Do not talk yet about what kind of ${isTenant ? "home" : "tenant"} they are looking for.`;
}

function buildRequirementsInstructions(role: Role, today: string): string {
  const isTenant = role === "tenant";
  return `# Role
You are the interviewer for a rental app in Barcelona. You already know ${
    isTenant
      ? "the person. Now you find out what they are looking for in a home."
      : "the home. Now you find out what they ask of whoever rents it."
  }

${TONE}

# What they can set conditions on
${formatHints(isTenant ? HOME_REQUIREMENT_HINTS : TENANT_REQUIREMENT_HINTS)}

Today is ${today}.

# How
- Ask an open question about what matters to them.
- For each thing, turn it into a field, an operator and a value. Ask "is that a must or a nice-to-have?", unless they have already made it clear. Then call save_requirement, without saying you are saving it.
- ${
    isTenant
      ? 'If they say "close to my university", ask which areas work for them.'
      : 'If they say "someone reliable", ask what minimum income they require.'
  }
- If the tool returns an error, correct it or ask again.
- Do not go through the fields one by one. When they finish telling you, ask once whether there is anything else important.
- Talk like in a conversation: never name the fields or ask for a format.
- Keep anything that does not fit any field for the notes.
- When they have nothing more, ask "anything you'd like to add?" and call finish_interview with the notes.

# Limits
- ${PROTECTED_TRAITS_LIMIT}
- If they ask to filter by any of those traits, say the app does not filter by that and move on.`;
}

function buildFactsTools(role: Role): ToolDefinition[] {
  const factsSchema = role === "tenant" ? tenantFactsSchema : homeFactsSchema;
  return [
    {
      type: "function",
      name: "save_facts",
      description: "Saves one or more facts the person has just said.",
      parameters: buildParameters(factsSchema.partial()),
    },
    {
      type: "function",
      name: "complete_facts",
      description: "Closes this part of the interview. Only accepted when no fact is missing.",
      parameters: buildParameters(z.strictObject({})),
    },
  ];
}

function buildRequirementsTools(role: Role): ToolDefinition[] {
  const requirementSchema = role === "tenant" ? tenantRequirementSchema : homeRequirementSchema;
  return [
    {
      type: "function",
      name: "save_requirement",
      description:
        "Saves a condition the person sets on the other side. isMust is true if it is a must and false if it is a preference.",
      parameters: buildParameters(requirementSchema),
    },
    {
      type: "function",
      name: "finish_interview",
      description: "Ends the interview. notes holds what the person said that does not fit any field.",
      parameters: buildParameters(z.strictObject({ notes: z.string() })),
    },
  ];
}

const FAREWELL_INSTRUCTIONS = `The interview is over and the profile is saved. Say goodbye in one sentence, in English and in a casual tone: tell them they can now see their best matches. Do not ask anything else. ${LANGUAGE_RULE}`;

export function buildAgentConfig(role: Role, phase: InterviewPhase, today: string): AgentConfig {
  if (phase === "done") return { instructions: FAREWELL_INSTRUCTIONS, tools: [] };
  if (phase === "facts") {
    return { instructions: buildFactsInstructions(role, today), tools: buildFactsTools(role) };
  }
  return { instructions: buildRequirementsInstructions(role, today), tools: buildRequirementsTools(role) };
}
