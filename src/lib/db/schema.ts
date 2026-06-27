import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "contributor",
  "org_admin",
  "super_admin",
])

export const orgStatusEnum = pgEnum("org_status", [
  "draft",
  "pending",
  "under_review",
  "active",
  "suspended",
  "rejected",
])

export const causeTypeEnum = pgEnum("cause_type", [
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
])

export const contributionTypeEnum = pgEnum("contribution_type", [
  "money",
  "goods",
])

export const contributionStatusEnum = pgEnum("contribution_status", [
  "draft",
  "pending",
  "confirmed",
  "scheduled",
  "collected",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
  "failed",
])

export const goodsItemCategoryEnum = pgEnum("goods_item_category", [
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
])

export const itemConditionEnum = pgEnum("item_condition", [
  "new",
  "like_new",
  "good",
  "fair",
])

export const courierStatusEnum = pgEnum("courier_status", [
  "scheduled",
  "driver_assigned",
  "pickup_verified",
  "collected",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "cancelled",
])

export const courierProviderEnum = pgEnum("courier_provider", [
  "the_courier_guy",
  "dawn_wing",
  "aramex",
  "dhl",
  "fastway",
  "ram",
  "internal",
])

export const timeSlotEnum = pgEnum("pickup_time_slot", [
  "morning_8_12",
  "afternoon_12_17",
  "evening_17_20",
])

export const bankAccountTypeEnum = pgEnum("bank_account_type", [
  "current",
  "savings",
  "transmission",
])

export const saBankEnum = pgEnum("sa_bank", [
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
])

export const saProvinceEnum = pgEnum("sa_province", [
  "gauteng",
  "western_cape",
  "kwazulu_natal",
  "eastern_cape",
  "limpopo",
  "mpumalanga",
  "north_west",
  "free_state",
  "northern_cape",
])

export const paymentMethodEnum = pgEnum("payment_method", [
  "card",
  "eft",
  "mobile",
  "ussd",
])

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "refunded",
  "abandoned",
])

export const orgImageTypeEnum = pgEnum("org_image_type", [
  "logo",
  "cover",
  "gallery",
  "registration_doc",
])

export const notificationTypeEnum = pgEnum("notification_type", [
  "email",
  "sms",
  "push",
])

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
])

// ── Auth tables (required by better-auth) ────────────────────────────────────

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("contributor"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
})

// ── Organisations ─────────────────────────────────────────────────────────────

export const organisations = pgTable(
  "organisations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),

    // Identity
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    missionStatement: text("mission_statement"),

    // Registration
    registrationNumber: text("registration_number"),
    npoStatus: boolean("npo_status").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),
    status: orgStatusEnum("status").notNull().default("draft"),

    // Contact
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    website: text("website"),
    facebookUrl: text("facebook_url"),
    instagramUrl: text("instagram_url"),

    // Address
    streetAddress: text("street_address").notNull(),
    suburb: text("suburb"),
    city: text("city").notNull(),
    province: saProvinceEnum("province").notNull(),
    postalCode: text("postal_code").notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),

    // Accepts
    acceptsMoney: boolean("accepts_money").notNull().default(true),
    acceptsGoods: boolean("accepts_goods").notNull().default(true),
    acceptedGoodsCategories: jsonb("accepted_goods_categories")
      .$type<string[]>()
      .default([]),

    // Stats (denormalised for list performance)
    totalDonationsZar: integer("total_donations_zar").notNull().default(0),
    totalGoodsReceived: integer("total_goods_received").notNull().default(0),
    contributorCount: integer("contributor_count").notNull().default(0),

    // Admin
    adminNotes: text("admin_notes"),
    rejectionReason: text("rejection_reason"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
    verifiedAt: timestamp("verified_at"),
  },
  (t) => ({
    slugIdx: uniqueIndex("organisations_slug_idx").on(t.slug),
    statusIdx: index("organisations_status_idx").on(t.status),
    provinceIdx: index("organisations_province_idx").on(t.province),
    userIdx: index("organisations_user_idx").on(t.userId),
  })
)

// Organisation causes (many-to-many)
export const organisationCauses = pgTable(
  "organisation_causes",
  {
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    cause: causeTypeEnum("cause").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.organisationId, t.cause] }),
  })
)

// Organisation images (logo, cover, gallery, docs)
export const organisationImages = pgTable("organisation_images", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: orgImageTypeEnum("type").notNull(),
  altText: text("alt_text"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Organisation banking details (stored separately for security)
export const organisationBanking = pgTable("organisation_banking", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" })
    .unique(),

  bankName: saBankEnum("bank_name").notNull(),
  bankNameOther: text("bank_name_other"),
  accountHolderName: text("account_holder_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountType: bankAccountTypeEnum("account_type").notNull(),
  branchCode: text("branch_code").notNull(),

  isVerified: boolean("is_verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ── Contributions (parent record) ─────────────────────────────────────────────

export const contributions = pgTable(
  "contributions",
  {
    id: text("id").primaryKey(),
    contributorId: text("contributor_id")
      .notNull()
      .references(() => users.id),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id),

    type: contributionTypeEnum("type").notNull(),
    status: contributionStatusEnum("status").notNull().default("draft"),
    notes: text("notes"),

    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    cancellationReason: text("cancellation_reason"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    contributorIdx: index("contributions_contributor_idx").on(t.contributorId),
    organisationIdx: index("contributions_organisation_idx").on(
      t.organisationId
    ),
    statusIdx: index("contributions_status_idx").on(t.status),
    typeIdx: index("contributions_type_idx").on(t.type),
  })
)

// Money donations
export const donations = pgTable("donations", {
  id: text("id").primaryKey(),
  contributionId: text("contribution_id")
    .notNull()
    .references(() => contributions.id, { onDelete: "cascade" })
    .unique(),

  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("ZAR"),
  paymentMethod: paymentMethodEnum("payment_method"),

  paystackReference: text("paystack_reference").unique(),
  paystackStatus: paymentStatusEnum("paystack_status")
    .notNull()
    .default("pending"),
  paystackMetadata: jsonb("paystack_metadata"),

  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Goods contributions metadata
export const goodsContributions = pgTable("goods_contributions", {
  id: text("id").primaryKey(),
  contributionId: text("contribution_id")
    .notNull()
    .references(() => contributions.id, { onDelete: "cascade" })
    .unique(),

  // Pickup contact
  pickupContactName: text("pickup_contact_name").notNull(),
  pickupContactPhone: text("pickup_contact_phone").notNull(),
  pickupContactEmail: text("pickup_contact_email"),

  // Pickup address
  pickupStreet: text("pickup_street").notNull(),
  pickupSuburb: text("pickup_suburb"),
  pickupCity: text("pickup_city").notNull(),
  pickupProvince: saProvinceEnum("pickup_province").notNull(),
  pickupPostalCode: text("pickup_postal_code").notNull(),
  pickupLatitude: real("pickup_latitude"),
  pickupLongitude: real("pickup_longitude"),
  pickupInstructions: text("pickup_instructions"),

  // Schedule
  scheduledPickupDate: timestamp("scheduled_pickup_date").notNull(),
  scheduledPickupTimeSlot: timeSlotEnum("scheduled_pickup_time_slot").notNull(),

  // Logistics
  estimatedWeightKg: real("estimated_weight_kg"),
  estimatedVolumeLiters: real("estimated_volume_liters"),
  requiresRefrigeration: boolean("requires_refrigeration")
    .notNull()
    .default(false),
  isFragile: boolean("is_fragile").notNull().default(false),
  specialInstructions: text("special_instructions"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Individual items within a goods contribution
export const goodsItems = pgTable(
  "goods_items",
  {
    id: text("id").primaryKey(),
    goodsContributionId: text("goods_contribution_id")
      .notNull()
      .references(() => goodsContributions.id, { onDelete: "cascade" }),

    category: goodsItemCategoryEnum("category").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    quantity: integer("quantity").notNull().default(1),
    condition: itemConditionEnum("condition").notNull().default("good"),
    estimatedWeightKg: real("estimated_weight_kg"),
    imageUrl: text("image_url"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    goodsIdx: index("goods_items_contribution_idx").on(t.goodsContributionId),
  })
)

// ── Courier jobs ──────────────────────────────────────────────────────────────

export const courierJobs = pgTable(
  "courier_jobs",
  {
    id: text("id").primaryKey(),
    goodsContributionId: text("goods_contribution_id")
      .notNull()
      .references(() => goodsContributions.id, { onDelete: "cascade" })
      .unique(),

    provider: courierProviderEnum("provider").notNull().default("the_courier_guy"),
    waybillNumber: text("waybill_number").unique(),
    trackingUrl: text("tracking_url"),

    // 6-digit OTP codes for pickup and delivery verification
    pickupVerificationCode: text("pickup_verification_code"),
    pickupVerifiedAt: timestamp("pickup_verified_at"),
    deliveryVerificationCode: text("delivery_verification_code"),
    deliveryVerifiedAt: timestamp("delivery_verified_at"),

    // Driver
    driverName: text("driver_name"),
    driverPhone: text("driver_phone"),
    vehicleRegistration: text("vehicle_registration"),

    status: courierStatusEnum("status").notNull().default("scheduled"),

    estimatedPickupAt: timestamp("estimated_pickup_at"),
    actualPickupAt: timestamp("actual_pickup_at"),
    estimatedDeliveryAt: timestamp("estimated_delivery_at"),
    actualDeliveryAt: timestamp("actual_delivery_at"),

    costCents: integer("cost_cents"),
    currency: text("currency").notNull().default("ZAR"),

    // Proof photos
    pickupPhotoUrl: text("pickup_photo_url"),
    deliveryPhotoUrl: text("delivery_photo_url"),

    notes: text("notes"),
    failureReason: text("failure_reason"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("courier_jobs_status_idx").on(t.status),
  })
)

// ── Analytics events (robust data pipeline) ───────────────────────────────────

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    eventName: text("event_name").notNull(),

    // Attribution
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sessionId: text("session_id"),
    anonymousId: text("anonymous_id"),

    // Context references
    organisationId: text("organisation_id").references(
      () => organisations.id,
      { onDelete: "set null" }
    ),
    contributionId: text("contribution_id").references(() => contributions.id, {
      onDelete: "set null",
    }),

    // Structured event payload
    properties: jsonb("properties").$type<Record<string, unknown>>(),

    // Request context
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),

    // Geo (resolved from IP)
    country: text("country").default("ZA"),
    province: text("province"),
    city: text("city"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    eventNameIdx: index("analytics_event_name_idx").on(t.eventName),
    userIdx: index("analytics_user_idx").on(t.userId),
    orgIdx: index("analytics_org_idx").on(t.organisationId),
    createdAtIdx: index("analytics_created_at_idx").on(t.createdAt),
  })
)

// ── Notifications ─────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    type: notificationTypeEnum("type").notNull(),
    template: text("template").notNull(),
    subject: text("subject"),
    recipient: text("recipient").notNull(),
    body: text("body"),

    status: notificationStatusEnum("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),

    organisationId: text("organisation_id").references(() => organisations.id, {
      onDelete: "set null",
    }),
    contributionId: text("contribution_id").references(() => contributions.id, {
      onDelete: "set null",
    }),

    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId),
    statusIdx: index("notifications_status_idx").on(t.status),
  })
)

// ── Audit log ─────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),

    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),

    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("audit_logs_user_idx").on(t.userId),
    entityIdx: index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt),
  })
)

// Organisation followers
export const organisationFollowers = pgTable(
  "organisation_followers",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.organisationId] }),
  })
)

// ── Relations ─────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  organisations: many(organisations),
  contributions: many(contributions),
  notifications: many(notifications),
  followedOrgs: many(organisationFollowers),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const organisationsRelations = relations(
  organisations,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [organisations.userId],
      references: [users.id],
    }),
    causes: many(organisationCauses),
    images: many(organisationImages),
    banking: one(organisationBanking),
    contributions: many(contributions),
    followers: many(organisationFollowers),
  })
)

export const organisationCausesRelations = relations(
  organisationCauses,
  ({ one }) => ({
    organisation: one(organisations, {
      fields: [organisationCauses.organisationId],
      references: [organisations.id],
    }),
  })
)

export const organisationImagesRelations = relations(
  organisationImages,
  ({ one }) => ({
    organisation: one(organisations, {
      fields: [organisationImages.organisationId],
      references: [organisations.id],
    }),
  })
)

export const organisationBankingRelations = relations(
  organisationBanking,
  ({ one }) => ({
    organisation: one(organisations, {
      fields: [organisationBanking.organisationId],
      references: [organisations.id],
    }),
  })
)

export const contributionsRelations = relations(contributions, ({ one }) => ({
  contributor: one(users, {
    fields: [contributions.contributorId],
    references: [users.id],
  }),
  organisation: one(organisations, {
    fields: [contributions.organisationId],
    references: [organisations.id],
  }),
  donation: one(donations),
  goodsContribution: one(goodsContributions),
}))

export const donationsRelations = relations(donations, ({ one }) => ({
  contribution: one(contributions, {
    fields: [donations.contributionId],
    references: [contributions.id],
  }),
}))

export const goodsContributionsRelations = relations(
  goodsContributions,
  ({ one, many }) => ({
    contribution: one(contributions, {
      fields: [goodsContributions.contributionId],
      references: [contributions.id],
    }),
    items: many(goodsItems),
    courierJob: one(courierJobs),
  })
)

export const goodsItemsRelations = relations(goodsItems, ({ one }) => ({
  goodsContribution: one(goodsContributions, {
    fields: [goodsItems.goodsContributionId],
    references: [goodsContributions.id],
  }),
}))

export const courierJobsRelations = relations(courierJobs, ({ one }) => ({
  goodsContribution: one(goodsContributions, {
    fields: [courierJobs.goodsContributionId],
    references: [goodsContributions.id],
  }),
}))

export const organisationFollowersRelations = relations(
  organisationFollowers,
  ({ one }) => ({
    user: one(users, {
      fields: [organisationFollowers.userId],
      references: [users.id],
    }),
    organisation: one(organisations, {
      fields: [organisationFollowers.organisationId],
      references: [organisations.id],
    }),
  })
)
