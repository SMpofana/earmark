import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organisations, auditLogs } from "@/lib/db/schema"
import { generateId } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"
import { sendOrgApprovedEmail, sendOrgRejectedEmail } from "@/lib/email"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const { action, adminNotes, rejectionReason } = await request.json()

  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, id),
    with: { owner: true },
  })
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const oldStatus = org.status
  let newStatus: string

  if (action === "approve") {
    newStatus = "active"
  } else if (action === "reject") {
    newStatus = "rejected"
    if (!rejectionReason) {
      return NextResponse.json({ error: "rejectionReason required" }, { status: 400 })
    }
  } else if (action === "suspend") {
    newStatus = "suspended"
  } else if (action === "request_info") {
    newStatus = "under_review"
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  await db
    .update(organisations)
    .set({
      status: newStatus as any,
      adminNotes: adminNotes?.trim() || org.adminNotes,
      rejectionReason: rejectionReason?.trim() || null,
      isVerified: action === "approve",
      verifiedAt: action === "approve" ? new Date() : org.verifiedAt,
      updatedAt: new Date(),
    })
    .where(eq(organisations.id, id))

  // Audit log
  await db.insert(auditLogs).values({
    id: generateId("aud"),
    userId: session.user.id,
    action: `org.${action}`,
    entityType: "organisation",
    entityId: id,
    oldValues: { status: oldStatus },
    newValues: { status: newStatus, adminNotes, rejectionReason },
  })

  // Email notification
  try {
    if (action === "approve") {
      await sendOrgApprovedEmail(org.owner.email, org.name)
      await trackEvent({
        name: "org_approved",
        organisationId: id,
        userId: session.user.id,
        properties: { orgName: org.name },
      })
    } else if (action === "reject") {
      await sendOrgRejectedEmail(org.owner.email, org.name, rejectionReason)
      await trackEvent({
        name: "org_rejected",
        organisationId: id,
        userId: session.user.id,
        properties: { reason: rejectionReason },
      })
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true, status: newStatus })
}
