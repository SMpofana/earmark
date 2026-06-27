import Link from "next/link"
import {
  Heart,
  Package,
  Truck,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgCard } from "@/components/org-card"
import { db } from "@/lib/db"
import { organisations, organisationCauses, organisationImages } from "@/lib/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { getPlatformAnalytics } from "@/lib/analytics"
import { formatCurrency } from "@/lib/utils"

async function getFeaturedOrgs() {
  return db.query.organisations.findMany({
    where: eq(organisations.status, "active"),
    with: {
      causes: true,
      images: {
        where: eq(organisationImages.type, "logo"),
        limit: 1,
      },
    },
    orderBy: [desc(organisations.contributorCount)],
    limit: 6,
  })
}

const CONTRIBUTION_TYPES = [
  { icon: "💸", label: "Money", desc: "Direct EFT or card payment via Paystack" },
  { icon: "👕", label: "Clothes", desc: "New or gently used clothing for all ages" },
  { icon: "🥫", label: "Food", desc: "Non-perishable food items and staples" },
  { icon: "🧸", label: "Toys", desc: "Educational and recreational toys" },
  { icon: "🛏", label: "Blankets", desc: "Warm blankets for families in need" },
  { icon: "📚", label: "Books", desc: "Educational materials and storybooks" },
]

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: Heart,
    title: "Choose a cause",
    desc: "Browse verified NPOs across South Africa, filtered by cause, province, or contribution type.",
  },
  {
    step: "2",
    icon: Package,
    title: "Pack your contribution",
    desc: "Select what you'd like to donate — money, goods, or both. Add items with condition and quantity.",
  },
  {
    step: "3",
    icon: Truck,
    title: "We schedule pickup",
    desc: "A verified courier collects your goods from your door. You receive a 6-digit OTP to confirm the handover.",
  },
  {
    step: "4",
    icon: ShieldCheck,
    title: "Delivered & verified",
    desc: "The organisation confirms delivery with a second OTP. You receive a receipt and impact update.",
  },
]

export default async function HomePage() {
  const [featuredOrgs, stats] = await Promise.all([
    getFeaturedOrgs().catch(() => []),
    getPlatformAnalytics().catch(() => ({
      activeOrgs: 0,
      totalContributions: 0,
      totalDonationsZar: 0,
      totalUsers: 0,
    })),
  ])

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-orange-700 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white" />
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-white" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium mb-6">
              <Star className="h-3.5 w-3.5" />
              Proudly South African
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Your generosity,
              <br />
              <span className="text-yellow-300">earmarked</span> for good.
            </h1>
            <p className="text-lg md:text-xl text-white/85 mb-8 leading-relaxed">
              Connect with verified non-profit organisations across Mzansi. Donate money, clothes,
              food, toys and more — we handle the courier so your contribution reaches people who
              need it most.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/organisations">
                <Button size="xl" className="bg-white text-brand-600 hover:bg-brand-50 font-semibold w-full sm:w-auto">
                  Find an organisation
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/register?role=org_admin">
                <Button
                  size="xl"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 w-full sm:w-auto"
                >
                  Register your NPO
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 text-center">
            {[
              { label: "Active NPOs", value: stats.activeOrgs.toLocaleString() },
              { label: "Contributors", value: stats.totalUsers.toLocaleString() },
              { label: "Contributions made", value: stats.totalContributions.toLocaleString() },
              {
                label: "Donated in total",
                value: stats.totalDonationsZar > 0
                  ? formatCurrency(stats.totalDonationsZar * 100)
                  : "R0",
              },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl md:text-3xl font-bold text-brand-600">{s.value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              From your doorstep to an organisation in need — four simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
                  <Icon className="h-7 w-7 text-brand-500" />
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold">
                  {step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contribution types */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">What can you contribute?</h2>
            <p className="text-slate-500">Every form of generosity counts.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {CONTRIBUTION_TYPES.map(({ icon, label, desc }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center p-5 rounded-xl bg-white border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <span className="text-3xl mb-2">{icon}</span>
                <p className="font-semibold text-slate-900 text-sm mb-1">{label}</p>
                <p className="text-xs text-slate-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured orgs */}
      {featuredOrgs.length > 0 && (
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  Featured organisations
                </h2>
                <p className="text-slate-500">Verified NPOs making a difference right now.</p>
              </div>
              <Link href="/organisations">
                <Button variant="outline">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredOrgs.map((org) => (
                <OrgCard key={org.id} org={org} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* For NPOs CTA */}
      <section className="py-20 bg-teal-600 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Are you an NPO or charity?
          </h2>
          <p className="text-teal-100 text-lg mb-8 max-w-xl mx-auto">
            Register for free. Our onboarding captures everything donors need to trust your cause —
            including banking details for direct donations, your address for good deliveries, and
            your impact story.
          </p>
          <Link href="/register?role=org_admin">
            <Button size="xl" className="bg-white text-teal-700 hover:bg-teal-50 font-semibold">
              Register your organisation <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
