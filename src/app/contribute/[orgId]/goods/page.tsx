"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Package, Plus, Trash2, ArrowLeft, Truck, CheckCircle2, ChevronRight, ChevronLeft,
} from "lucide-react"
import { formatCause, formatProvince, formatTimeSlot } from "@/lib/utils"

const CATEGORIES = [
  { value: "clothes", label: "Clothes" },
  { value: "food", label: "Food" },
  { value: "toys", label: "Toys" },
  { value: "blankets", label: "Blankets" },
  { value: "books", label: "Books" },
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "toiletries", label: "Toiletries" },
  { value: "baby_items", label: "Baby items" },
  { value: "school_supplies", label: "School supplies" },
  { value: "medicine", label: "Medicine" },
  { value: "other", label: "Other" },
]

const CONDITIONS = [
  { value: "new", label: "Brand new" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good condition" },
  { value: "fair", label: "Fair / used" },
]

const PROVINCES = [
  { value: "gauteng", label: "Gauteng" },
  { value: "western_cape", label: "Western Cape" },
  { value: "kwazulu_natal", label: "KwaZulu-Natal" },
  { value: "eastern_cape", label: "Eastern Cape" },
  { value: "limpopo", label: "Limpopo" },
  { value: "mpumalanga", label: "Mpumalanga" },
  { value: "north_west", label: "North West" },
  { value: "free_state", label: "Free State" },
  { value: "northern_cape", label: "Northern Cape" },
]

const TIME_SLOTS = [
  { value: "morning_8_12", label: "Morning (08:00–12:00)" },
  { value: "afternoon_12_17", label: "Afternoon (12:00–17:00)" },
  { value: "evening_17_20", label: "Evening (17:00–20:00)" },
]

interface GoodsItem {
  id: string
  category: string
  name: string
  quantity: number
  condition: string
  description: string
}

const STEPS = ["Items", "Pickup details", "Confirm"]

export default function GoodsContributionPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState(0)

  const [items, setItems] = useState<GoodsItem[]>([
    { id: "1", category: "", name: "", quantity: 1, condition: "good", description: "" },
  ])

  const [pickup, setPickup] = useState({
    contactName: "", contactPhone: "", contactEmail: "",
    street: "", suburb: "", city: "", province: "", postalCode: "",
    instructions: "", date: "", timeSlot: "", notes: "",
    isFragile: false, requiresRefrigeration: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), category: "", name: "", quantity: 1, condition: "good", description: "" },
    ])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function updateItem(id: string, key: keyof GoodsItem, value: string | number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [key]: value } : i)))
  }

  function validateStep0() {
    const e: Record<string, string> = {}
    items.forEach((item, idx) => {
      if (!item.category) e[`item_${idx}_category`] = "Required"
      if (!item.name.trim()) e[`item_${idx}_name`] = "Required"
      if (item.quantity < 1) e[`item_${idx}_quantity`] = "Min 1"
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep1() {
    const e: Record<string, string> = {}
    if (!pickup.contactName.trim()) e.contactName = "Required"
    if (!/^(\+27|0)[6-8][0-9]{8}$/.test(pickup.contactPhone)) e.contactPhone = "Valid SA number"
    if (!pickup.street.trim()) e.street = "Required"
    if (!pickup.city.trim()) e.city = "Required"
    if (!pickup.province) e.province = "Required"
    if (!/^\d{4}$/.test(pickup.postalCode)) e.postalCode = "4 digits"
    if (!pickup.date) e.date = "Required"
    if (!pickup.timeSlot) e.timeSlot = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (step === 0 && validateStep0()) setStep(1)
    else if (step === 1 && validateStep1()) setStep(2)
  }

  async function submit() {
    if (!session) { router.push(`/login?callbackUrl=/contribute/${orgId}/goods`); return }
    setLoading(true)
    setServerError("")
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug: orgId,
          type: "goods",
          items,
          pickup: {
            pickupContactName: pickup.contactName,
            pickupContactPhone: pickup.contactPhone,
            pickupContactEmail: pickup.contactEmail,
            pickupStreet: pickup.street,
            pickupSuburb: pickup.suburb,
            pickupCity: pickup.city,
            pickupProvince: pickup.province,
            pickupPostalCode: pickup.postalCode,
            pickupInstructions: pickup.instructions,
            scheduledPickupDate: pickup.date,
            scheduledPickupTimeSlot: pickup.timeSlot,
            isFragile: pickup.isFragile,
            requiresRefrigeration: pickup.requiresRefrigeration,
            specialInstructions: pickup.notes,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setServerError(data.error || "Something went wrong"); return }
      router.push(`/track/${data.contributionId}?booked=1`)
    } catch {
      setServerError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split("T")[0]

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/organisations/${orgId}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to organisation
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i < step
                    ? "bg-brand-500 text-white"
                    : i === step
                    ? "bg-brand-500 text-white ring-4 ring-brand-100"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm ${i === step ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-slate-300 ml-1" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Step 0: Items */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">What are you donating?</h2>
                <p className="text-sm text-slate-500">Add each type of item separately.</p>
              </div>

              <div className="space-y-5">
                {items.map((item, idx) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Item {idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label required>Category</Label>
                        <Select
                          value={item.category}
                          onChange={(e) => updateItem(item.id, "category", e.target.value)}
                          placeholder="Select category"
                          error={errors[`item_${idx}_category`]}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label required>Item name</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          placeholder="e.g. Winter jackets"
                          error={errors[`item_${idx}_name`]}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Condition</Label>
                        <Select
                          value={item.condition}
                          onChange={(e) => updateItem(item.id, "condition", e.target.value)}
                        >
                          {CONDITIONS.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Description (optional)</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        placeholder="Any details about the items…"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4" /> Add another item type
              </Button>
            </div>
          )}

          {/* Step 1: Pickup */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Pickup details</h2>
                <p className="text-sm text-slate-500">
                  A verified courier will collect from this address. You&apos;ll receive a 6-digit
                  OTP to confirm the handover.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-700">
                <Truck className="h-4 w-4 shrink-0" />
                Earmark covers courier costs for verified good-condition donations.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label required>Contact name</Label>
                  <Input
                    value={pickup.contactName}
                    onChange={(e) => setPickup((p) => ({ ...p, contactName: e.target.value }))}
                    placeholder="Who should the driver ask for?"
                    error={errors.contactName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>Contact phone</Label>
                  <Input
                    type="tel"
                    value={pickup.contactPhone}
                    onChange={(e) => setPickup((p) => ({ ...p, contactPhone: e.target.value }))}
                    placeholder="0821234567"
                    error={errors.contactPhone}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Contact email</Label>
                <Input
                  type="email"
                  value={pickup.contactEmail}
                  onChange={(e) => setPickup((p) => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="For pickup confirmation email"
                />
              </div>

              <div className="space-y-1.5">
                <Label required>Street address</Label>
                <Input
                  value={pickup.street}
                  onChange={(e) => setPickup((p) => ({ ...p, street: e.target.value }))}
                  placeholder="123 Main Street"
                  error={errors.street}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Suburb</Label>
                  <Input
                    value={pickup.suburb}
                    onChange={(e) => setPickup((p) => ({ ...p, suburb: e.target.value }))}
                    placeholder="Suburb"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>City</Label>
                  <Input
                    value={pickup.city}
                    onChange={(e) => setPickup((p) => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                    error={errors.city}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label required>Province</Label>
                  <Select
                    value={pickup.province}
                    onChange={(e) => setPickup((p) => ({ ...p, province: e.target.value }))}
                    placeholder="Select province"
                    error={errors.province}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label required>Postal code</Label>
                  <Input
                    value={pickup.postalCode}
                    onChange={(e) => setPickup((p) => ({ ...p, postalCode: e.target.value }))}
                    placeholder="2196"
                    maxLength={4}
                    error={errors.postalCode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label required>Pickup date</Label>
                  <Input
                    type="date"
                    min={minDateStr}
                    value={pickup.date}
                    onChange={(e) => setPickup((p) => ({ ...p, date: e.target.value }))}
                    error={errors.date}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>Time slot</Label>
                  <Select
                    value={pickup.timeSlot}
                    onChange={(e) => setPickup((p) => ({ ...p, timeSlot: e.target.value }))}
                    placeholder="Select time"
                    error={errors.timeSlot}
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Access / gate instructions</Label>
                <Textarea
                  value={pickup.instructions}
                  onChange={(e) => setPickup((p) => ({ ...p, instructions: e.target.value }))}
                  placeholder="e.g. Ring bell at gate, collect from reception…"
                  rows={2}
                />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={pickup.isFragile}
                    onChange={(e) => setPickup((p) => ({ ...p, isFragile: e.target.checked }))}
                    className="h-4 w-4 rounded text-brand-500"
                  />
                  Fragile items
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={pickup.requiresRefrigeration}
                    onChange={(e) => setPickup((p) => ({ ...p, requiresRefrigeration: e.target.checked }))}
                    className="h-4 w-4 rounded text-brand-500"
                  />
                  Requires refrigeration
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Confirm pickup</h2>
                <p className="text-sm text-slate-500">Review your details before we schedule the courier.</p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 divide-y divide-slate-200">
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Items</p>
                  {items.map((item, i) => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span className="text-slate-700">{item.name}</span>
                      <span className="text-slate-500">×{item.quantity} · {item.condition}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 text-sm space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pickup</p>
                  <p className="text-slate-700">{pickup.contactName} · {pickup.contactPhone}</p>
                  <p className="text-slate-600">{pickup.street}, {pickup.suburb && `${pickup.suburb}, `}{pickup.city}</p>
                  <p className="text-slate-600">
                    {new Date(pickup.date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                    {TIME_SLOTS.find((t) => t.value === pickup.timeSlot)?.label}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-slate-700 space-y-1">
                <p className="font-medium">What happens next:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>We&apos;ll email you a 6-digit OTP confirmation code</li>
                  <li>The courier driver arrives in your chosen time window</li>
                  <li>Give the driver your OTP to verify the handover</li>
                  <li>You&apos;ll receive a delivery confirmation once the goods reach {orgId}</li>
                </ol>
              </div>

              {serverError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {serverError}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>

            {step < 2 ? (
              <Button type="button" onClick={next}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={submit}
                disabled={loading}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {loading ? "Scheduling…" : "Schedule pickup"}
                <Truck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
