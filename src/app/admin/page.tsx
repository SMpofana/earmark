import { redirect } from "next/navigation"
import Link from "next/link"
import { headers } from "next/headers"
import { eq, desc, count, and } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organisations, contributions, users, donations, analyticsEvents } from "@/lib/db/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, XCircle, Clock, Users, Building2, Package, DollarSign } from "lucide-react"
import { formatCurrency, orgStatusColor, orgStatusLabel, formatProvince, formatCause } from "@/lib/utils"

async function getAdminStats() {
  const [orgStats, userCount, contribStats] = await Promise.all([
    db.select({ status: organisations.status, count: count() })
      .from(organisations)
      .groupBy(organisations.status),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(contributions).where(eq(contributions.status, "completed")),
  ])
  return { orgStats, userCount: userCount[0]?.count ?? 0, completedContribs: contribStats[0]?.count ?? 0 }
}

async function getPendingOrgs() {
  return db.query.organisations.findMany({
    where: eq(organisations.status, "pending"),
    with: {
      owner: { columns: { id: true, name: true, email: true } },
      causes: true,
    },
    orderBy: [desc(organisations.submittedAt)],
    limit: 20,
  })
}

async function getAllOrgs() {
  return db.query.organisations.findMany({
    with: { owner: { columns: { id: true, name: true, email: true } }, causes: true },
    orderBy: [desc(organisations.createdAt)],
    limit: 50,
  })
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== "super_admin") {
    redirect("/dashboard")
  }

  const sp = await searchParams
  const tab = sp.tab || "pending"

  const [stats, pending, allOrgs] = await Promise.all([
    getAdminStats(),
    getPendingOrgs(),
    tab === "all" ? getAllOrgs() : Promise.resolve([]),
  ])

  const orgStatusMap = Object.fromEntries(stats.orgStats.map((s) => [s.status, s.count]))

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage organisations and platform health</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total users", value: stats.userCount, icon: Users, color: "text-blue-600 bg-blue-50" },
            { label: "Active NPOs", value: orgStatusMap["active"] ?? 0, icon: Building2, color: "text-green-600 bg-green-50" },
            { label: "Pending review", value: orgStatusMap["pending"] ?? 0, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
            { label: "Contributions done", value: stats.completedContribs, icon: CheckCircle2, color: "text-teal-600 bg-teal-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${color} mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {["pending", "all"].map((t) => (
            <Link key={t} href={`/admin?tab=${t}`}>
              <Button variant={tab === t ? "default" : "ghost"} size="sm">
                {t === "pending" ? `Pending review (${pending.length})` : "All organisations"}
              </Button>
            </Link>
          ))}
        </div>

        {/* Org list */}
        <OrgReviewList
          orgs={tab === "pending" ? pending : allOrgs}
          showActions={tab === "pending"}
        />
      </div>
    </div>
  )
}

function OrgReviewList({
  orgs,
  showActions,
}: {
  orgs: any[]
  showActions: boolean
}) {
  if (orgs.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
        {showActions ? "No organisations pending review." : "No organisations found."}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orgs.map((org) => (
        <div key={org.id} className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">{org.name}</h3>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${orgStatusColor(org.status)}`}>
                  {orgStatusLabel(org.status)}
                </span>
                {org.npoStatus && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-teal-100 text-teal-700">
                    Registered NPO
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-2">
                {[org.city, formatProvince(org.province), org.contactEmail, org.contactPhone]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="text-sm text-slate-600 line-clamp-2 mb-3">{org.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {org.causes.slice(0, 4).map((c: any) => (
                  <span key={c.cause} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {formatCause(c.cause)}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Submitted by {org.owner.name} ({org.owner.email}) ·{" "}
                {org.submittedAt
                  ? new Date(org.submittedAt).toLocaleDateString("en-ZA")
                  : new Date(org.createdAt).toLocaleDateString("en-ZA")}
              </p>
            </div>

            {showActions && (
              <div className="flex gap-2 shrink-0">
                <OrgActionForm orgId={org.id} action="approve" />
                <OrgActionForm orgId={org.id} action="reject" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function OrgActionForm({ orgId, action }: { orgId: string; action: "approve" | "reject" }) {
  return (
    <form
      action={async (formData: FormData) => {
        "use server"
        const reason = action === "reject" ? (formData.get("reason") as string) : undefined
        await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/admin/organisations/${orgId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, rejectionReason: reason }),
          }
        )
      }}
    >
      {action === "reject" && (
        <input name="reason" placeholder="Rejection reason" className="hidden" />
      )}
      <Button
        type="submit"
        size="sm"
        variant={action === "approve" ? "secondary" : "destructive"}
        className="gap-1.5"
      >
        {action === "approve"
          ? <><CheckCircle2 className="h-4 w-4" /> Approve</>
          : <><XCircle className="h-4 w-4" /> Reject</>}
      </Button>
    </form>
  )
}
