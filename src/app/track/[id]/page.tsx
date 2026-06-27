import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { contributions } from "@/lib/db/schema"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, Clock, Truck, Package, DollarSign,
  MapPin, Phone, ArrowRight, ShieldCheck,
} from "lucide-react"
import {
  contributionStatusLabel, formatCurrency, formatTimeSlot, courierProviderLabel,
} from "@/lib/utils"

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { id } = await params
  const sp = await searchParams

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect(`/login?callbackUrl=/track/${id}`)

  const contribution = await db.query.contributions.findFirst({
    where: eq(contributions.id, id),
    with: {
      organisation: {
        columns: { id: true, name: true, slug: true, city: true, province: true },
      },
      contributor: { columns: { id: true, name: true, email: true } },
      donation: true,
      goodsContribution: {
        with: {
          items: true,
          courierJob: true,
        },
      },
    },
  })

  if (!contribution) notFound()

  // Only the contributor or org admin can view
  if (
    contribution.contributorId !== session.user.id &&
    session.user.role !== "super_admin"
  ) {
    redirect("/dashboard")
  }

  const isMoney = contribution.type === "money"
  const gc = contribution.goodsContribution
  const job = gc?.courierJob

  const STATUS_STEPS = isMoney
    ? ["pending", "confirmed", "completed"]
    : ["draft", "scheduled", "collected", "in_transit", "delivered", "completed"]

  const currentIdx = STATUS_STEPS.indexOf(contribution.status)

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {sp.booked && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-5 py-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium">Pickup scheduled!</p>
              <p className="mt-0.5">Check your email for the verification code to give to the courier driver.</p>
            </div>
          </div>
        )}

        {sp.welcome && (
          <div className="mb-6 rounded-xl bg-teal-50 border border-teal-200 px-5 py-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
            <div className="text-sm text-teal-800">
              <p className="font-medium">Organisation submitted for review!</p>
              <p className="mt-0.5">Our team will review your application within 2–3 business days.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className={`px-6 py-5 ${isMoney ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-brand-500 to-orange-600"} text-white`}>
            <div className="flex items-center gap-3">
              {isMoney
                ? <DollarSign className="h-6 w-6" />
                : <Package className="h-6 w-6" />}
              <div>
                <h1 className="text-lg font-bold">
                  {isMoney ? "Money donation" : "Goods contribution"}
                </h1>
                <p className="text-sm opacity-80">To {contribution.organisation.name}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Progress */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status</p>
              <div className="flex items-center gap-1">
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-1 flex-1">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        i < currentIdx
                          ? "bg-green-500 text-white"
                          : i === currentIdx
                          ? "bg-brand-500 text-white ring-4 ring-brand-100"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {i < currentIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 ${i < currentIdx ? "bg-green-400" : "bg-slate-200"}`} />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {contributionStatusLabel(contribution.status)}
              </p>
            </div>

            {/* Money details */}
            {isMoney && contribution.donation && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(contribution.donation.amountCents)}
                  </span>
                </div>
                {contribution.donation.paystackReference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference</span>
                    <span className="font-mono text-xs">{contribution.donation.paystackReference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment</span>
                  <span className={contribution.donation.paystackStatus === "success" ? "text-green-600" : "text-slate-600"}>
                    {contribution.donation.paystackStatus === "success" ? "Confirmed" : "Pending"}
                  </span>
                </div>
              </div>
            )}

            {/* Goods details */}
            {!isMoney && gc && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Items</p>
                  <div className="space-y-1.5">
                    {gc.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-700">{item.name}</span>
                        <span className="text-slate-500">×{item.quantity} · {item.condition}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pickup</p>
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {gc.pickupStreet}, {gc.pickupCity}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(gc.scheduledPickupDate).toLocaleDateString("en-ZA", {
                        weekday: "long", day: "numeric", month: "long",
                      })}
                      {" — "}
                      {formatTimeSlot(gc.scheduledPickupTimeSlot)}
                    </div>
                  </div>
                </div>

                {job && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Courier</p>
                    <div className="space-y-1.5 text-sm text-slate-600">
                      <p>{courierProviderLabel(job.provider)}</p>
                      {job.waybillNumber && (
                        <p className="font-mono text-xs bg-slate-100 rounded px-2 py-1 inline-block">
                          {job.waybillNumber}
                        </p>
                      )}
                      {job.trackingUrl && (
                        <a
                          href={job.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-brand-600 hover:underline text-xs"
                        >
                          Track on courier site <ArrowRight className="h-3 w-3" />
                        </a>
                      )}

                      {/* Verification codes */}
                      {!job.pickupVerifiedAt && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                          <div className="flex items-center gap-2 text-amber-800 text-sm mb-1">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-medium">Pickup verification</span>
                          </div>
                          <p className="text-xs text-amber-700">
                            Give this code to the driver when they arrive:
                          </p>
                          <p className="text-2xl font-bold tracking-widest text-amber-900 mt-1">
                            {job.pickupVerificationCode}
                          </p>
                        </div>
                      )}
                      {job.pickupVerifiedAt && !job.deliveryVerifiedAt && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                          <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
                          Picked up ·{" "}
                          {new Date(job.pickupVerifiedAt).toLocaleDateString("en-ZA")}
                        </div>
                      )}
                      {job.deliveryVerifiedAt && (
                        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                          <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
                          Delivered to {contribution.organisation.name} ·{" "}
                          {new Date(job.deliveryVerifiedAt).toLocaleDateString("en-ZA")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
              <span>Contribution ID: {id}</span>
              <span>{new Date(contribution.createdAt).toLocaleDateString("en-ZA")}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
          <Link href="/organisations">
            <Button>Contribute again <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
