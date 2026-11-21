/**
 * Fake profiles for "mock" mode and as plan B for the demo. Validated with the shared zod schemas at load,
 * so a typo breaks the build instead of the demo.
 * Photos: /homes/<homeId>-<n>.jpg (public/homes, credits in public/homes/CREDITS.md). No person photos, ever.
 */
import {
  homeProfileSchema,
  tenantProfileSchema,
  type HomeProfile,
  type TenantProfile,
} from "@/domain/profile";

/** "/homes/home-01-1.jpg" … "/homes/home-01-<count>.jpg" */
function photos(homeId: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `/homes/${homeId}-${i + 1}.jpg`);
}

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

/**
 * home-01…home-05 are the demo tenant's feed (in this order): each passes all of Laura's musts and she
 * passes all of theirs. home-06 onwards are extra listings for the landlord side and the seed.
 */
export const homes: HomeProfile[] = [
  {
    id: "home-01",
    displayName: "Sunny 2-bed in Gràcia",
    photoUrls: photos("home-01", 5),
    notes: "Quiet street off Carrer de Verdi, lots of light in the morning. Neighbours are lovely.",
    facts: { monthlyRentEur: 950, district: "gracia", rentalType: "entire_home", bedrooms: 2, sizeM2: 68, furnished: true, availableFrom: "2026-12-01" },
    requirements: [...standardLandlordRules],
  },
  {
    id: "home-02",
    displayName: "Eixample loft with balcony",
    photoUrls: photos("home-02", 5),
    notes: "High ceilings, a sleeping loft and a small balcony over the street. Plants stay if you want them.",
    facts: { monthlyRentEur: 990, district: "eixample", rentalType: "entire_home", bedrooms: 1, sizeM2: 62, furnished: true, availableFrom: "2026-12-15" },
    requirements: [
      { field: "smokes", operator: "eq", value: false, isMust: true },
      { field: "stayMonths", operator: "gte", value: 12, isMust: true },
    ],
  },
  {
    id: "home-03",
    displayName: "Bright flat near Plaça del Sol",
    photoUrls: photos("home-03", 5),
    notes: "Fourth floor with lift, bay window full of plants. Two minutes from the Fontana metro.",
    facts: { monthlyRentEur: 920, district: "gracia", rentalType: "entire_home", bedrooms: 2, sizeM2: 72, furnished: true, availableFrom: "2026-12-01" },
    requirements: [{ field: "smokes", operator: "eq", value: false, isMust: true }],
  },
  {
    id: "home-04",
    displayName: "Renovated 1-bed by Sant Antoni",
    photoUrls: photos("home-04", 5),
    notes: "Fully renovated last year: new kitchen, bathtub and air con. Five minutes from Sant Antoni market.",
    facts: { monthlyRentEur: 980, district: "eixample", rentalType: "entire_home", bedrooms: 1, sizeM2: 58, furnished: true, availableFrom: "2026-12-10" },
    requirements: [{ field: "stayMonths", operator: "gte", value: 12, isMust: true }],
  },
  {
    id: "home-05",
    displayName: "Calm 2-bed with terrace",
    photoUrls: photos("home-05", 5),
    notes: "New building with a big private terrace over the inner courtyard. Very quiet at night.",
    facts: { monthlyRentEur: 1000, district: "gracia", rentalType: "entire_home", bedrooms: 2, sizeM2: 75, furnished: true, availableFrom: "2027-01-01" },
    requirements: [{ field: "employmentContract", operator: "in", value: ["permanent", "self_employed"], isMust: true }],
  },
  {
    id: "home-06",
    displayName: "Family flat in Sarrià",
    photoUrls: photos("home-06", 5),
    notes: "Spacious and calm, next to the FGC station. Small garden shared with two neighbours.",
    facts: { monthlyRentEur: 1350, district: "sarria_sant_gervasi", rentalType: "entire_home", bedrooms: 3, sizeM2: 105, furnished: true, availableFrom: "2027-01-15" },
    requirements: [
      { field: "employmentContract", operator: "in", value: ["permanent"], isMust: true },
      { field: "monthlyIncomeEur", operator: "gte", value: 4000, isMust: true },
      { field: "stayMonths", operator: "gte", value: 24, isMust: false },
    ],
  },
  {
    id: "home-07",
    displayName: "Modern 2-bed in Les Corts",
    photoUrls: photos("home-07", 4),
    notes: "Bright open-plan living room, two minutes from the green line. Building with concierge.",
    facts: { monthlyRentEur: 1250, district: "les_corts", rentalType: "entire_home", bedrooms: 2, sizeM2: 82, furnished: true, availableFrom: "2026-12-20" },
    requirements: [
      { field: "smokes", operator: "eq", value: false, isMust: true },
      { field: "monthlyIncomeEur", operator: "gte", value: 3500, isMust: true },
    ],
  },
  {
    id: "home-08",
    displayName: "Open-plan flat in Poblenou",
    photoUrls: photos("home-08", 4),
    notes: "Ten minutes walking to the beach and the Rambla del Poblenou. Big kitchen island for cooking.",
    facts: { monthlyRentEur: 1150, district: "sant_marti", rentalType: "entire_home", bedrooms: 2, sizeM2: 78, furnished: true, availableFrom: "2026-12-01" },
    requirements: [
      { field: "stayMonths", operator: "gte", value: 12, isMust: true },
      { field: "hasPets", operator: "eq", value: false, isMust: false },
    ],
  },
  {
    id: "home-09",
    displayName: "Compact studio in Sants",
    photoUrls: photos("home-09", 3),
    notes: "Smart layout with a separate sleeping corner. Next to Sants station, perfect if you commute.",
    facts: { monthlyRentEur: 750, district: "sants_montjuic", rentalType: "entire_home", bedrooms: 0, sizeM2: 35, furnished: true, availableFrom: "2026-12-05" },
    requirements: [
      { field: "occupants", operator: "lte", value: 1, isMust: true },
      { field: "smokes", operator: "eq", value: false, isMust: true },
    ],
  },
  {
    id: "home-10",
    displayName: "Cosy flat in Horta",
    photoUrls: photos("home-10", 3),
    notes: "Fireplace, dining room with garden views and lots of storage. Quiet residential street.",
    facts: { monthlyRentEur: 900, district: "horta_guinardo", rentalType: "entire_home", bedrooms: 2, sizeM2: 80, furnished: true, availableFrom: "2027-01-01" },
    requirements: [{ field: "stayMonths", operator: "gte", value: 12, isMust: true }],
  },
  {
    id: "home-11",
    displayName: "Room in a sunny shared flat",
    photoUrls: photos("home-11", 3),
    notes: "Double room in a flat with two others who work office hours. Bills included.",
    facts: { monthlyRentEur: 700, district: "eixample", rentalType: "room", bedrooms: 1, sizeM2: 14, furnished: true, availableFrom: "2026-12-01" },
    requirements: [
      { field: "smokes", operator: "eq", value: false, isMust: true },
      { field: "occupants", operator: "lte", value: 1, isMust: true },
    ],
  },
  {
    id: "home-12",
    displayName: "Attic with wooden beams in Gràcia",
    photoUrls: photos("home-12", 3),
    notes: "Top floor under the roof beams, warm in winter. Small balcony over Travessera de Gràcia.",
    facts: { monthlyRentEur: 890, district: "gracia", rentalType: "entire_home", bedrooms: 1, sizeM2: 50, furnished: true, availableFrom: "2027-02-01" },
    requirements: [
      { field: "smokes", operator: "eq", value: false, isMust: true },
      { field: "hasPets", operator: "eq", value: false, isMust: true },
    ],
  },
  {
    id: "home-13",
    displayName: "Minimal 1-bed in Sant Andreu",
    photoUrls: photos("home-13", 3),
    notes: "Simple and bright, next to the Fabra i Coats park. The neighbourhood feels like a village.",
    facts: { monthlyRentEur: 780, district: "sant_andreu", rentalType: "entire_home", bedrooms: 1, sizeM2: 48, furnished: true, availableFrom: "2026-12-15" },
    requirements: [{ field: "employmentContract", operator: "in", value: ["permanent", "temporary", "self_employed"], isMust: true }],
  },
  {
    id: "home-14",
    displayName: "Industrial loft in Poblenou",
    photoUrls: photos("home-14", 3),
    notes: "Former factory with double-height ceilings and huge windows. Great for working from home.",
    facts: { monthlyRentEur: 1400, district: "sant_marti", rentalType: "entire_home", bedrooms: 1, sizeM2: 95, furnished: true, availableFrom: "2027-01-10" },
    requirements: [
      { field: "monthlyIncomeEur", operator: "gte", value: 4200, isMust: true },
      { field: "stayMonths", operator: "gte", value: 12, isMust: true },
    ],
  },
  {
    id: "home-15",
    displayName: "Views over the city in Nou Barris",
    photoUrls: photos("home-15", 3),
    notes: "Eighth floor with a balcony looking over the whole city. Metro and supermarket downstairs.",
    facts: { monthlyRentEur: 820, district: "nou_barris", rentalType: "entire_home", bedrooms: 2, sizeM2: 70, furnished: false, availableFrom: "2026-12-01" },
    requirements: [{ field: "stayMonths", operator: "gte", value: 12, isMust: true }],
  },
  {
    id: "home-16",
    displayName: "Classic Eixample flat",
    photoUrls: photos("home-16", 4),
    notes: "Original parquet, tall windows and a modernista facade. Unfurnished, so bring your own style.",
    facts: { monthlyRentEur: 1100, district: "eixample", rentalType: "entire_home", bedrooms: 2, sizeM2: 85, furnished: false, availableFrom: "2027-01-01" },
    requirements: [
      { field: "employmentContract", operator: "in", value: ["permanent"], isMust: true },
      { field: "smokes", operator: "eq", value: false, isMust: true },
    ],
  },
].map((home) => homeProfileSchema.parse({ ...home, role: "home", status: "complete" }));

const tenantRows = [
  {
    id: "tenant-02",
    displayName: "Pau R.",
    notes: "Software engineer, I cycle to work and I cook a lot.",
    facts: { monthlyIncomeEur: 3200, employmentContract: "permanent", occupants: 1, hasPets: false, smokes: false, moveInDate: "2026-12-15", stayMonths: 24 },
  },
  {
    id: "tenant-03",
    displayName: "Clara V.",
    notes: "Two of us, both teachers. We're tidy and we love long dinners at home.",
    facts: { monthlyIncomeEur: 4100, employmentContract: "permanent", occupants: 2, hasPets: false, smokes: false, moveInDate: "2027-01-01", stayMonths: 36 },
  },
  {
    id: "tenant-04",
    displayName: "Sergi T.",
    notes: "Nurse on day shifts, quiet evenings, happy to take care of the plants.",
    facts: { monthlyIncomeEur: 2700, employmentContract: "permanent", occupants: 1, hasPets: false, smokes: false, moveInDate: "2026-12-01", stayMonths: 12 },
  },
  {
    id: "tenant-05",
    displayName: "Martina G.",
    notes: "Graphic designer working from home. I play the piano with headphones, promise.",
    facts: { monthlyIncomeEur: 2600, employmentContract: "self_employed", occupants: 1, hasPets: false, smokes: false, moveInDate: "2026-12-10", stayMonths: 18 },
  },
  {
    id: "tenant-06",
    displayName: "Òscar P.",
    notes: "Architect, early riser, I go running in the mornings and I'm out most weekends.",
    facts: { monthlyIncomeEur: 3400, employmentContract: "permanent", occupants: 1, hasPets: true, smokes: false, moveInDate: "2027-01-01", stayMonths: 24 },
  },
  {
    id: "tenant-07",
    displayName: "Irene S.",
    notes: "Master's student on a one-year programme. Calm, organised and I read a lot.",
    facts: { monthlyIncomeEur: 1400, employmentContract: "student", occupants: 1, hasPets: false, smokes: false, moveInDate: "2026-12-01", stayMonths: 10 },
  },
];

export const tenants: TenantProfile[] = tenantRows.map((tenant) =>
  tenantProfileSchema.parse({
    ...tenant,
    role: "tenant",
    photoUrls: [],
    status: "complete",
    requirements: [{ field: "monthlyRentEur", operator: "lte", value: 1100, isMust: true }],
  }),
);

export const allProfiles = [demoTenant, ...homes, ...tenants];
