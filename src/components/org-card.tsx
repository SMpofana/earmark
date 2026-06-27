import Link from "next/link"
import Image from "next/image"
import { MapPin, Users, Heart } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatProvince, formatCause, causeColor } from "@/lib/utils"

interface OrgCardProps {
  org: {
    id: string
    name: string
    slug: string
    description: string
    city: string
    province: string
    totalDonationsZar: number
    contributorCount: number
    acceptsMoney: boolean
    acceptsGoods: boolean
    causes: Array<{ cause: string }>
    images: Array<{ url: string; type: string }>
  }
}

export function OrgCard({ org }: OrgCardProps) {
  const logo = org.images.find((i) => i.type === "logo")
  const cover = org.images.find((i) => i.type === "cover")
  const topCauses = org.causes.slice(0, 3)

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      {/* Cover image */}
      <div className="relative h-36 bg-gradient-to-br from-brand-100 to-teal-100">
        {cover ? (
          <Image
            src={cover.url}
            alt={org.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <Heart className="h-16 w-16 text-brand-600" />
          </div>
        )}
        {/* Logo */}
        <div className="absolute -bottom-5 left-4">
          <div className="h-10 w-10 rounded-lg border-2 border-white bg-white shadow-sm overflow-hidden">
            {logo ? (
              <Image
                src={logo.url}
                alt={org.name}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-brand-100 flex items-center justify-center">
                <span className="text-brand-600 font-bold text-xs">
                  {org.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <CardContent className="pt-8 pb-5">
        <div className="mb-2">
          <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
            {org.name}
          </h3>
          <div className="flex items-center gap-1 mt-0.5 text-slate-500 text-xs">
            <MapPin className="h-3 w-3" />
            <span>
              {org.city}, {formatProvince(org.province)}
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-600 line-clamp-2 mb-3">
          {org.description}
        </p>

        {/* Causes */}
        <div className="flex flex-wrap gap-1 mb-3">
          {topCauses.map((c) => (
            <span
              key={c.cause}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${causeColor(c.cause)}`}
            >
              {formatCause(c.cause)}
            </span>
          ))}
          {org.causes.length > 3 && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
              +{org.causes.length - 3}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{org.contributorCount} contributors</span>
          </div>
          {org.totalDonationsZar > 0 && (
            <div>
              <span className="text-green-600 font-medium">
                {formatCurrency(org.totalDonationsZar * 100)} raised
              </span>
            </div>
          )}
        </div>

        {/* Accept flags */}
        <div className="flex gap-1.5 mb-4">
          {org.acceptsMoney && (
            <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-700 font-medium">
              Money
            </span>
          )}
          {org.acceptsGoods && (
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700 font-medium">
              Goods
            </span>
          )}
        </div>

        <Link href={`/organisations/${org.slug}`}>
          <Button className="w-full" size="sm">
            View &amp; Contribute
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
