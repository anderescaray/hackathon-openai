import type { Profile } from "../domain/profile.ts";
import { meetsRequirement, type FactField, type Requirement } from "./requirements.ts";

const FIELD_LABELS: Record<FactField, string> = {
  monthlyIncomeEur: "ingresos",
  employmentContract: "contrato",
  occupants: "número de ocupantes",
  hasPets: "mascotas",
  smokes: "tabaco",
  moveInDate: "fecha de entrada",
  stayMonths: "estancia",
  monthlyRentEur: "alquiler",
  district: "barrio",
  rentalType: "tipo de alquiler",
  bedrooms: "habitaciones",
  sizeM2: "superficie",
  furnished: "amueblado",
  availableFrom: "disponibilidad",
};

const VALUE_LABELS: Record<string, string> = {
  permanent: "indefinido",
  temporary: "temporal",
  self_employed: "autónomo",
  student: "estudiante",
  unemployed: "sin empleo",
  entire_home: "piso entero",
  room: "habitación",
  ciutat_vella: "Ciutat Vella",
  eixample: "Eixample",
  sants_montjuic: "Sants-Montjuïc",
  les_corts: "Les Corts",
  sarria_sant_gervasi: "Sarrià-Sant Gervasi",
  gracia: "Gràcia",
  horta_guinardo: "Horta-Guinardó",
  nou_barris: "Nou Barris",
  sant_andreu: "Sant Andreu",
  sant_marti: "Sant Martí",
};

function formatValue(field: FactField, value: unknown): string {
  if (typeof value === "boolean") return value ? "sí" : "no";
  if (typeof value === "number") {
    if (field === "monthlyIncomeEur" || field === "monthlyRentEur") return `${value} €`;
    if (field === "sizeM2") return `${value} m²`;
    if (field === "stayMonths") return `${value} meses`;
    return String(value);
  }
  if (typeof value === "string") {
    const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (date) return `${date[3]}/${date[2]}/${date[1]}`;
    return VALUE_LABELS[value] ?? value;
  }
  return String(value);
}

// The viewer asked for this and the other side meets it.
function ownRequirementReason(requirement: Requirement, otherFacts: Profile["facts"]): string {
  const { field, operator, value } = requirement;
  const label = FIELD_LABELS[field];
  if (operator === "lte") return `Cumple tu máximo de ${label}: ${formatValue(field, value)}`;
  if (operator === "gte") return `Cumple tu mínimo de ${label}: ${formatValue(field, value)}`;
  const actual = (otherFacts as Partial<Record<FactField, unknown>>)[field];
  return `${capitalize(label)}: ${formatValue(field, actual)}, como pides`;
}

// The other side asked for this and the viewer meets it.
function theirRequirementReason(requirement: Requirement, viewerFacts: Profile["facts"]): string {
  const { field, operator, value } = requirement;
  const label = FIELD_LABELS[field];
  if (operator === "lte") return `Cumples su máximo de ${label}: ${formatValue(field, value)}`;
  if (operator === "gte") return `Cumples su mínimo de ${label}: ${formatValue(field, value)}`;
  const actual = (viewerFacts as Partial<Record<FactField, unknown>>)[field];
  return `Cumples lo que pide sobre ${label}: ${formatValue(field, actual)}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Spanish sentences from the requirements each side meets, the viewer's own first. */
export function buildReasons(viewer: Profile, other: Profile): string[] {
  const own = (viewer.requirements as Requirement[])
    .filter((requirement) => meetsRequirement(other.facts, requirement))
    .map((requirement) => ownRequirementReason(requirement, other.facts));
  const theirs = (other.requirements as Requirement[])
    .filter((requirement) => meetsRequirement(viewer.facts, requirement))
    .map((requirement) => theirRequirementReason(requirement, viewer.facts));
  return [...own, ...theirs];
}
