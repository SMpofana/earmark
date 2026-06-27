import { redirect } from "next/navigation"
import Link from "next/link"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  organisations,
  contributions,
  organisationImages,
  donations,
  goodsContributions,
  courierJobs,
} from "@/lib/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Package, DollarSign, Users, TrendingUp, Clock,
  CheckCircle2, Truck, AlertCircle, ArrowRight, Plus,
} from "lucide-react"
import {
  formatCurrency, contributionStatusLabel, orgStatusLabel, orgStatusColor,
} from "@/lib/utils"
import { getOrgAnalytics } from "@/lib/analytics"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login?callbackUrl=/dashboard")

  const sp = await searchParams
  const isOrgAdmin = session.user.role === "org_admin" || session.user.role === "super_admin"

  if (isOrgAdmin) {
    // Organisation dashboard
    const org = await db.query.organisations.findFirst({
      where: eq(organisations.userId, session.user.id),
      with: {
        images: { where: eq(organisationImages.type, "logo"), limit: 1 },
        contributions: {
          orderBy: [desc(contributions.createdAt)],
          limit: 10,
          with: {
            contributor: { columns: { id: true, name: true, email: true } },
            donation: true,
            goodsContribution: { with: { items: true, courierJob: true } },
          },
        },
      },
    })

    if (!org) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Set up your organisation</h1>
            <p className="text-slate-500 mb-6">
              Complete the onboarding process to list your NPO and start receiving contributions.
            </p>
            <Link href="/onboard">
              <Button size="lg"><Plus className="h-5 w-5" /> Start onboarding</Button>
            </Link>
          </div>
        </div>
      )
    }

    const analytics = await getOrgAnalytics(org.id).catch(() => ({
      views30d: 0, totalContributions: 0, totalDonationsZar: 0,
    }))

    const pendingGoods = org.contributions.filter(
      (c) => c.type === "goods" && ["scheduled", "collected", "in_transit"].includes(c.status)
    )

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${orgStatusColor(org.status)}`}
                  >
                    {orgStatusLabel(org.status)}
                  </span>
                </div>
                <p className="text-sm text-slate-500">Organisation dashboard</p>
              </div>
              <Link href={`/organisations/${org.slug}`}>
                <Button variant="outline" size="sm">View public page</Button>
              </Link>
            </div>
          </div>
        </div>

        {org.status !== "active" && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-5 py-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900">
                  {org.status === "pending"
                    ? "Your application is under review"
                    : org.status === "rejected"
                    ? "Your application was not approved"
                    : "Account status: " + orgStatusLabel(org.status)}
                </p>
                {org.rejectionReason && (
                  <p className="text-yellow-700 mt-1">Reason: {org.rejectionReason}</p>
                )}
                <p className="text-yellow-700 mt-1">
                  Our team will contact you within 2–3 business days.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: "Profile views (30d)",
                value: analytics.views30d.toLocaleString(),
                icon: TrendingUp,
                color: "text-blue-600 bg-blue-50",
              },
              {
                label: "Total contributions",
                value: analytics.totalContributions.toLocaleString(),
                icon: Users,
                color: "text-brand-600 bg-brand-50",
              },
              {
                label: "Total donated",
                value: formatCurrency(org.totalDonationsZar * 100),
                icon: DollarSign,
                color: "text-green-600 bg-green-50",
              },
              {
                label: "Goods received",
                value: org.totalGoodsReceived.toLocaleString() + " items",
                icon: Package,
                color: "text-purple-600 bg-purple-50",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="pt-5">
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${color} mb-3`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pending pickups */}
          {pendingGoods.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-brand-500" /> In-transit deliveries
              </h2>
              <div className="space-y-3">
                {pendingGoods.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {c.contributor.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.goodsContribution?.items.reduce((s, i) => s + i.quantity, 0)} items ·{" "}
                        {contributionStatusLabel(c.status)}
                      </p>
                      {c.goodsContribution?.courierJob?.waybillNumber && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Waybill: {c.goodsContribution.courierJob.waybillNumber}
                        </p>
                      )}
                    </div>
                    <Link href={`/track/${c.id}`}>
                      <Button variant="ghost" size="sm">
                        Track <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent contributions */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent contributions</h2>
            {org.contributions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                No contributions yet.{" "}
                {org.status !== "active" && "Your organisation must be approved first."}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contributor</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount / Items</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {org.contributions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">{c.contributor.name}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.type === "money" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                            {c.type === "money" ? "Money" : "Goods"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {c.type === "money" && c.donation
                            ? formatCurrency(c.donation.amountCents)
                            : `${c.goodsContribution?.items.reduce((s, i) => s + i.quantity, 0) ?? 0} items`}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-slate-600">{contributionStatusLabel(c.status)}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs">
                          {new Date(c.createdAt).toLocaleDateString("en-ZA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Contributor dashboard
  const userContributions = await db.query.contributions.findMany({
    where: eq(contributions.contributorId, session.user.id),
    with: {
      organisation: { columns: { id: true, name: true, slug: true } },
      donation: true,
      goodsContribution: {
        with: {
          items: true,
          courierJob: { columns: { status: true, waybillNumber: true, trackingUrl: true } },
        },
      },
    },
    orderBy: [desc(contributions.createdAt)],
    limit: 20,
  })

  const totalDonated = userContributions
    .filter((c) => c.type === "money" && c.donation?.paystackStatus === "success")
    .reduce((sum, c) => sum + (c.donation?.amountCents ?? 0), 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session.user.name.split(" ")[0]}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Your contribution history</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5">
              <DollarSign className="h-5 w-5 text-green-600 mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(totalDonated)}</p>
              <p className="text-xs text-slate-500">Total donated</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <Package className="h-5 w-5 text-blue-600 mb-2" />
              <p className="text-2xl font-bold">
                {userContributions.filter((c) => c.type === "goods").length}
              </p>
              <p className="text-xs text-slate-500">Goods contributions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <CheckCircle2 className="h-5 w-5 text-teal-600 mb-2" />
              <p className="text-2xl font-bold">
                {userContributions.filter((c) => c.status === "completed").length}
              </p>
              <p className="text-xs text-slate-500">Completed</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <Link href="/organisations">
            <Button><Plus className="h-4 w-4" /> Make a contribution</Button>
          </Link>
        </div>

        {/* History */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Contribution history</h2>
          {userContributions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
              You haven&apos;t made any contributions yet.{" "}
              <Link href="/organisations" className="text-brand-600 hover:underline">
                Find an organisation to support.
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {userContributions.map((c) => (
                <Link key={c.id} href={`/track/${c.id}`}>
                  <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-brand-300 hover:shadow-sm transition-all flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{c.organisation.name}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {c.type === "money" && c.donation
                          ? formatCurrency(c.donation.amountCents)
                          : `${c.goodsContribution?.items.reduce((s, i) => s + i.quantity, 0) ?? 0} items`}
                        {" · "}
                        {new Date(c.createdAt).toLocaleDateString("en-ZA")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {contributionStatusLabel(c.status)}
                      </span>
                      {c.status === "completed"
                        ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                        : c.status === "scheduled" || c.status === "in_transit"
                        ? <Truck className="h-5 w-5 text-blue-500" />
                        : <Clock className="h-5 w-5 text-slate-400" />
                      }
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
