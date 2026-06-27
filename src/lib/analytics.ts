import { generateId } from "./utils"

export type EventName =
  | "page_view"
  | "org_viewed"
  | "org_searched"
  | "org_filtered"
  | "org_followed"
  | "contribute_started"
  | "contribute_type_selected"
  | "goods_item_added"
  | "goods_item_removed"
  | "pickup_scheduled"
  | "payment_initiated"
  | "payment_completed"
  | "payment_failed"
  | "contribution_completed"
  | "contribution_cancelled"
  | "org_signup_started"
  | "org_onboarding_step_completed"
  | "org_submitted"
  | "org_approved"
  | "org_rejected"
  | "courier_assigned"
  | "courier_pickup_verified"
  | "courier_delivered"
  | "user_registered"
  | "user_login"

export interface TrackEventParams {
  name: EventName
  userId?: string
  organisationId?: string
  contributionId?: string
  properties?: Record<string, unknown>
  request?: { headers: { get: (key: string) => string | null } }
}

export async function trackEvent(params: TrackEventParams): Promise<void> {
  if (process.env.ANALYTICS_ENABLED !== "true") return

  try {
    const { db } = await import("./db")
    const { analyticsEvents } = await import("./db/schema")

    const headers = params.request?.headers
    const ipAddress =
      headers?.get("x-forwarded-for") ??
      headers?.get("x-real-ip") ??
      undefined
    const userAgent = headers?.get("user-agent") ?? undefined
    const referrer = headers?.get("referer") ?? undefined
    const utmSource = undefined // TODO: parse from referrer or properties

    await db.insert(analyticsEvents).values({
      id: generateId("evt"),
      eventName: params.name,
      userId: params.userId,
      organisationId: params.organisationId,
      contributionId: params.contributionId,
      properties: params.properties ?? {},
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      referrer: referrer ?? null,
      utmSource: utmSource ?? null,
    })
  } catch {
    // Analytics failures must never break the main flow
  }
}

export async function getOrgAnalytics(organisationId: string) {
  const { db } = await import("./db")
  const { analyticsEvents, contributions, donations } = await import(
    "./db/schema"
  )
  const { sql, eq, and, gte, count, sum } = await import("drizzle-orm")

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [views, contribStats] = await Promise.all([
    db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventName, "org_viewed"),
          eq(analyticsEvents.organisationId, organisationId),
          gte(analyticsEvents.createdAt, thirtyDaysAgo)
        )
      ),
    db
      .select({
        total: count(),
        totalAmount: sum(donations.amountCents),
      })
      .from(contributions)
      .leftJoin(donations, eq(contributions.id, donations.contributionId))
      .where(
        and(
          eq(contributions.organisationId, organisationId),
          eq(contributions.status, "completed")
        )
      ),
  ])

  return {
    views30d: views[0]?.count ?? 0,
    totalContributions: contribStats[0]?.total ?? 0,
    totalDonationsZar: Math.round(
      Number(contribStats[0]?.totalAmount ?? 0) / 100
    ),
  }
}

export async function getPlatformAnalytics() {
  const { db } = await import("./db")
  const { organisations, contributions, users, donations } = await import(
    "./db/schema"
  )
  const { count, eq, sum } = await import("drizzle-orm")

  const [orgStats, contribStats, userStats] = await Promise.all([
    db
      .select({ count: count() })
      .from(organisations)
      .where(eq(organisations.status, "active")),
    db
      .select({
        total: count(),
        totalAmount: sum(donations.amountCents),
      })
      .from(contributions)
      .leftJoin(donations, eq(contributions.id, donations.contributionId))
      .where(eq(contributions.status, "completed")),
    db.select({ count: count() }).from(users),
  ])

  return {
    activeOrgs: orgStats[0]?.count ?? 0,
    totalContributions: contribStats[0]?.total ?? 0,
    totalDonationsZar: Math.round(
      Number(contribStats[0]?.totalAmount ?? 0) / 100
    ),
    totalUsers: userStats[0]?.count ?? 0,
  }
}
