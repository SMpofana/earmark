import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { courierJobs, contributions, goodsContributions } from "@/lib/db/schema"
import { trackEvent } from "@/lib/analytics"
import { sendDeliveryConfirmationEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { jobId, code, type } = await request.json()

  if (!jobId || !code || !type) {
    return NextResponse.json({ error: "jobId, code and type are required" }, { status: 400 })
  }

  const job = await db.query.courierJobs.findFirst({
    where: eq(courierJobs.id, jobId),
    with: {
      goodsContribution: {
        with: {
          contribution: {
            with: { organisation: true, contributor: true },
          },
          items: true,
        },
      },
    },
  })

  if (!job) return NextResponse.json({ error: "Courier job not found" }, { status: 404 })

  if (type === "pickup") {
    if (job.pickupVerifiedAt) {
      return NextResponse.json({ error: "Pickup already verified" }, { status: 400 })
    }
    if (job.pickupVerificationCode !== code) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
    }

    await db
      .update(courierJobs)
      .set({
        pickupVerifiedAt: new Date(),
        actualPickupAt: new Date(),
        status: "pickup_verified",
        updatedAt: new Date(),
      })
      .where(eq(courierJobs.id, jobId))

    await db
      .update(contributions)
      .set({ status: "collected", updatedAt: new Date() })
      .where(eq(contributions.id, job.goodsContribution.contributionId))

    await trackEvent({
      name: "courier_pickup_verified",
      userId: session.user.id,
      contributionId: job.goodsContribution.contributionId,
      organisationId: job.goodsContribution.contribution.organisationId,
      properties: { jobId, waybillNumber: job.waybillNumber },
    })

    return NextResponse.json({ success: true, message: "Pickup verified" })
  }

  if (type === "delivery") {
    if (job.deliveryVerifiedAt) {
      return NextResponse.json({ error: "Delivery already verified" }, { status: 400 })
    }
    if (job.deliveryVerificationCode !== code) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
    }

    const itemCount = job.goodsContribution.items.reduce((sum, i) => sum + i.quantity, 0)

    await db
      .update(courierJobs)
      .set({
        deliveryVerifiedAt: new Date(),
        actualDeliveryAt: new Date(),
        status: "delivered",
        updatedAt: new Date(),
      })
      .where(eq(courierJobs.id, jobId))

    await db
      .update(contributions)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(contributions.id, job.goodsContribution.contributionId))

    // Update org stats
    const { organisations } = await import("@/lib/db/schema")
    const { sql } = await import("drizzle-orm")
    await db
      .update(organisations)
      .set({
        totalGoodsReceived: sql`${organisations.totalGoodsReceived} + ${itemCount}`,
        contributorCount: sql`${organisations.contributorCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(organisations.id, job.goodsContribution.contribution.organisationId))

    // Notify org
    try {
      await sendDeliveryConfirmationEmail(job.goodsContribution.contribution.organisation.contactEmail, {
        orgName: job.goodsContribution.contribution.organisation.name,
        contributorName: job.goodsContribution.contribution.contributor.name,
        itemSummary: job.goodsContribution.items
          .map((i) => `${i.quantity}× ${i.name}`)
          .join(", "),
      })
    } catch { /* non-blocking */ }

    await trackEvent({
      name: "courier_delivered",
      userId: session.user.id,
      contributionId: job.goodsContribution.contributionId,
      organisationId: job.goodsContribution.contribution.organisationId,
      properties: { jobId, itemCount },
    })

    return NextResponse.json({ success: true, message: "Delivery confirmed" })
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 })
}
