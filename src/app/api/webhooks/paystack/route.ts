import { NextRequest, NextResponse } from "next/server"
import { validateWebhookSignature } from "@/lib/paystack"
import { db } from "@/lib/db"
import { donations, contributions, organisations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { trackEvent } from "@/lib/analytics"

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-paystack-signature") ?? ""
  const rawBody = await request.text()

  if (!validateWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (event.event === "charge.success") {
    const data = event.data
    const reference = data.reference

    const donation = await db.query.donations.findFirst({
      where: eq(donations.paystackReference, reference),
      with: { contribution: true },
    })

    if (donation && donation.paystackStatus !== "success") {
      await db
        .update(donations)
        .set({
          paystackStatus: "success",
          paystackMetadata: data,
          paidAt: new Date(data.paid_at),
        })
        .where(eq(donations.paystackReference, reference))

      await db
        .update(contributions)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contributions.id, donation.contributionId))

      await db
        .update(organisations)
        .set({
          totalDonationsZar: sql`${organisations.totalDonationsZar} + ${Math.round(data.amount / 100)}`,
          contributorCount: sql`${organisations.contributorCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(organisations.id, donation.contribution.organisationId))

      await trackEvent({
        name: "payment_completed",
        userId: donation.contribution.contributorId,
        organisationId: donation.contribution.organisationId,
        contributionId: donation.contributionId,
        properties: { amountCents: data.amount, channel: data.channel, reference },
      })
    }
  }

  return NextResponse.json({ received: true })
}
