import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { db } from "@/lib/db"
import { organisations, organisationImages } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"
import { Button } from "@/components/ui/button"
import {
  MapPin, Phone, Mail, Globe, Users, Heart,
  Package, DollarSign, ArrowRight, CheckCircle2,
} from "lucide-react"
import {
  formatProvince, formatCause, formatCurrency,
  causeColor, orgStatusColor, orgStatusLabel,
} from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"
import { headers } from "next/headers"

async function getOrg(slug: string) {
  return db.query.organisations.findFirst({
    where: eq(organisations.slug, slug),
    with: {
      causes: true,
      images: true,
    },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const org = await getOrg(id)
  if (!org) return { title: "Not found" }
  return {
    title: org.name,
    description: org.description.slice(0, 155),
  }
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const org = await getOrg(id)
  if (!org) notFound()

  // Fire analytics event (non-blocking)
  trackEvent({
    name: "org_viewed",
    organisationId: org.id,
    properties: { slug: org.slug },
  }).catch(() => {})

  const logo = org.images.find((i) => i.type === "logo")
  const cover = org.images.find((i) => i.type === "cover")
  const gallery = org.images.filter((i) => i.type === "gallery")
  const isActive = org.status === "active"

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cover */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-brand-100 to-teal-100">
        {cover && (
          <Image
            src={cover.url}
            alt={org.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row gap-4 -mt-8 mb-8">
          <div className="h-20 w-20 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden shrink-0">
            {logo ? (
              <Image
                src={logo.url}
                alt={org.name}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="h-full w-full bg-brand-100 flex items-center justify-center">
                <span className="text-brand-600 font-bold text-xl">
                  {org.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 mt-2 sm:mt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
                  {org.isVerified && (
                    <CheckCircle2 className="h-5 w-5 text-teal-500" title="Verified organisation" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" />
                  <span>{org.city}, {formatProvince(org.province)}</span>
                </div>
              </div>
              {isActive && (
                <div className="flex gap-2 shrink-0">
                  {org.acceptsMoney && (
                    <Link href={`/contribute/${org.slug}/money`}>
                      <Button size="sm" className="gap-1.5">
                        <DollarSign className="h-4 w-4" /> Donate money
                      </Button>
                    </Link>
                  )}
                  {org.acceptsGoods && (
                    <Link href={`/contribute/${org.slug}/goods`}>
                      <Button size="sm" variant="secondary" className="gap-1.5">
                        <Package className="h-4 w-4" /> Send goods
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 pb-16">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">About</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {org.description}
              </p>
              {org.missionStatement && (
                <blockquote className="mt-4 border-l-4 border-brand-300 pl-4 italic text-slate-600">
                  "{org.missionStatement}"
                </blockquote>
              )}
            </div>

            {/* Causes */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Causes</h2>
              <div className="flex flex-wrap gap-2">
                {org.causes.map((c) => (
                  <span
                    key={c.cause}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${causeColor(c.cause)}`}
                  >
                    {formatCause(c.cause)}
                  </span>
                ))}
              </div>
            </div>

            {/* Gallery */}
            {gallery.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                      <Image
                        src={img.url}
                        alt={img.altText || org.name}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Stats */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Impact</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> Contributors
                  </span>
                  <span className="font-semibold">{org.contributorCount}</span>
                </div>
                {org.totalDonationsZar > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" /> Raised
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(org.totalDonationsZar * 100)}
                    </span>
                  </div>
                )}
                {org.totalGoodsReceived > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Package className="h-4 w-4" /> Goods received
                    </span>
                    <span className="font-semibold">{org.totalGoodsReceived} items</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Contact</h3>
              <div className="space-y-3 text-sm">
                <a
                  href={`mailto:${org.contactEmail}`}
                  className="flex items-center gap-2 text-slate-600 hover:text-brand-600"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {org.contactEmail}
                </a>
                <a
                  href={`tel:${org.contactPhone}`}
                  className="flex items-center gap-2 text-slate-600 hover:text-brand-600"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {org.contactPhone}
                </a>
                {org.website && (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-slate-600 hover:text-brand-600"
                  >
                    <Globe className="h-4 w-4 shrink-0" />
                    Website
                  </a>
                )}
                <div className="flex items-start gap-2 text-slate-500">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    {[org.streetAddress, org.suburb, org.city, formatProvince(org.province)]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            {isActive && (
              <div className="bg-brand-50 rounded-xl border border-brand-200 p-5">
                <Heart className="h-6 w-6 text-brand-500 mb-2" />
                <p className="text-sm font-medium text-slate-800 mb-3">
                  Ready to make a difference?
                </p>
                <div className="space-y-2">
                  {org.acceptsMoney && (
                    <Link href={`/contribute/${org.slug}/money`}>
                      <Button className="w-full" size="sm">
                        Donate money <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {org.acceptsGoods && (
                    <Link href={`/contribute/${org.slug}/goods`}>
                      <Button variant="outline" className="w-full" size="sm">
                        Send goods <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {!isActive && (
              <div className="rounded-xl border border-slate-200 p-5 text-center text-sm text-slate-500">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${orgStatusColor(org.status)}`}
                >
                  {orgStatusLabel(org.status)}
                </span>
                <p className="mt-2">This organisation is not yet accepting contributions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
