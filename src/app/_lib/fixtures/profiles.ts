/**
 * Fake profiles for "mock" mode and as plan B for the demo. Validated with the shared zod schemas at load,
 * so a typo breaks the build instead of the demo.
 * Photos: /homes/<homeId>-<n>.jpg (public/homes). No person photos, ever.
 */
import {
  homeProfileSchema,
  tenantProfileSchema,
  type HomeProfile,
  type TenantProfile,
} from "@/domain/profile";

const P1 = "/homes/placeholder-1.jpg";
const P2 = "/homes/placeholder-2.jpg";

/** The tenant who does the live interview in the demo (Laura). */
export const DEMO_TENANT_ID = "tenant-demo";
/** The demo landlord's main listing (Marta's flat). Window 2 of the demo runs as this profile. */
export const DEMO_HOME_ID = "home-01";

export const demoTenant: TenantProfile = tenantProfileSchema.parse({
  id: DEMO_TENANT_ID,
  role: "tenant",
  displayName: "Laura M.",
  photoUrls: [],
  status: "complete",
  notes: "I work from home two days a week, I'm quiet and I look after plants.",
  facts: {
    monthlyIncomeEur: 2900,
    employmentContract: "permanent",
    occupants: 1,
    hasPets: false,
    smokes: false,
    moveInDate: "2026-12-01",
    stayMonths: 12,
  },
  requirements: [
    { field: "monthlyRentEur", operator: "lte", value: 1000, isMust: true },
    { field: "district", operator: "in", value: ["gracia", "eixample"], isMust: true },
    { field: "rentalType", operator: "eq", value: "entire_home", isMust: true },
    { field: "availableFrom", operator: "lte", value: "2027-01-01", isMust: true },
    { field: "furnished", operator: "eq", value: true, isMust: false },
    { field: "bedrooms", operator: "gte", value: 2, isMust: false },
    { field: "sizeM2", operator: "gte", value: 70, isMust: false },
  ],
});

const standardLandlordRules = [
  { field: "employmentContract", operator: "in", value: ["permanent"], isMust: true },
  { field: "smokes", operator: "eq", value: false, isMust: true },
  { field: "stayMonths", operator: "gte", value: 12, isMust: true },
  { field: "monthlyIncomeEur", operator: "gte", value: 2500, isMust: false },
] as const;

export const homes: HomeProfile[] = [
  {
    id: "home-01",
    displayName: "Sunny 2-bed in Gràcia",
    photoUrls: [P1, P2, P1, P2, P1],
    notes: "Quiet street off Carrer de Verdi, lots of light in the morning. Neighbours are lovely.",
    facts: { monthlyRentEur: 950, district: "gracia", rentalType: "entire_home", bedrooms: 2, sizeM2: 68, furnished: true, availableFrom: "2026-12-01" },
    requirements: [...standardLandlordRules],
  },
  {
    id: "home-02",
    displayName: "Eixample loft with balcony",
    photoUrls: [P2, P1, P2, P1],
    notes: "High ceilings, original tiles and a small balcony over the street.",
    facts: { monthlyRentEur: 990, district: "eixample", rentalType: "entire_home", bedrooms: 1, sizeM2: 62, furnished: true, availableFrom: "2026-12-15" },
    requirements: [...standardLandlordRules],
  },
  {
    id: "home-03",
    displayName: "Bright flat near Plaça del Sol",
    photoUrls: [P1, P2, P1, P2],
    notes: "Fourth floor with lift. Two minutes from the metro.",
    facts: { monthlyRentEur: 920, district: "gracia", rentalType: "entire_home", bedrooms: 2, sizeM2: 72, furnished: false, availableFrom: "2026-12-01" },
    requirements: [{ field: "smokes", operator: "eq", value: false, isMust: true }],
  },
  {
    id: "home-04",
    displayName: "Cosy 1-bed by Sant Antoni",
    photoUrls: [P2, P1, P2, P1],
    notes: "Renovated kitchen, close to the market.",
    facts: { monthlyRentEur: 880, district: "eixample", rentalType: "entire_home", bedrooms: 1, sizeM2: 55, furnished: true, availableFrom: "2026-12-10" },
    requirements: [{ field: "stayMonths", operator: "gte", value: 12, isMust: true }],
  },
  {
    id: "home-05",
    displayName: "Calm 2-bed with terrace",
    photoUrls: [P1, P2, P1, P2, P1],
    notes: "Shared roof terrace, quiet inner courtyard.",
    facts: { monthlyRentEur: 1000, district: "gracia", rentalType: "entire_home", bedrooms: 2, sizeM2: 75, furnished: true, availableFrom: "2027-01-01" },
    requirements: [{ field: "employmentContract", operator: "in", value: ["permanent", "self_employed"], isMust: true }],
  },
].map((home) => homeProfileSchema.parse({ ...home, role: "home", status: "complete" }));

export const tenants: TenantProfile[] = [
  {
    id: "tenant-02",
    displayName: "Pau R.",
    notes: "Software engineer, I cycle to work and I cook a lot.",
    facts: { monthlyIncomeEur: 3200, employmentContract: "permanent", occupants: 1, hasPets: false, smokes: false, moveInDate: "2026-12-15", stayMonths: 24 },
  },
  {
    id: "tenant-03",
    displayName: "Clara & Joan",
    notes: "A couple, both teachers. We're tidy and we love long dinners at home.",
    facts: { monthlyIncomeEur: 4100, employmentContract: "permanent", occupants: 2, hasPets: false, smokes: false, moveInDate: "2027-01-01", stayMonths: 36 },
  },
  {
    id: "tenant-04",
    displayName: "Sergi T.",
    notes: "Nurse on day shifts, quiet evenings, happy to take care of the plants.",
    facts: { monthlyIncomeEur: 2700, employmentContract: "permanent", occupants: 1, hasPets: false, smokes: false, moveInDate: "2026-12-01", stayMonths: 12 },
  },
].map((tenant) =>
  tenantProfileSchema.parse({
    ...tenant,
    role: "tenant",
    photoUrls: [],
    status: "complete",
    requirements: [{ field: "monthlyRentEur", operator: "lte", value: 1100, isMust: true }],
  }),
);

export const allProfiles = [demoTenant, ...homes, ...tenants];
