import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  organisations,
  contributions,
  donations,
  goodsContributions,
  goodsItems,
  courierJobs,
} from "@/lib/db/schema"
import { generateId, generateOtp } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"
import { initializePayment, generatePaymentReference } from "@/lib/paystack"
import { schedulePickup } from "@/lib/courier"
import { sendPickupConfirmationEmail, sendDonationReceiptEmail } from "@/lib/email"
import { formatTimeSlot } from "@/lib/utils"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { orgSlug, type, amountCents, notes, items, pickup } = body

  if (!orgSlug || !type) {
    return NextResponse.json({ error: "orgSlug and type are required" }, { status: 400 })
  }

  // Resolve org
  const org = await db.query.organisations.findFirst({
    where: eq(organisations.slug, orgSlug),
  })
  if (!org || org.status !== "active") {
    return NextResponse.json({ error: "Organisation not found or inactive" }, { status: 404 })
  }

  const contributionId = generateId("ctr")

  try {
    if (type === "money") {
      if (!amountCents || amountCents < 1000) {
        return NextResponse.json({ error: "Minimum donation is R10" }, { status: 400 })
      }
      if (!org.acceptsMoney) {
        return NextResponse.json({ error: "Organisation does not accept money" }, { status: 400 })
      }

      const reference = generatePaymentReference()

      await db.transaction(async (tx) => {
        await tx.insert(contributions).values({
          id: contributionId,
          contributorId: session.user.id,
          organisationId: org.id,
          type: "money",
          status: "pending",
          notes: notes?.trim() || null,
        })

        await tx.insert(donations).values({
          id: generateId("don"),
          contributionId,
          amountCents,
          currency: "ZAR",
          paystackReference: reference,
          paystackStatus: "pending",
        })
      })

      // Initialize Paystack payment
      let authorizationUrl: string | null = null
      try {
        const payment = await initializePayment({
          email: session.user.email,
          amountCents,
          reference,
          callbackUrl: `${process.env.NEXT_PUBLIC_URL}/api/payments/verify?ref=${reference}`,
          metadata: {
            contributionId,
            orgId: org.id,
            orgName: org.name,
            userId: session.user.id,
          },
        })
        authorizationUrl = payment.authorizationUrl
      } catch {
        // Paystack not configured — still create the record
      }

      await trackEvent({
        name: "payment_initiated",
        userId: session.user.id,
        organisationId: org.id,
        contributionId,
        properties: { amountCents, currency: "ZAR" },
      })

      return NextResponse.json(
        { contributionId, authorizationUrl },
        { status: 201 }
      )
    }

    if (type === "goods") {
      if (!org.acceptsGoods) {
        return NextResponse.json({ error: "Organisation does not accept goods" }, { status: 400 })
      }
      if (!items?.length) {
        return NextResponse.json({ error: "At least one item required" }, { status: 400 })
      }
      if (!pickup?.pickupContactName || !pickup?.pickupStreet) {
        return NextResponse.json({ error: "Pickup details required" }, { status: 400 })
      }

      const goodsId = generateId("gds")
      const pickupOtp = generateOtp()
      const deliveryOtp = generateOtp()

      await db.transaction(async (tx) => {
        await tx.insert(contributions).values({
          id: contributionId,
          contributorId: session.user.id,
          organisationId: org.id,
          type: "goods",
          status: "scheduled",
          notes: pickup.specialInstructions?.trim() || null,
        })

        await tx.insert(goodsContributions).values({
          id: goodsId,
          contributionId,
          pickupContactName: pickup.pickupContactName,
          pickupContactPhone: pickup.pickupContactPhone,
          pickupContactEmail: pickup.pickupContactEmail || null,
          pickupStreet: pickup.pickupStreet,
          pickupSuburb: pickup.pickupSuburb || null,
          pickupCity: pickup.pickupCity,
          pickupProvince: pickup.pickupProvince as any,
          pickupPostalCode: pickup.pickupPostalCode,
          pickupInstructions: pickup.pickupInstructions || null,
          scheduledPickupDate: new Date(pickup.scheduledPickupDate),
          scheduledPickupTimeSlot: pickup.scheduledPickupTimeSlot as any,
          isFragile: Boolean(pickup.isFragile),
          requiresRefrigeration: Boolean(pickup.requiresRefrigeration),
          specialInstructions: pickup.specialInstructions || null,
        })

        await tx.insert(goodsItems).values(
          items.map((item: any) => ({
            id: generateId("itm"),
            goodsContributionId: goodsId,
            category: item.category as any,
            name: item.name,
            description: item.description || null,
            quantity: item.quantity || 1,
            condition: (item.condition || "good") as any,
          }))
        )
      })

      // Schedule courier
      let waybillNumber = `EA${Date.now().toString().slice(-8)}`
      let trackingUrl = ""
      try {
        const courierResult = await schedulePickup({
          provider: "the_courier_guy",
          pickupAddress: {
            name: pickup.pickupContactName,
            phone: pickup.pickupContactPhone,
            email: pickup.pickupContactEmail,
            street: pickup.pickupStreet,
            suburb: pickup.pickupSuburb,
            city: pickup.pickupCity,
            province: pickup.pickupProvince,
            postalCode: pickup.pickupPostalCode,
          },
          deliveryAddress: {
            name: org.name,
            phone: org.contactPhone ?? "",
            email: org.contactEmail ?? undefined,
            street: org.streetAddress ?? "",
            suburb: org.suburb || undefined,
            city: org.city,
            province: org.province,
            postalCode: org.postalCode ?? "",
          },
          scheduledDate: new Date(pickup.scheduledPickupDate),
          timeSlot: pickup.scheduledPickupTimeSlot,
          weightKg: 5,
          reference: contributionId,
        })
        waybillNumber = courierResult.waybillNumber
        trackingUrl = courierResult.trackingUrl
      } catch {
        // Courier API not configured — use generated waybill
      }

      await db.insert(courierJobs).values({
        id: generateId("cjb"),
        goodsContributionId: goodsId,
        provider: "the_courier_guy",
        waybillNumber,
        trackingUrl: trackingUrl || null,
        pickupVerificationCode: pickupOtp,
        deliveryVerificationCode: deliveryOtp,
        status: "scheduled",
        estimatedPickupAt: new Date(pickup.scheduledPickupDate),
      })

      // Send confirmation email
      if (pickup.pickupContactEmail || session.user.email) {
        try {
          await sendPickupConfirmationEmail(
            pickup.pickupContactEmail || session.user.email,
            {
              contributorName: pickup.pickupContactName,
              orgName: org.name,
              pickupDate: new Date(pickup.scheduledPickupDate).toLocaleDateString("en-ZA"),
              timeSlot: formatTimeSlot(pickup.scheduledPickupTimeSlot),
              verificationCode: pickupOtp,
              waybillNumber,
            }
          )
        } catch {
          // Email failure is non-blocking
        }
      }

      await trackEvent({
        name: "pickup_scheduled",
        userId: session.user.id,
        organisationId: org.id,
        contributionId,
        properties: {
          itemCount: items.length,
          province: pickup.pickupProvince,
          timeSlot: pickup.scheduledPickupTimeSlot,
        },
      })

      return NextResponse.json(
        { contributionId, waybillNumber, trackingUrl },
        { status: 201 }
      )
    }

    return NextResponse.json({ error: "Invalid contribution type" }, { status: 400 })
  } catch (error: any) {
    console.error("Contribution error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userContributions = await db.query.contributions.findMany({
    where: eq(contributions.contributorId, session.user.id),
    with: {
      organisation: { columns: { id: true, name: true, slug: true } },
      donation: true,
      goodsContribution: { with: { items: true, courierJob: true } },
    },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
    limit: 50,
  })

  return NextResponse.json({ contributions: userContributions })
}
