/**
 * Courier service integration layer.
 * Abstracts The Courier Guy, Dawn Wing, Aramex SA, etc.
 * Currently mocked — replace each method body with real API calls.
 */

export interface CourierQuote {
  provider: string
  providerLabel: string
  serviceType: string
  estimatedDays: number
  costCents: number
  currency: string
}

export interface SchedulePickupParams {
  provider: string
  pickupAddress: {
    name: string
    phone: string
    email?: string
    street: string
    suburb?: string
    city: string
    province: string
    postalCode: string
  }
  deliveryAddress: {
    name: string
    phone: string
    email?: string
    street: string
    suburb?: string
    city: string
    province: string
    postalCode: string
  }
  scheduledDate: Date
  timeSlot: string
  weightKg: number
  instructions?: string
  reference: string
}

export interface PickupResult {
  waybillNumber: string
  trackingUrl: string
  estimatedPickupAt: Date
  estimatedDeliveryAt: Date
  costCents: number
}

export async function getCourierQuotes(params: {
  fromPostalCode: string
  toPostalCode: string
  weightKg: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
}): Promise<CourierQuote[]> {
  // TODO: call actual courier APIs
  const baseCost = Math.max(7500, params.weightKg * 1200) // ZAR cents

  return [
    {
      provider: "the_courier_guy",
      providerLabel: "The Courier Guy",
      serviceType: "Economy",
      estimatedDays: 3,
      costCents: Math.round(baseCost * 0.9),
      currency: "ZAR",
    },
    {
      provider: "dawn_wing",
      providerLabel: "Dawn Wing",
      serviceType: "Standard",
      estimatedDays: 2,
      costCents: baseCost,
      currency: "ZAR",
    },
    {
      provider: "aramex",
      providerLabel: "Aramex SA",
      serviceType: "Express",
      estimatedDays: 1,
      costCents: Math.round(baseCost * 1.4),
      currency: "ZAR",
    },
  ]
}

export async function schedulePickup(
  params: SchedulePickupParams
): Promise<PickupResult> {
  // TODO: integrate with selected courier API
  const waybill = `EA${Date.now().toString().slice(-8)}`
  const pickupDate = new Date(params.scheduledDate)
  const deliveryDate = new Date(pickupDate)
  deliveryDate.setDate(deliveryDate.getDate() + 3)

  return {
    waybillNumber: waybill,
    trackingUrl: `https://track.thecourierguy.co.za/?waybill=${waybill}`,
    estimatedPickupAt: pickupDate,
    estimatedDeliveryAt: deliveryDate,
    costCents: 9500,
  }
}

export async function getTrackingStatus(waybillNumber: string): Promise<{
  status: string
  lastUpdate: string
  location?: string
  events: Array<{ timestamp: Date; description: string; location?: string }>
}> {
  // TODO: call courier tracking API
  return {
    status: "in_transit",
    lastUpdate: new Date().toISOString(),
    location: "Johannesburg Hub",
    events: [
      {
        timestamp: new Date(),
        description: "Package collected from sender",
        location: "Sandton, Gauteng",
      },
    ],
  }
}

export async function cancelPickup(waybillNumber: string): Promise<boolean> {
  // TODO: call courier cancel endpoint
  return true
}

export function courierProviderLabel(provider: string): string {
  const map: Record<string, string> = {
    the_courier_guy: "The Courier Guy",
    dawn_wing: "Dawn Wing",
    aramex: "Aramex SA",
    dhl: "DHL",
    fastway: "Fastway Couriers",
    ram: "RAM Hand-to-Hand Couriers",
    internal: "Earmark Logistics",
  }
  return map[provider] ?? provider
}
