import { z } from "zod";

export const DISTRICTS = [
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
] as const;

export const EMPLOYMENT_CONTRACTS = [
  "permanent",
  "temporary",
  "self_employed",
  "student",
  "unemployed",
] as const;

export const RENTAL_TYPES = ["entire_home", "room"] as const;

export const REQUIREMENT_OPERATORS = ["eq", "lte", "gte", "in"] as const;

export const tenantFactsSchema = z.strictObject({
  monthlyIncomeEur: z.number().nonnegative(),
  employmentContract: z.enum(EMPLOYMENT_CONTRACTS),
  occupants: z.number().int().positive(),
  hasPets: z.boolean(),
  smokes: z.boolean(),
  moveInDate: z.iso.date(),
  stayMonths: z.number().int().positive(),
});

export const homeFactsSchema = z.strictObject({
  monthlyRentEur: z.number().positive(),
  district: z.enum(DISTRICTS),
  rentalType: z.enum(RENTAL_TYPES),
  bedrooms: z.number().int().nonnegative(),
  sizeM2: z.number().positive(),
  furnished: z.boolean(),
  availableFrom: z.iso.date(),
});

const requirementRules = {
  operator: z.enum(REQUIREMENT_OPERATORS),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  isMust: z.boolean(),
};

// A requirement is a condition on a fact of the other side, so each role can only name the other role's facts.
export const tenantRequirementSchema = z.strictObject({
  field: homeFactsSchema.keyof(),
  ...requirementRules,
});

export const homeRequirementSchema = z.strictObject({
  field: tenantFactsSchema.keyof(),
  ...requirementRules,
});

const sharedProfileFields = {
  id: z.string().min(1),
  displayName: z.string(),
  photoUrls: z.array(z.string()),
  notes: z.string(),
  status: z.enum(["draft", "complete"]),
};

// Facts are partial because the interview fills them one by one; a missing fact fails any must that needs it.
export const tenantProfileSchema = z.strictObject({
  ...sharedProfileFields,
  role: z.literal("tenant"),
  facts: tenantFactsSchema.partial(),
  requirements: z.array(tenantRequirementSchema),
});

export const homeProfileSchema = z.strictObject({
  ...sharedProfileFields,
  role: z.literal("home"),
  facts: homeFactsSchema.partial(),
  requirements: z.array(homeRequirementSchema),
});

export const profileSchema = z.discriminatedUnion("role", [
  tenantProfileSchema,
  homeProfileSchema,
]);

export const feedItemSchema = z.strictObject({
  profile: profileSchema,
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
});

export type District = (typeof DISTRICTS)[number];
export type EmploymentContract = (typeof EMPLOYMENT_CONTRACTS)[number];
export type TenantFacts = z.infer<typeof tenantFactsSchema>;
export type HomeFacts = z.infer<typeof homeFactsSchema>;
export type TenantRequirement = z.infer<typeof tenantRequirementSchema>;
export type HomeRequirement = z.infer<typeof homeRequirementSchema>;
export type TenantProfile = z.infer<typeof tenantProfileSchema>;
export type HomeProfile = z.infer<typeof homeProfileSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Role = Profile["role"];
export type FeedItem = z.infer<typeof feedItemSchema>;
