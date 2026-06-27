import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { nanoid } from "nanoid"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(prefix?: string): string {
  const id = nanoid()
  return prefix ? `${prefix}_${id}` : id
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function formatCurrency(
  cents: number,
  currency = "ZAR",
  locale = "en-ZA"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatProvince(province: string): string {
  const map: Record<string, string> = {
    gauteng: "Gauteng",
    western_cape: "Western Cape",
    kwazulu_natal: "KwaZulu-Natal",
    eastern_cape: "Eastern Cape",
    limpopo: "Limpopo",
    mpumalanga: "Mpumalanga",
    north_west: "North West",
    free_state: "Free State",
    northern_cape: "Northern Cape",
  }
  return map[province] ?? province
}

export function formatCause(cause: string): string {
  const map: Record<string, string> = {
    food_security: "Food Security",
    education: "Education",
    healthcare: "Healthcare",
    shelter: "Shelter",
    clothing: "Clothing",
    children: "Children",
    elderly: "Elderly",
    disability: "Disability",
    animal_welfare: "Animal Welfare",
    environment: "Environment",
    arts_culture: "Arts & Culture",
    disaster_relief: "Disaster Relief",
    youth_development: "Youth Development",
    gender_based_violence: "GBV Support",
    community_development: "Community Development",
    other: "Other",
  }
  return map[cause] ?? cause
}

export function formatTimeSlot(slot: string): string {
  const map: Record<string, string> = {
    morning_8_12: "Morning (08:00–12:00)",
    afternoon_12_17: "Afternoon (12:00–17:00)",
    evening_17_20: "Evening (17:00–20:00)",
  }
  return map[slot] ?? slot
}

export function formatBank(bank: string): string {
  const map: Record<string, string> = {
    absa: "ABSA",
    standard_bank: "Standard Bank",
    fnb: "FNB",
    nedbank: "Nedbank",
    capitec: "Capitec",
    discovery_bank: "Discovery Bank",
    investec: "Investec",
    african_bank: "African Bank",
    grindrod: "Grindrod Bank",
    sasfin: "Sasfin",
    bidvest: "Bidvest Bank",
    tyme_bank: "TymeBank",
    other: "Other",
  }
  return map[bank] ?? bank
}

export function causeColor(cause: string): string {
  const colors: Record<string, string> = {
    food_security: "bg-yellow-100 text-yellow-800",
    education: "bg-blue-100 text-blue-800",
    healthcare: "bg-red-100 text-red-800",
    shelter: "bg-stone-100 text-stone-800",
    clothing: "bg-purple-100 text-purple-800",
    children: "bg-pink-100 text-pink-800",
    elderly: "bg-indigo-100 text-indigo-800",
    disability: "bg-teal-100 text-teal-800",
    animal_welfare: "bg-green-100 text-green-800",
    environment: "bg-emerald-100 text-emerald-800",
    arts_culture: "bg-violet-100 text-violet-800",
    disaster_relief: "bg-orange-100 text-orange-800",
    youth_development: "bg-cyan-100 text-cyan-800",
    gender_based_violence: "bg-rose-100 text-rose-800",
    community_development: "bg-amber-100 text-amber-800",
    other: "bg-slate-100 text-slate-800",
  }
  return colors[cause] ?? "bg-slate-100 text-slate-800"
}

export function orgStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    pending: "Pending Review",
    under_review: "Under Review",
    active: "Active",
    suspended: "Suspended",
    rejected: "Rejected",
  }
  return map[status] ?? status
}

export function orgStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    pending: "bg-yellow-100 text-yellow-800",
    under_review: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    suspended: "bg-orange-100 text-orange-800",
    rejected: "bg-red-100 text-red-800",
  }
  return map[status] ?? "bg-slate-100 text-slate-700"
}

export function contributionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    pending: "Pending",
    confirmed: "Confirmed",
    scheduled: "Pickup Scheduled",
    collected: "Collected",
    in_transit: "In Transit",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    failed: "Failed",
  }
  return map[status] ?? status
}
