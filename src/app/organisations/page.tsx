import { Suspense } from "react"
import { db } from "@/lib/db"
import { organisations, organisationImages, organisationCauses } from "@/lib/db/schema"
import { eq, and, desc, like, or, inArray } from "drizzle-orm"
import { OrgCard } from "@/components/org-card"
import { Search, SlidersHorizontal } from "lucide-react"
import { formatProvince, formatCause } from "@/lib/utils"

const PROVINCES = [
  "gauteng","western_cape","kwazulu_natal","eastern_cape",
  "limpopo","mpumalanga","north_west","free_state","northern_cape",
]
const CAUSE_LIST = [
  "food_security","education","healthcare","shelter","clothing",
  "children","elderly","disability","animal_welfare","environment",
  "arts_culture","disaster_relief","youth_development",
  "gender_based_violence","community_development","other",
]

async function getOrgs(params: { search?: string; province?: string; cause?: string; type?: string }) {
  const conditions: any[] = [eq(organisations.status, "active")]

  if (params.province) {
    conditions.push(eq(organisations.province, params.province as any))
  }
  if (params.search) {
    conditions.push(
      or(
        like(organisations.name, `%${params.search}%`),
        like(organisations.description, `%${params.search}%`),
        like(organisations.city, `%${params.search}%`)
      )!
    )
  }
  if (params.type === "money") {
    conditions.push(eq(organisations.acceptsMoney, true))
  }
  if (params.type === "goods") {
    conditions.push(eq(organisations.acceptsGoods, true))
  }

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
    limit: 48,
  })

  if (params.cause) {
    return orgs.filter((o) => o.causes.some((c) => c.cause === params.cause))
  }
  return orgs
}

export default async function OrganisationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp = await searchParams
  const orgs = await getOrgs({
    search: sp.search,
    province: sp.province,
    cause: sp.cause,
    type: sp.type,
  }).catch(() => [])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Find organisations</h1>
          <p className="text-slate-500 text-sm">
            {orgs.length} verified NPO{orgs.length !== 1 ? "s" : ""} across South Africa
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar filters */}
          <aside className="lg:w-64 shrink-0">
            <form method="GET" className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 sticky top-20">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    name="search"
                    defaultValue={sp.search}
                    placeholder="Organisation or city…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Province</label>
                <select
                  name="province"
                  defaultValue={sp.province || ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">All provinces</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{formatProvince(p)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cause</label>
                <select
                  name="cause"
                  defaultValue={sp.cause || ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">All causes</option>
                  {CAUSE_LIST.map((c) => (
                    <option key={c} value={c}>{formatCause(c)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contribution type</label>
                <select
                  name="type"
                  defaultValue={sp.type || ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Money or goods</option>
                  <option value="money">Money donations</option>
                  <option value="goods">Physical goods</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-brand-500 text-white py-2 text-sm font-medium hover:bg-brand-600 transition-colors"
              >
                Apply filters
              </button>
              {Object.keys(sp).length > 0 && (
                <a
                  href="/organisations"
                  className="block text-center text-sm text-slate-500 hover:text-slate-700"
                >
                  Clear all filters
                </a>
              )}
            </form>
          </aside>

          {/* Org grid */}
          <div className="flex-1">
            {orgs.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <p className="text-lg font-medium mb-1">No organisations found</p>
                <p className="text-sm">Try adjusting your filters or{" "}
                  <a href="/organisations" className="text-brand-600 hover:underline">clear them</a>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {orgs.map((org) => (
                  <OrgCard key={org.id} org={org} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
