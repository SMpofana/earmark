import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq, and, desc, like, or } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  organisations,
  organisationCauses,
  organisationBanking,
  organisationImages,
} from "@/lib/db/schema"
import { generateId, slugify } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"
import { sendOrgApprovedEmail } from "@/lib/email"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  const province = searchParams.get("province")
  const cause = searchParams.get("cause")
  const type = searchParams.get("type")
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(48, parseInt(searchParams.get("limit") || "12"))

  const conditions: any[] = [eq(organisations.status, "active")]
  if (province) conditions.push(eq(organisations.province, province as any))
  if (search) {
    conditions.push(
      or(
        like(organisations.name, `%${search}%`),
        like(organisations.description, `%${search}%`),
        like(organisations.city, `%${search}%`)
      )!
    )
  }
  if (type === "money") conditions.push(eq(organisations.acceptsMoney, true))
  if (type === "goods") conditions.push(eq(organisations.acceptsGoods, true))

  const orgs = await db.query.organisations.findMany({
    where: and(...conditions),
    with: {
      causes: true,
      images: {
        where: or(
          eq(organisationImages.type, "logo"),
          eq(organisationImages.type, "cover")
        ),
      },
    },
    orderBy: [desc(organisations.contributorCount)],
    limit,
    offset: (page - 1) * limit,
  })

  // Filter by cause post-query (simpler than complex subquery)
  const filtered = cause
    ? orgs.filter((o) => o.causes.some((c) => c.cause === cause))
    : orgs

  return NextResponse.json({ organisations: filtered, page, limit })
}

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

  const {
    name, description, missionStatement, registrationNumber, npoStatus,
    contactEmail, contactPhone, website, acceptsMoney, acceptsGoods,
    causes, streetAddress, suburb, city, province, postalCode,
    bankName, bankNameOther, accountHolderName, accountNumber, accountType, branchCode,
    logoUrl, coverUrl,
  } = body

  // Basic validation
  if (!name?.trim() || name.length < 3) {
    return NextResponse.json({ error: "Organisation name too short" }, { status: 400 })
  }
  if (!description?.trim() || description.length < 50) {
    return NextResponse.json({ error: "Description too short (min 50 chars)" }, { status: 400 })
  }
  if (!causes?.length) {
    return NextResponse.json({ error: "At least one cause required" }, { status: 400 })
  }

  const orgId = generateId("org")
  let slug = slugify(name)

  // Ensure slug uniqueness
  const existing = await db.query.organisations.findFirst({
    where: eq(organisations.slug, slug),
  })
  if (existing) slug = `${slug}-${orgId.slice(-6)}`

  try {
    await db.transaction(async (tx) => {
      // Create org
      await tx.insert(organisations).values({
        id: orgId,
        userId: session.user.id,
        name: name.trim(),
        slug,
        description: description.trim(),
        missionStatement: missionStatement?.trim() || null,
        registrationNumber: registrationNumber?.trim() || null,
        npoStatus: Boolean(npoStatus),
        status: "pending",
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        website: website?.trim() || null,
        acceptsMoney: Boolean(acceptsMoney ?? true),
        acceptsGoods: Boolean(acceptsGoods ?? true),
        streetAddress: streetAddress.trim(),
        suburb: suburb?.trim() || null,
        city: city.trim(),
        province: province as any,
        postalCode: postalCode.trim(),
        submittedAt: new Date(),
      })

      // Causes
      if (causes?.length) {
        await tx.insert(organisationCauses).values(
          causes.map((c: string) => ({ organisationId: orgId, cause: c as any }))
        )
      }

      // Banking
      if (bankName) {
        await tx.insert(organisationBanking).values({
          id: generateId("bnk"),
          organisationId: orgId,
          bankName: bankName as any,
          bankNameOther: bankNameOther?.trim() || null,
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          accountType: accountType as any,
          branchCode: branchCode.trim(),
        })
      }

      // Images
      const imageInserts: any[] = []
      if (logoUrl?.trim()) {
        imageInserts.push({
          id: generateId("img"),
          organisationId: orgId,
          url: logoUrl.trim(),
          type: "logo",
          displayOrder: 0,
        })
      }
      if (coverUrl?.trim()) {
        imageInserts.push({
          id: generateId("img"),
          organisationId: orgId,
          url: coverUrl.trim(),
          type: "cover",
          displayOrder: 0,
        })
      }
      if (imageInserts.length) {
        await tx.insert(organisationImages).values(imageInserts)
      }
    })

    // Analytics
    await trackEvent({
      name: "org_submitted",
      userId: session.user.id,
      organisationId: orgId,
      properties: { slug, causeCount: causes.length },
    })

    return NextResponse.json({ success: true, orgId, slug }, { status: 201 })
  } catch (error: any) {
    console.error("Failed to create organisation:", error)
    return NextResponse.json(
      { error: "Failed to create organisation" },
      { status: 500 }
    )
  }
}
