"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DollarSign, ArrowLeft, ShieldCheck } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000]

export default function MoneyContributionPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = use(params)
  const router = useRouter()
  const { data: session } = useSession()

  const [amountRands, setAmountRands] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [orgName] = useState("this organisation") // would be fetched in real impl

  const amountCents = Math.round(parseFloat(amountRands || "0") * 100)
  const valid = amountCents >= 1000

  async function handleDonate() {
    if (!session) { router.push(`/login?callbackUrl=/contribute/${orgId}/money`); return }
    if (!valid) { setError("Minimum donation is R10"); return }

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug: orgId,
          type: "money",
          amountCents,
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to initiate payment"); return }

      // Redirect to Paystack checkout
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      } else {
        router.push(`/track/${data.contributionId}`)
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-md">
        <Link
          href={`/organisations/${orgId}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to organisation
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Donate money</h1>
              <p className="text-sm text-slate-500">Secure payment via Paystack</p>
            </div>
          </div>

          {/* Preset amounts */}
          <div className="mb-5">
            <Label className="mb-2 block">Choose an amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAmountRands(r.toString())}
                  className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-colors ${
                    amountRands === r.toString()
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  R{r.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <Label htmlFor="amount" required>Or enter custom amount (ZAR)</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R</span>
              <Input
                id="amount"
                type="number"
                min="10"
                step="1"
                value={amountRands}
                onChange={(e) => { setAmountRands(e.target.value); setError("") }}
                placeholder="0"
                className="pl-7"
                error={error}
              />
            </div>
            {amountCents >= 1000 && (
              <p className="mt-1.5 text-xs text-green-600 font-medium">
                Donating {formatCurrency(amountCents)} to {orgName}
              </p>
            )}
          </div>

          <div className="mb-6">
            <Label htmlFor="notes">Message to the organisation (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share why you're donating…"
              rows={3}
              className="mt-1.5"
            />
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 mb-5">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="h-4 w-4 text-teal-500 shrink-0" />
              <span>Payments processed securely by <strong>Paystack</strong>. Earmark never stores your card details.</span>
            </div>
          </div>

          <Button
            onClick={handleDonate}
            disabled={loading || !valid}
            className="w-full"
            size="lg"
          >
            {loading
              ? "Redirecting to payment…"
              : valid
              ? `Donate ${formatCurrency(amountCents)}`
              : "Enter an amount to continue"}
          </Button>

          {!session && (
            <p className="mt-3 text-center text-xs text-slate-400">
              You&apos;ll be asked to sign in before completing your donation.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
