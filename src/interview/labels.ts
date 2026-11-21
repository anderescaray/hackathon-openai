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
  monthlyIncomeEur: "Monthly income (€)",
  employmentContract: "Contract",
  occupants: "People",
  hasPets: "Pets",
  smokes: "Smokes",
  moveInDate: "Move-in date",
  stayMonths: "Stay (months)",
};

export const HOME_FACT_LABELS: Record<keyof HomeFacts, string> = {
  monthlyRentEur: "Monthly rent (€)",
  district: "District",
  rentalType: "Rental type",
  bedrooms: "Bedrooms",
  sizeM2: "Size (m²)",
  furnished: "Furnished",
  availableFrom: "Available from",
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
  permanent: "Permanent",
  temporary: "Temporary",
  self_employed: "Self-employed",
  student: "Student",
  unemployed: "Unemployed",
  entire_home: "Entire home",
  room: "Room",
};

const OPERATOR_PREFIXES: Record<RequirementOperator, string> = {
  eq: "",
  lte: "max ",
  gte: "min ",
  in: "",
};

export function formatValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
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
