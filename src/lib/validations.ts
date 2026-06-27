import { z } from "zod"

export const SA_PROVINCES = [
  "gauteng",
  "western_cape",
  "kwazulu_natal",
  "eastern_cape",
  "limpopo",
  "mpumalanga",
  "north_west",
  "free_state",
  "northern_cape",
] as const

export const CAUSES = [
  "food_security",
  "education",
  "healthcare",
  "shelter",
  "clothing",
  "children",
  "elderly",
  "disability",
  "animal_welfare",
  "environment",
  "arts_culture",
  "disaster_relief",
  "youth_development",
  "gender_based_violence",
  "community_development",
  "other",
] as const

export const GOODS_CATEGORIES = [
  "clothes",
  "food",
  "toys",
  "blankets",
  "books",
  "electronics",
  "furniture",
  "toiletries",
  "baby_items",
  "school_supplies",
  "medicine",
  "other",
] as const

export const SA_BANKS = [
  "absa",
  "standard_bank",
  "fnb",
  "nedbank",
  "capitec",
  "discovery_bank",
  "investec",
  "african_bank",
  "grindrod",
  "sasfin",
  "bidvest",
  "tyme_bank",
  "other",
] as const

// Auth
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  role: z.enum(["contributor", "org_admin"]).default("contributor"),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

// Organisation onboarding steps
export const orgBasicsSchema = z.object({
  name: z.string().min(3, "Organisation name must be at least 3 characters"),
  description: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(1000),
  missionStatement: z.string().max(500).optional(),
  registrationNumber: z.string().optional(),
  npoStatus: z.boolean().default(false),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z
    .string()
    .regex(/^(\+27|0)[6-8][0-9]{8}$/, "Invalid SA phone number"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  acceptsMoney: z.boolean().default(true),
  acceptsGoods: z.boolean().default(true),
})

export const orgCausesSchema = z.object({
  causes: z
    .array(z.enum(CAUSES))
    .min(1, "Select at least one cause")
    .max(5, "Select up to 5 causes"),
})

export const orgAddressSchema = z.object({
  streetAddress: z.string().min(5, "Street address is required"),
  suburb: z.string().optional(),
  city: z.string().min(2, "City is required"),
  province: z.enum(SA_PROVINCES, { errorMap: () => ({ message: "Select a province" }) }),
  postalCode: z
    .string()
    .regex(/^\d{4}$/, "Postal code must be 4 digits"),
})

export const orgBankingSchema = z.object({
  bankName: z.enum(SA_BANKS, { errorMap: () => ({ message: "Select a bank" }) }),
  bankNameOther: z.string().optional(),
  accountHolderName: z.string().min(2, "Account holder name is required"),
  accountNumber: z
    .string()
    .min(6, "Invalid account number")
    .max(16, "Invalid account number")
    .regex(/^\d+$/, "Account number must contain only digits"),
  accountType: z.enum(["current", "savings", "transmission"]),
  branchCode: z
    .string()
    .min(4, "Branch code required")
    .regex(/^\d+$/, "Branch code must be digits"),
})

// Contribution
export const moneyContributionSchema = z.object({
  amountCents: z
    .number()
    .int()
    .min(1000, "Minimum donation is R10")
    .max(10_000_000, "Maximum donation is R100,000"),
  notes: z.string().max(500).optional(),
})

export const goodsItemSchema = z.object({
  category: z.enum(GOODS_CATEGORIES),
  name: z.string().min(1, "Item name is required"),
  description: z.string().max(200).optional(),
  quantity: z.number().int().min(1).max(1000),
  condition: z.enum(["new", "like_new", "good", "fair"]),
  estimatedWeightKg: z.number().min(0.1).max(500).optional(),
})

export const goodsPickupSchema = z.object({
  pickupContactName: z.string().min(2, "Contact name required"),
  pickupContactPhone: z
    .string()
    .regex(/^(\+27|0)[6-8][0-9]{8}$/, "Invalid SA phone number"),
  pickupContactEmail: z.string().email().optional().or(z.literal("")),
  pickupStreet: z.string().min(5, "Street address required"),
  pickupSuburb: z.string().optional(),
  pickupCity: z.string().min(2, "City required"),
  pickupProvince: z.enum(SA_PROVINCES),
  pickupPostalCode: z.string().regex(/^\d{4}$/, "4-digit postal code required"),
  pickupInstructions: z.string().max(300).optional(),
  scheduledPickupDate: z.string().min(1, "Pickup date required"),
  scheduledPickupTimeSlot: z.enum([
    "morning_8_12",
    "afternoon_12_17",
    "evening_17_20",
  ]),
  isFragile: z.boolean().default(false),
  requiresRefrigeration: z.boolean().default(false),
  specialInstructions: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
})

export const courierVerifySchema = z.object({
  jobId: z.string(),
  code: z.string().length(6, "Code must be 6 digits"),
  type: z.enum(["pickup", "delivery"]),
})

// Admin
export const orgReviewSchema = z.object({
  action: z.enum(["approve", "reject", "request_info"]),
  adminNotes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(500).optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type OrgBasicsInput = z.infer<typeof orgBasicsSchema>
export type OrgCausesInput = z.infer<typeof orgCausesSchema>
export type OrgAddressInput = z.infer<typeof orgAddressSchema>
export type OrgBankingInput = z.infer<typeof orgBankingSchema>
export type GoodsItemInput = z.infer<typeof goodsItemSchema>
export type GoodsPickupInput = z.infer<typeof goodsPickupSchema>
export type MoneyContributionInput = z.infer<typeof moneyContributionSchema>
export type CourierVerifyInput = z.infer<typeof courierVerifySchema>
export type OrgReviewInput = z.infer<typeof orgReviewSchema>
