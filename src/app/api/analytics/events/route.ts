import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { analyticsEvents } from "@/lib/db/schema"
import { generateId } from "@/lib/utils"

// Client-side event ingestion endpoint
export async function POST(request: NextRequest) {
  if (process.env.ANALYTICS_ENABLED !== "true") {
    return NextResponse.json({ ok: true })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { events } = body
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "events array required" }, { status: 400 })
  }

  const ipAddress =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    null
  const userAgent = request.headers.get("user-agent") ?? null

  // Batch insert up to 50 events
  const toInsert = events.slice(0, 50).map((e: any) => ({
    id: generateId("evt"),
    eventName: String(e.name || "unknown"),
    userId: e.userId ? String(e.userId) : null,
    sessionId: e.sessionId ? String(e.sessionId) : null,
    anonymousId: e.anonymousId ? String(e.anonymousId) : null,
    organisationId: e.organisationId ? String(e.organisationId) : null,
    contributionId: e.contributionId ? String(e.contributionId) : null,
    properties: e.properties ?? {},
    ipAddress,
    userAgent,
    referrer: e.referrer ?? null,
    utmSource: e.utmSource ?? null,
    utmMedium: e.utmMedium ?? null,
    utmCampaign: e.utmCampaign ?? null,
  }))

  try {
    await db.insert(analyticsEvents).values(toInsert)
  } catch (err) {
    // Never fail the client for analytics errors
    console.error("Analytics insert error:", err)
  }

  return NextResponse.json({ ok: true, inserted: toInsert.length })
}

// Admin: platform-wide analytics summary
export async function GET(request: NextRequest) {
  const { getPlatformAnalytics } = await import("@/lib/analytics")
  const stats = await getPlatformAnalytics()
  return NextResponse.json(stats)
}
