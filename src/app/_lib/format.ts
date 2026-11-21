/**
 * English labels for every field and value in the shared contract (src/domain/profile.ts).
 * UI code must go through these helpers instead of printing raw enum values.
 * There are no age, nationality, gender or children fields, and there must never be labels for them.
 */
import type {
  District,
  EmploymentContract,
  HomeFacts,
  Profile,
  Role,
  TenantFacts,
} from "@/domain/profile";

type AnyRequirement = Profile["requirements"][number];

export const DISTRICT_LABELS: Record<District, string> = {
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

export const CONTRACT_LABELS: Record<EmploymentContract, string> = {
  permanent: "Permanent",
  temporary: "Temporary",
  self_employed: "Self-employed",
  student: "Student",
  unemployed: "Not working",
};

export const RENTAL_TYPE_LABELS: Record<HomeFacts["rentalType"], string> = {
  entire_home: "Entire home",
  room: "Room",
};

export const TENANT_FACT_LABELS: Record<keyof TenantFacts, string> = {
  monthlyIncomeEur: "Income",
  employmentContract: "Contract",
  occupants: "Household",
  hasPets: "Pets",
  smokes: "Smoking",
  moveInDate: "Moves in",
  stayMonths: "Stay",
};

export const HOME_FACT_LABELS: Record<keyof HomeFacts, string> = {
  monthlyRentEur: "Rent",
  district: "Area",
  rentalType: "Type",
  bedrooms: "Bedrooms",
  sizeM2: "Size",
  furnished: "Furnished",
  availableFrom: "Available",
};

/** Label for a requirement card in the interview ("Budget", "Area"…). */
export const REQUIREMENT_FIELD_LABELS: Record<string, string> = {
  monthlyRentEur: "Budget",
  district: "Area",
  rentalType: "Type",
  bedrooms: "Bedrooms",
  sizeM2: "Size",
  furnished: "Furnished",
  availableFrom: "Move-in",
  monthlyIncomeEur: "Income",
  employmentContract: "Contract",
  occupants: "Household",
  hasPets: "Pets",
  smokes: "Smoking",
  moveInDate: "Move-in",
  stayMonths: "Stay",
};

export const ROLE_LABELS: Record<Role, string> = { tenant: "Tenant", home: "Landlord" };

export function formatEur(amount: number): string {
  return `€${Math.round(amount).toLocaleString("en-GB")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-12-01" → "1 Dec". Parsed by hand so server and client render the same text. */
export function formatDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  if (!month || !day) return iso;
  return `${day} ${MONTHS[month - 1]}`;
}

/** "2027-01-01" → "January" (used in "Available by January"). */
export function formatMonth(iso: string): string {
  const month = Number(iso.split("-")[1]);
  return LONG_MONTHS[month - 1] ?? iso;
}

export function districtLabel(value: string): string {
  return DISTRICT_LABELS[value as District] ?? value;
}

export function districtList(values: string[]): string {
  const labels = values.map(districtLabel);
  if (labels.length <= 2) return labels.join(" or ");
  return `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}`;
}

/** Human value of a single fact: formatFactValue("monthlyRentEur", 950) → "€950". */
export function formatFactValue(field: string, value: unknown): string {
  if (value === undefined || value === null) return "—";
  switch (field) {
    case "monthlyRentEur":
    case "monthlyIncomeEur":
      return formatEur(Number(value));
    case "district":
      return districtLabel(String(value));
    case "rentalType":
      return RENTAL_TYPE_LABELS[value as HomeFacts["rentalType"]] ?? String(value);
    case "employmentContract":
      return CONTRACT_LABELS[value as EmploymentContract] ?? String(value);
    case "sizeM2":
      return `${value} m²`;
    case "bedrooms":
      return Number(value) === 0 ? "Studio" : `${value} bed`;
    case "occupants":
      return Number(value) === 1 ? "1 person" : `${value} people`;
    case "stayMonths":
      return `${value} months`;
    case "availableFrom":
    case "moveInDate":
      return formatDate(String(value));
    case "hasPets":
      return value ? "Has pets" : "No pets";
    case "smokes":
      return value ? "Smokes" : "No smoking";
    case "furnished":
      return value ? "Yes" : "No";
    default:
      if (typeof value === "boolean") return value ? "Yes" : "No";
      if (Array.isArray(value)) return value.join(", ");
      return String(value);
  }
}

/**
 * Full sentence for a requirement, as in the "Fits you" sheet:
 * { monthlyRentEur lte 1000 } → "Rent under €1,000"; { district in [gracia, eixample] } → "Gràcia or Eixample".
 */
export function requirementLabel(requirement: AnyRequirement): string {
  const { field, operator, value } = requirement;
  const list = Array.isArray(value) ? value.map(String) : [String(value)];
  switch (field) {
    case "monthlyRentEur":
      return operator === "lte" ? `Rent under ${formatEur(Number(value))}` : `Rent from ${formatEur(Number(value))}`;
    case "district":
      return districtList(list);
    case "rentalType":
      return list.map((v) => RENTAL_TYPE_LABELS[v as HomeFacts["rentalType"]] ?? v).join(" or ");
    case "bedrooms":
      return operator === "gte" ? `${value}+ bedrooms` : `Up to ${value} bedrooms`;
    case "sizeM2":
      return operator === "gte" ? `${value} m²+` : `Up to ${value} m²`;
    case "furnished":
      return value ? "Furnished" : "Unfurnished";
    case "availableFrom":
      return operator === "lte" ? `Available by ${formatMonth(String(value))}` : `Available from ${formatDate(String(value))}`;
    case "monthlyIncomeEur":
      return `Income ${formatEur(Number(value))}+`;
    case "employmentContract":
      return `${list.map((v) => CONTRACT_LABELS[v as EmploymentContract] ?? v).join(" or ")} contract`;
    case "occupants":
      return operator === "lte" ? `Up to ${value} ${Number(value) === 1 ? "person" : "people"}` : `${value}+ people`;
    case "hasPets":
      return value ? "Has pets" : "No pets";
    case "smokes":
      return value ? "Smoker" : "No smoking";
    case "moveInDate":
      return operator === "lte" ? `Moves in by ${formatDate(String(value))}` : `Moves in from ${formatDate(String(value))}`;
    case "stayMonths":
      return operator === "gte" ? `${value}+ months` : `Up to ${value} months`;
    default:
      return `${field} ${operator} ${list.join(", ")}`;
  }
}

/** Short chip text for the home card: "Under €1,000", "Gràcia", "Entire home". */
export function requirementChip(requirement: AnyRequirement, otherFacts: Record<string, unknown>): string {
  if (requirement.field === "monthlyRentEur" && requirement.operator === "lte") {
    return `Under ${formatEur(Number(requirement.value))}`;
  }
  const actual = otherFacts[requirement.field];
  if (actual !== undefined && requirement.field !== "furnished") return formatFactValue(requirement.field, actual);
  return requirementLabel(requirement);
}

/** Value shown on an interview card: "≤ €1,000", "Gràcia, Eixample", "Yes". */
export function requirementValue(requirement: AnyRequirement): string {
  const { field, operator, value } = requirement;
  if (Array.isArray(value)) return value.map((v) => formatFactValue(field, v)).join(", ");
  const formatted = formatFactValue(field, value);
  if (operator === "lte") return `≤ ${formatted}`;
  if (operator === "gte") return `≥ ${formatted}`;
  return formatted;
}

/** "Entire home · 68 m² · Furnished" */
export function homeSummary(facts: Partial<HomeFacts>): string {
  const parts: string[] = [];
  if (facts.rentalType) parts.push(RENTAL_TYPE_LABELS[facts.rentalType]);
  if (facts.sizeM2) parts.push(`${facts.sizeM2} m²`);
  if (facts.furnished !== undefined) parts.push(facts.furnished ? "Furnished" : "Unfurnished");
  return parts.join(" · ");
}

/** "LM" from "Laura M." */
export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

/** "3.1× rent" */
export function incomeRatio(income: number | undefined, rent: number | undefined): string | null {
  if (!income || !rent) return null;
  return `${(income / rent).toFixed(1)}× rent`;
}

/** "1 · no pets" for the household tile. */
export function householdSummary(facts: Partial<TenantFacts>): string {
  const parts: string[] = [];
  if (facts.occupants !== undefined) parts.push(String(facts.occupants));
  if (facts.hasPets !== undefined) parts.push(facts.hasPets ? "pets" : "no pets");
  return parts.join(" · ") || "—";
}

/** "1 Dec · 12+ mo" for the moves-in tile. */
export function moveInSummary(facts: Partial<TenantFacts>): string {
  const parts: string[] = [];
  if (facts.moveInDate) parts.push(formatDate(facts.moveInDate));
  if (facts.stayMonths) parts.push(`${facts.stayMonths}+ mo`);
  return parts.join(" · ") || "—";
}
