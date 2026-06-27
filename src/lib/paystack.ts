/**
 * Paystack payment integration for South Africa.
 * Docs: https://paystack.com/docs/api
 */

const PAYSTACK_BASE = "https://api.paystack.co"

function paystackHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  }
}

export interface InitializePaymentParams {
  email: string
  amountCents: number
  reference: string
  metadata?: Record<string, unknown>
  callbackUrl?: string
}

export interface InitializePaymentResult {
  authorizationUrl: string
  accessCode: string
  reference: string
}

export async function initializePayment(
  params: InitializePaymentParams
): Promise<InitializePaymentResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      email: params.email,
      amount: params.amountCents,
      reference: params.reference,
      currency: "ZAR",
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Paystack initialize failed: ${body}`)
  }

  const data = await res.json()
  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    reference: data.data.reference,
  }
}

export interface VerifyPaymentResult {
  status: "success" | "failed" | "abandoned"
  amountCents: number
  reference: string
  channel: string
  paidAt: string
  metadata: Record<string, unknown>
}

export async function verifyPayment(
  reference: string
): Promise<VerifyPaymentResult> {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: paystackHeaders() }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Paystack verify failed: ${body}`)
  }

  const data = await res.json()
  const tx = data.data

  return {
    status: tx.status === "success" ? "success" : tx.status === "abandoned" ? "abandoned" : "failed",
    amountCents: tx.amount,
    reference: tx.reference,
    channel: tx.channel,
    paidAt: tx.paid_at,
    metadata: tx.metadata ?? {},
  }
}

export function validateWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const crypto = require("crypto")
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(payload)
    .digest("hex")
  return hash === signature
}

export function generatePaymentReference(prefix = "EMRK"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}
