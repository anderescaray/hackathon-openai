import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAgentConfig, type AgentConfig, type ToolDefinition } from "./agents.ts";

const TODAY = "2026-11-21";

const TENANT_FACTS = [
  "monthlyIncomeEur",
  "employmentContract",
  "occupants",
  "hasPets",
  "smokes",
  "moveInDate",
  "stayMonths",
];

const HOME_FACTS = [
  "monthlyRentEur",
  "district",
  "rentalType",
  "bedrooms",
  "sizeM2",
  "furnished",
  "availableFrom",
];

const DISTRICTS = [
  "ciutat_vella",
  "eixample",
  "sants_montjuic",
  "les_corts",
  "sarria_sant_gervasi",
  "gracia",
  "horta_guinardo",
  "nou_barris",
  "sant_andreu",
  "sant_marti",
];

function requireTool(config: AgentConfig, name: string): ToolDefinition {
  const tool = config.tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

test("the facts agent only has the tools to save and complete facts", () => {
  const config = buildAgentConfig("tenant", "facts", TODAY);

  assert.deepEqual(
    config.tools.map((tool) => tool.name),
    ["save_facts", "complete_facts"],
  );
});

test("the requirements agent only has the tools to save requirements and finish", () => {
  const config = buildAgentConfig("tenant", "requirements", TODAY);

  assert.deepEqual(
    config.tools.map((tool) => tool.name),
    ["save_requirement", "finish_interview"],
  );
});

test("every tool is a function definition with a description", () => {
  const config = buildAgentConfig("home", "facts", TODAY);

  for (const tool of config.tools) {
    assert.equal(tool.type, "function");
    assert.notEqual(tool.description, "");
  }
});

test("save_facts for a tenant accepts any subset of the tenant facts and nothing else", () => {
  const saveFacts = requireTool(buildAgentConfig("tenant", "facts", TODAY), "save_facts");

  assert.deepEqual(Object.keys(saveFacts.parameters.properties ?? {}), TENANT_FACTS);
  assert.equal(saveFacts.parameters.required, undefined);
  assert.equal(saveFacts.parameters.additionalProperties, false);
});

test("save_facts for a home accepts the home facts", () => {
  const saveFacts = requireTool(buildAgentConfig("home", "facts", TODAY), "save_facts");

  assert.deepEqual(Object.keys(saveFacts.parameters.properties ?? {}), HOME_FACTS);
});

test("save_requirement for a tenant only admits home facts as field", () => {
  const saveRequirement = requireTool(buildAgentConfig("tenant", "requirements", TODAY), "save_requirement");

  assert.deepEqual(saveRequirement.parameters.properties?.field, { type: "string", enum: HOME_FACTS });
  assert.deepEqual(saveRequirement.parameters.required, ["field", "operator", "value", "isMust"]);
});

test("save_requirement for a home only admits tenant facts as field", () => {
  const saveRequirement = requireTool(buildAgentConfig("home", "requirements", TODAY), "save_requirement");

  assert.deepEqual(saveRequirement.parameters.properties?.field, { type: "string", enum: TENANT_FACTS });
});

test("finish_interview requires the notes", () => {
  const finishInterview = requireTool(buildAgentConfig("tenant", "requirements", TODAY), "finish_interview");

  assert.deepEqual(finishInterview.parameters.required, ["notes"]);
});

test("the tenant facts script names every tenant fact and today's date", () => {
  const { instructions } = buildAgentConfig("tenant", "facts", TODAY);

  for (const fact of TENANT_FACTS) assert.match(instructions, new RegExp(`- ${fact}:`));
  assert.match(instructions, /2026-11-21/);
});

test("the home facts script names every home fact and every district", () => {
  const { instructions } = buildAgentConfig("home", "facts", TODAY);

  for (const fact of HOME_FACTS) assert.match(instructions, new RegExp(`- ${fact}:`));
  for (const district of DISTRICTS) assert.match(instructions, new RegExp(district));
});

test("the tenant requirements script lists the home facts it can put conditions on", () => {
  const { instructions } = buildAgentConfig("tenant", "requirements", TODAY);

  for (const fact of HOME_FACTS) assert.match(instructions, new RegExp(`- ${fact}:`));
  for (const district of DISTRICTS) assert.match(instructions, new RegExp(district));
});

test("the home requirements script lists the tenant facts it can put conditions on", () => {
  const { instructions } = buildAgentConfig("home", "requirements", TODAY);

  for (const fact of TENANT_FACTS) assert.match(instructions, new RegExp(`- ${fact}:`));
});

test("every script forbids asking about protected traits", () => {
  const configs = [
    buildAgentConfig("tenant", "facts", TODAY),
    buildAgentConfig("tenant", "requirements", TODAY),
    buildAgentConfig("home", "facts", TODAY),
    buildAgentConfig("home", "requirements", TODAY),
  ];

  for (const config of configs) {
    assert.match(config.instructions, /No preguntes ni apuntes nacionalidad, edad, género, hijos, religión ni salud/);
  }
});

test("no tool definition has a field for a protected trait", () => {
  const configs = [
    buildAgentConfig("tenant", "facts", TODAY),
    buildAgentConfig("tenant", "requirements", TODAY),
    buildAgentConfig("home", "facts", TODAY),
    buildAgentConfig("home", "requirements", TODAY),
  ];

  for (const config of configs) {
    assert.doesNotMatch(JSON.stringify(config.tools), /nationality|gender|children|religion|health|"age"/i);
  }
});

test("the farewell agent has no tools and is told to say goodbye", () => {
  const config = buildAgentConfig("tenant", "done", TODAY);

  assert.deepEqual(config.tools, []);
  assert.match(config.instructions, /Despídete/);
});
