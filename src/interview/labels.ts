import type {
  District,
  EmploymentContract,
  HomeFacts,
  TenantFacts,
} from "../domain/profile.ts";
import { RENTAL_TYPES, REQUIREMENT_OPERATORS } from "../domain/profile.ts";

type RentalType = (typeof RENTAL_TYPES)[number];
type RequirementOperator = (typeof REQUIREMENT_OPERATORS)[number];

export const TENANT_FACT_LABELS: Record<keyof TenantFacts, string> = {
  monthlyIncomeEur: "Ingresos al mes (€)",
  employmentContract: "Contrato",
  occupants: "Personas",
  hasPets: "Mascotas",
  smokes: "Fuma",
  moveInDate: "Fecha de entrada",
  stayMonths: "Estancia (meses)",
};

export const HOME_FACT_LABELS: Record<keyof HomeFacts, string> = {
  monthlyRentEur: "Alquiler al mes (€)",
  district: "Distrito",
  rentalType: "Se alquila",
  bedrooms: "Habitaciones",
  sizeM2: "Superficie (m²)",
  furnished: "Amueblado",
  availableFrom: "Disponible desde",
};

const FIELD_LABELS: Record<string, string> = { ...TENANT_FACT_LABELS, ...HOME_FACT_LABELS };

const VALUE_LABELS: Record<District | EmploymentContract | RentalType, string> = {
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
  permanent: "Indefinido",
  temporary: "Temporal",
  self_employed: "Autónomo",
  student: "Estudiante",
  unemployed: "Sin empleo",
  entire_home: "Piso entero",
  room: "Habitación",
};

const OPERATOR_PREFIXES: Record<RequirementOperator, string> = {
  eq: "",
  lte: "máximo ",
  gte: "mínimo ",
  in: "",
};

export function formatValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "string") {
    const valueLabels: Record<string, string> = VALUE_LABELS;
    return valueLabels[value] ?? value;
  }
  return String(value);
}

export function formatRequirement(requirement: {
  field: string;
  operator: RequirementOperator;
  value: unknown;
}): string {
  const fieldLabel = FIELD_LABELS[requirement.field] ?? requirement.field;
  return `${fieldLabel}: ${OPERATOR_PREFIXES[requirement.operator]}${formatValue(requirement.value)}`;
}
