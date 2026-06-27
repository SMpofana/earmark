import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { donations, contributions, organisations } from "@/lib/db/schema"
import { verifyPayment } from "@/lib/paystack"
import { trackEvent } from "@/lib/analytics"
import { sendDonationReceiptEmail } from "@/lib/email"
import { formatCurrency } from "@/lib/utils"
import { sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  const ref = new URL(request.url).searchParams.get("ref")
  if (!ref) {
    return NextResponse.redirect(new URL("/organisations", request.url))
  }

  const donation = await db.query.donations.findFirst({
    where: eq(donations.paystackReference, ref),
    with: {
      contribution: {
        with: {
          contributor: true,
          organisation: true,
        },
      },
    },
  })

  if (!donation) {
    return NextResponse.redirect(new URL("/organisations", request.url))
  }

  if (donation.paystackStatus === "success") {
    return NextResponse.redirect(
      new URL(`/track/${donation.contributionId}`, request.url)
    )
  }

  try {
    const result = await verifyPayment(ref)

    if (result.status === "success") {
      await db
        .update(donations)
        .set({
          paystackStatus: "success",
          paystackMetadata: result.metadata as any,
          paidAt: new Date(result.paidAt),
        })
        .where(eq(donations.paystackReference, ref))

      await db
        .update(contributions)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(contributions.id, donation.contributionId))

      // Update org stats
      await db
        .update(organisations)
        .set({
          totalDonationsZar: sql`${organisations.totalDonationsZar} + ${Math.round(result.amountCents / 100)}`,
          contributorCount: sql`${organisations.contributorCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(organisations.id, donation.contribution.organisationId))

      // Send receipt
      try {
        await sendDonationReceiptEmail(donation.contribution.contributor.email, {
          contributorName: donation.contribution.contributor.name,
          orgName: donation.contribution.organisation.name,
          amountZar: Math.round(result.amountCents / 100),
          reference: ref,
          date: new Date(result.paidAt).toLocaleDateString("en-ZA"),
        })
      } catch { /* non-blocking */ }

      await trackEvent({
        name: "payment_completed",
        userId: donation.contribution.contributorId,
        organisationId: donation.contribution.organisationId,
        contributionId: donation.contributionId,
        properties: { amountCents: result.amountCents, reference: ref },
      })
    } else {
      await db
        .update(donations)
        .set({ paystackStatus: result.status === "abandoned" ? "abandoned" : "failed" })
        .where(eq(donations.paystackReference, ref))

      await trackEvent({
        name: "payment_failed",
        userId: donation.contribution.contributorId,
        contributionId: donation.contributionId,
        properties: { status: result.status, reference: ref },
      })
    }
  } catch {
    // Paystack verification error — log and redirect
  }

  return NextResponse.redirect(
    new URL(`/track/${donation.contributionId}`, request.url)
  )
}
