"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Heart,
  MapPin,
  Landmark,
  Image,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react"
import {
  CAUSES,
  SA_PROVINCES,
  SA_BANKS,
  formatCause,
  formatProvince,
  causeColor,
} from "@/lib/utils"

// We import from lib/utils for format helpers — they're identical to validations const lists
import { formatBank } from "@/lib/utils"

const STEPS = [
  { id: 1, label: "Basics", icon: Building2 },
  { id: 2, label: "Causes", icon: Heart },
  { id: 3, label: "Address", icon: MapPin },
  { id: 4, label: "Banking", icon: Landmark },
  { id: 5, label: "Media", icon: Image },
  { id: 6, label: "Review", icon: CheckCircle2 },
]

const PROVINCES = [
  "gauteng", "western_cape", "kwazulu_natal", "eastern_cape",
  "limpopo", "mpumalanga", "north_west", "free_state", "northern_cape",
]
const BANKS = [
  "absa","standard_bank","fnb","nedbank","capitec",
  "discovery_bank","investec","african_bank","grindrod",
  "sasfin","bidvest","tyme_bank","other",
]
const CAUSE_LIST = [
  "food_security","education","healthcare","shelter","clothing",
  "children","elderly","disability","animal_welfare","environment",
  "arts_culture","disaster_relief","youth_development",
  "gender_based_violence","community_development","other",
]

type FormState = {
  name: string; description: string; missionStatement: string
  registrationNumber: string; npoStatus: boolean; contactEmail: string
  contactPhone: string; website: string; acceptsMoney: boolean; acceptsGoods: boolean
  causes: string[]
  streetAddress: string; suburb: string; city: string; province: string; postalCode: string
  bankName: string; bankNameOther: string; accountHolderName: string
  accountNumber: string; accountType: string; branchCode: string
  logoUrl: string; coverUrl: string
}

const INITIAL: FormState = {
  name: "", description: "", missionStatement: "", registrationNumber: "",
  npoStatus: false, contactEmail: "", contactPhone: "", website: "",
  acceptsMoney: true, acceptsGoods: true, causes: [],
  streetAddress: "", suburb: "", city: "", province: "", postalCode: "",
  bankName: "", bankNameOther: "", accountHolderName: "",
  accountNumber: "", accountType: "current", branchCode: "",
  logoUrl: "", coverUrl: "",
}

export default function OnboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")

  function set(key: keyof FormState, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function toggleCause(cause: string) {
    setForm((prev) => ({
      ...prev,
      causes: prev.causes.includes(cause)
        ? prev.causes.filter((c) => c !== cause)
        : prev.causes.length < 5
        ? [...prev.causes, cause]
        : prev.causes,
    }))
  }

  function validate(s: number): boolean {
    const e: typeof errors = {}
    if (s === 1) {
      if (!form.name.trim() || form.name.length < 3) e.name = "At least 3 characters required"
      if (!form.description.trim() || form.description.length < 50)
        e.description = "At least 50 characters required"
      if (!form.contactEmail.includes("@")) e.contactEmail = "Valid email required"
      if (!/^(\+27|0)[6-8][0-9]{8}$/.test(form.contactPhone))
        e.contactPhone = "Valid SA phone number required"
    }
    if (s === 2) {
      if (form.causes.length === 0) e.causes = "Select at least one cause"
    }
    if (s === 3) {
      if (!form.streetAddress.trim()) e.streetAddress = "Street address required"
      if (!form.city.trim()) e.city = "City required"
      if (!form.province) e.province = "Province required"
      if (!/^\d{4}$/.test(form.postalCode)) e.postalCode = "4-digit postal code required"
    }
    if (s === 4) {
      if (!form.bankName) e.bankName = "Select a bank"
      if (!form.accountHolderName.trim()) e.accountHolderName = "Account holder name required"
      if (!/^\d{6,16}$/.test(form.accountNumber)) e.accountNumber = "Valid account number required"
      if (!/^\d{4,}$/.test(form.branchCode)) e.branchCode = "Valid branch code required"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validate(step)) setStep((s) => Math.min(s + 1, 6))
  }
  function back() { setStep((s) => Math.max(s - 1, 1)) }

  async function submit() {
    setSubmitting(true)
    setServerError("")
    try {
      const res = await fetch("/api/organisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error || "Something went wrong. Please try again.")
        return
      }
      const data = await res.json()
      router.push(`/dashboard?welcome=1`)
    } catch {
      setServerError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const pct = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Register your organisation</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Step {step} of {STEPS.length} — {STEPS[step - 1].label}
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-6">
          <Progress value={pct} className="mb-4" />
          <div className="flex justify-between">
            {STEPS.map(({ id, label, icon: Icon }) => (
              <div
                key={id}
                className={`flex flex-col items-center gap-1 text-xs ${
                  id < step
                    ? "text-brand-600"
                    : id === step
                    ? "text-brand-500 font-medium"
                    : "text-slate-400"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    id < step
                      ? "border-brand-500 bg-brand-500 text-white"
                      : id === step
                      ? "border-brand-500 bg-white text-brand-500"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {id < step ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="hidden sm:block">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Organisation basics</h2>
                <p className="text-sm text-slate-500">Tell donors who you are and what you do.</p>
              </div>

              <div className="space-y-1.5">
                <Label required>Organisation name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Ubuntu Food Kitchen"
                  error={errors.name}
                />
              </div>

              <div className="space-y-1.5">
                <Label required>Description <span className="font-normal text-slate-400">(min 50 chars)</span></Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe what your organisation does and the communities you serve…"
                  rows={4}
                  error={errors.description}
                />
                <p className="text-xs text-slate-400">{form.description.length}/1000</p>
              </div>

              <div className="space-y-1.5">
                <Label>Mission statement</Label>
                <Textarea
                  value={form.missionStatement}
                  onChange={(e) => set("missionStatement", e.target.value)}
                  placeholder="Our mission is to…"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label required>Contact email</Label>
                  <Input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => set("contactEmail", e.target.value)}
                    placeholder="info@org.co.za"
                    error={errors.contactEmail}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>Contact phone</Label>
                  <Input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => set("contactPhone", e.target.value)}
                    placeholder="0821234567"
                    error={errors.contactPhone}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>NPO / NPC registration no.</Label>
                  <Input
                    value={form.registrationNumber}
                    onChange={(e) => set("registrationNumber", e.target.value)}
                    placeholder="123-456 NPO"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input
                    type="url"
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="https://yourorg.co.za"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>We accept</Label>
                <div className="flex gap-4">
                  {[
                    { key: "acceptsMoney", label: "Money donations" },
                    { key: "acceptsGoods", label: "Physical goods" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[key as "acceptsMoney" | "acceptsGoods"]}
                        onChange={(e) => set(key as keyof FormState, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.npoStatus}
                  onChange={(e) => set("npoStatus", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">
                  This organisation is a registered NPO / NPC / PBO
                </span>
              </label>
            </div>
          )}

          {/* Step 2: Causes */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Your causes</h2>
                <p className="text-sm text-slate-500">
                  Select up to 5 causes. These help donors find you when they want to support a specific area.
                </p>
              </div>
              {errors.causes && (
                <p className="text-sm text-red-500">{errors.causes}</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CAUSE_LIST.map((cause) => {
                  const selected = form.causes.includes(cause)
                  return (
                    <button
                      key={cause}
                      type="button"
                      onClick={() => toggleCause(cause)}
                      className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                        selected
                          ? "border-brand-500 bg-brand-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      {selected && (
                        <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-brand-500" />
                      )}
                      <span className={`text-sm font-medium ${selected ? "text-brand-700" : "text-slate-700"}`}>
                        {formatCause(cause)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-slate-400">
                {form.causes.length}/5 selected
              </p>
            </div>
          )}

          {/* Step 3: Address */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Physical address</h2>
                <p className="text-sm text-slate-500">
                  Used for courier deliveries and to help local donors find you.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label required>Street address</Label>
                <Input
                  value={form.streetAddress}
                  onChange={(e) => set("streetAddress", e.target.value)}
                  placeholder="12 Nelson Mandela Drive"
                  error={errors.streetAddress}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Suburb</Label>
                  <Input
                    value={form.suburb}
                    onChange={(e) => set("suburb", e.target.value)}
                    placeholder="Sandton"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>City</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Johannesburg"
                    error={errors.city}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label required>Province</Label>
                  <Select
                    value={form.province}
                    onChange={(e) => set("province", e.target.value)}
                    placeholder="Select province"
                    error={errors.province}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{formatProvince(p)}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label required>Postal code</Label>
                  <Input
                    value={form.postalCode}
                    onChange={(e) => set("postalCode", e.target.value)}
                    placeholder="2196"
                    maxLength={4}
                    error={errors.postalCode}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Banking */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Banking details</h2>
                <p className="text-sm text-slate-500">
                  Required for direct money donations. Details are stored securely and only used to
                  transfer verified donations.
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                🔒 Banking details are encrypted at rest and only visible to verified administrators.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label required>Bank</Label>
                  <Select
                    value={form.bankName}
                    onChange={(e) => set("bankName", e.target.value)}
                    placeholder="Select bank"
                    error={errors.bankName}
                  >
                    {BANKS.map((b) => (
                      <option key={b} value={b}>{formatBank(b)}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label required>Account type</Label>
                  <Select
                    value={form.accountType}
                    onChange={(e) => set("accountType", e.target.value)}
                  >
                    <option value="current">Current / Cheque</option>
                    <option value="savings">Savings</option>
                    <option value="transmission">Transmission</option>
                  </Select>
                </div>
              </div>

              {form.bankName === "other" && (
                <div className="space-y-1.5">
                  <Label required>Bank name</Label>
                  <Input
                    value={form.bankNameOther}
                    onChange={(e) => set("bankNameOther", e.target.value)}
                    placeholder="Enter bank name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label required>Account holder name</Label>
                <Input
                  value={form.accountHolderName}
                  onChange={(e) => set("accountHolderName", e.target.value)}
                  placeholder="As it appears on the account"
                  error={errors.accountHolderName}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label required>Account number</Label>
                  <Input
                    value={form.accountNumber}
                    onChange={(e) => set("accountNumber", e.target.value)}
                    placeholder="1234567890"
                    error={errors.accountNumber}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>Branch code</Label>
                  <Input
                    value={form.branchCode}
                    onChange={(e) => set("branchCode", e.target.value)}
                    placeholder="632005"
                    error={errors.branchCode}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Media */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Photos & media</h2>
                <p className="text-sm text-slate-500">
                  A logo and cover photo help donors connect with your cause. You can add more
                  images from your dashboard after approval.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Logo URL</Label>
                <Input
                  value={form.logoUrl}
                  onChange={(e) => set("logoUrl", e.target.value)}
                  placeholder="https://yourorg.co.za/logo.png"
                  type="url"
                />
                <p className="text-xs text-slate-400">
                  Paste a public URL to your logo (square, min 200×200px).
                  Full image upload will be available in your dashboard.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Cover photo URL</Label>
                <Input
                  value={form.coverUrl}
                  onChange={(e) => set("coverUrl", e.target.value)}
                  placeholder="https://yourorg.co.za/cover.jpg"
                  type="url"
                />
                <p className="text-xs text-slate-400">
                  Landscape image shown at the top of your organisation page (min 1200×400px).
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Review & submit</h2>
                <p className="text-sm text-slate-500">
                  Check your details before submitting. Our team will review within 2–3 business days.
                </p>
              </div>

              <ReviewSection title="Organisation">
                <ReviewRow label="Name" value={form.name} />
                <ReviewRow label="Contact" value={`${form.contactEmail} · ${form.contactPhone}`} />
                <ReviewRow label="NPO Registered" value={form.npoStatus ? "Yes" : "No"} />
                <ReviewRow label="Registration No." value={form.registrationNumber || "—"} />
                <ReviewRow label="Accepts" value={[form.acceptsMoney && "Money", form.acceptsGoods && "Goods"].filter(Boolean).join(", ")} />
              </ReviewSection>

              <ReviewSection title="Causes">
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.causes.map((c) => (
                    <span key={c} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${causeColor(c)}`}>
                      {formatCause(c)}
                    </span>
                  ))}
                </div>
              </ReviewSection>

              <ReviewSection title="Address">
                <ReviewRow label="Street" value={[form.streetAddress, form.suburb].filter(Boolean).join(", ")} />
                <ReviewRow label="City" value={`${form.city}, ${formatProvince(form.province)} ${form.postalCode}`} />
              </ReviewSection>

              <ReviewSection title="Banking">
                <ReviewRow label="Bank" value={formatBank(form.bankName)} />
                <ReviewRow label="Account holder" value={form.accountHolderName} />
                <ReviewRow label="Account no." value={`••••${form.accountNumber.slice(-4)}`} />
                <ReviewRow label="Branch code" value={form.branchCode} />
              </ReviewSection>

              {serverError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {serverError}
                </div>
              )}

              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
                By submitting you confirm that all details are accurate and you are authorised to
                represent this organisation. Earmark will contact you within 2–3 business days.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={back}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>

            {step < 6 ? (
              <Button type="button" onClick={next}>
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-900 font-medium text-right">{value || "—"}</span>
    </div>
  )
}
