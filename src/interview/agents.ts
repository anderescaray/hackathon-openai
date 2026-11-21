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

export const INTERVIEW_PHASES = ["facts", "requirements"] as const;
export type InterviewPhase = (typeof INTERVIEW_PHASES)[number];

export type ToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: z.core.JSONSchema.JSONSchema;
};

export type AgentConfig = { instructions: string; tools: ToolDefinition[] };

const PROTECTED_TRAITS_LIMIT =
  "No preguntes ni apuntes nacionalidad, edad, género, hijos, religión ni salud. Si lo menciona, sigue sin comentarlo.";

const TENANT_FACT_HINTS: Record<keyof TenantFacts, string> = {
  monthlyIncomeEur: "ingresos netos al mes, en euros",
  employmentContract: `tipo de contrato: ${EMPLOYMENT_CONTRACTS.join(", ")}`,
  occupants: "cuántas personas vivirán en el piso",
  hasPets: "si tiene mascotas",
  smokes: "si fuma",
  moveInDate: "cuándo quiere entrar, como fecha AAAA-MM-DD",
  stayMonths: "cuántos meses piensa quedarse",
};

const HOME_FACT_HINTS: Record<keyof HomeFacts, string> = {
  monthlyRentEur: "alquiler al mes, en euros",
  district: `distrito de Barcelona: ${DISTRICTS.join(", ")}`,
  rentalType: `qué se alquila: ${RENTAL_TYPES.join(" o ")} (piso entero o habitación)`,
  bedrooms: "número de habitaciones",
  sizeM2: "metros cuadrados",
  furnished: "si está amueblado",
  availableFrom: "desde cuándo está disponible, como fecha AAAA-MM-DD",
};

const HOME_REQUIREMENT_HINTS: Record<keyof HomeFacts, string> = {
  monthlyRentEur: "alquiler máximo (lte)",
  district: `zonas que le valen (in), de esta lista: ${DISTRICTS.join(", ")}`,
  rentalType: `piso entero o habitación (eq): ${RENTAL_TYPES.join(" o ")}`,
  bedrooms: "habitaciones mínimas (gte)",
  sizeM2: "metros mínimos (gte)",
  furnished: "amueblado o no (eq)",
  availableFrom: "disponible como tarde en una fecha AAAA-MM-DD (lte)",
};

const TENANT_REQUIREMENT_HINTS: Record<keyof TenantFacts, string> = {
  monthlyIncomeEur: "ingresos mínimos al mes (gte)",
  employmentContract: `tipos de contrato que acepta (in), de esta lista: ${EMPLOYMENT_CONTRACTS.join(", ")}`,
  occupants: "máximo de personas (lte)",
  hasPets: "si no acepta mascotas: eq false",
  smokes: "si no acepta fumadores: eq false",
  moveInDate: "que entre como tarde en una fecha AAAA-MM-DD (lte)",
  stayMonths: "estancia mínima en meses (gte)",
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

function buildFactsInstructions(role: Role, today: string): string {
  const isTenant = role === "tenant";
  return `# Rol
Eres la entrevistadora de una app de alquiler en Barcelona. Hablas con alguien que ${
    isTenant
      ? "busca piso. En esta parte solo quieres conocerle: quién es y cuál es su situación."
      : "alquila su piso. En esta parte solo quieres conocer la casa que ofrece."
  }

# Tono
Cercana y breve. De tú. Una pregunta cada vez. Español de España.

# Datos que necesitas
${formatHints(isTenant ? TENANT_FACT_HINTS : HOME_FACT_HINTS)}

Hoy es ${today}.

# Cómo
- Preséntate en una frase y pregunta en abierto por ${isTenant ? "su situación" : "la casa"}.
- Cada vez que diga uno o varios datos, llama a save_facts con todos. No lo anuncies ni pidas permiso.
- La respuesta de la herramienta dice qué falta. Pregunta por lo siguiente.
- Si un dato es vago ("${isTenant ? "gano bien" : "es grande"}"), pide la cifra. No supongas nada.
- Si la herramienta devuelve un error, corrige o vuelve a preguntar.
- Cuando no falte nada, llama a complete_facts.

# Límites
- ${PROTECTED_TRAITS_LIMIT}
- No hables todavía de qué ${isTenant ? "piso" : "inquilino"} busca.`;
}

function buildRequirementsInstructions(role: Role, today: string): string {
  const isTenant = role === "tenant";
  return `# Rol
Eres la entrevistadora de una app de alquiler en Barcelona. Ya conoces ${
    isTenant ? "a la persona. Ahora averiguas qué busca en un piso." : "la casa. Ahora averiguas qué pide a quien la alquile."
  }

# Tono
Cercana y breve. De tú. Una pregunta cada vez. Español de España.

# Sobre qué puede poner condiciones
${formatHints(isTenant ? HOME_REQUIREMENT_HINTS : TENANT_REQUIREMENT_HINTS)}

Hoy es ${today}.

# Cómo
- Pregunta en abierto qué es importante para él o ella.
- Por cada cosa, conviértela en campo, operador y valor. Pregunta "¿es imprescindible o lo prefieres?", salvo que ya lo haya dejado claro. Después llama a save_requirement.
- ${
    isTenant
      ? 'Si dice "cerca de mi universidad", pregunta qué zonas le valen.'
      : 'Si dice "alguien solvente", pregunta qué ingresos mínimos pide.'
  }
- Si la herramienta devuelve un error, corrige o vuelve a preguntar.
- Lo que no encaje en ningún campo, guárdalo para las notas.
- Cuando no tenga más, pregunta "¿quieres añadir algo?" y llama a finish_interview con las notas.

# Límites
- ${PROTECTED_TRAITS_LIMIT}
- Si pide filtrar por alguno de esos rasgos, di que la app no filtra por eso y sigue.`;
}

function buildFactsTools(role: Role): ToolDefinition[] {
  const factsSchema = role === "tenant" ? tenantFactsSchema : homeFactsSchema;
  return [
    {
      type: "function",
      name: "save_facts",
      description: "Guarda uno o varios datos que la persona acaba de decir.",
      parameters: buildParameters(factsSchema.partial()),
    },
    {
      type: "function",
      name: "complete_facts",
      description: "Cierra esta parte de la entrevista. Solo se acepta cuando no falta ningún dato.",
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
        "Guarda una condición que la persona pone sobre el otro lado. isMust es true si es imprescindible y false si es una preferencia.",
      parameters: buildParameters(requirementSchema),
    },
    {
      type: "function",
      name: "finish_interview",
      description: "Termina la entrevista. notes lleva lo que la persona ha dicho y no encaja en ningún campo.",
      parameters: buildParameters(z.strictObject({ notes: z.string() })),
    },
  ];
}

export function buildAgentConfig(role: Role, phase: InterviewPhase, today: string): AgentConfig {
  if (phase === "facts") {
    return { instructions: buildFactsInstructions(role, today), tools: buildFactsTools(role) };
  }
  return { instructions: buildRequirementsInstructions(role, today), tools: buildRequirementsTools(role) };
}
