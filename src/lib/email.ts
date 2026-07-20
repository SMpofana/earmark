import { Resend } from "resend"

const FROM = process.env.EMAIL_FROM || "Earmark <noreply@earmark.co.za>"

let resendClient: Resend | null = null
function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

async function send(params: {
  to: string
  subject: string
  html: string
}) {
  const client = getClient()
  if (!client) {
    console.log(`[email] Would send to ${params.to}: ${params.subject}`)
    return
  }
  await client.emails.send({ from: FROM, ...params })
}

export async function sendOrgApprovedEmail(to: string, orgName: string) {
  await send({
    to,
    subject: `${orgName} has been approved on Earmark!`,
    html: `
      <h1>Great news! 🎉</h1>
      <p>Your organisation <strong>${orgName}</strong> has been verified and is now live on Earmark.</p>
      <p>Donors and contributors across South Africa can now find and support your cause.</p>
      <p><a href="${process.env.NEXT_PUBLIC_URL}/dashboard">View your dashboard</a></p>
    `,
  })
}

export async function sendOrgRejectedEmail(
  to: string,
  orgName: string,
  reason: string
) {
  await send({
    to,
    subject: `Update on your Earmark application for ${orgName}`,
    html: `
      <h1>Application Update</h1>
      <p>Thank you for applying to join Earmark. After reviewing your application for <strong>${orgName}</strong>, we were unable to approve it at this time.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>You are welcome to reapply after addressing the issue above.</p>
    `,
  })
}

export async function sendPickupConfirmationEmail(
  to: string,
  params: {
    contributorName: string
    orgName: string
    pickupDate: string
    timeSlot: string
    verificationCode: string
    waybillNumber: string
  }
) {
  await send({
    to,
    subject: `Pickup confirmed — code ${params.verificationCode}`,
    html: `
      <h1>Your pickup is confirmed!</h1>
      <p>Hi ${params.contributorName},</p>
      <p>Your goods for <strong>${params.orgName}</strong> are scheduled for collection:</p>
      <ul>
        <li><strong>Date:</strong> ${params.pickupDate}</li>
        <li><strong>Time:</strong> ${params.timeSlot}</li>
        <li><strong>Waybill:</strong> ${params.waybillNumber}</li>
      </ul>
      <p>When the driver arrives, give them this verification code:</p>
      <h2 style="letter-spacing: 8px; font-size: 36px; text-align: center; color: #f97316;">${params.verificationCode}</h2>
      <p>Do not share this code until the driver is at your door.</p>
    `,
  })
}

export async function sendDeliveryConfirmationEmail(
  to: string,
  params: {
    orgName: string
    contributorName: string
    itemSummary: string
  }
) {
  await send({
    to,
    subject: `Goods delivered to ${params.orgName}`,
    html: `
      <h1>Delivery confirmed! 🙌</h1>
      <p>The following goods from <strong>${params.contributorName}</strong> have been delivered to your organisation:</p>
      <p>${params.itemSummary}</p>
      <p>Thank you for making South Africa a better place.</p>
      <p><a href="${process.env.NEXT_PUBLIC_URL}/dashboard">View your dashboard</a></p>
    `,
  })
}

export async function sendDonationReceiptEmail(
  to: string,
  params: {
    contributorName: string
    orgName: string
    amountZar: number
    reference: string
    date: string
  }
) {
  await send({
    to,
    subject: `Donation receipt — R${params.amountZar} to ${params.orgName}`,
    html: `
      <h1>Thank you for your donation!</h1>
      <p>Hi ${params.contributorName},</p>
      <p>Your donation of <strong>R${params.amountZar}</strong> to <strong>${params.orgName}</strong> has been received.</p>
      <ul>
        <li><strong>Reference:</strong> ${params.reference}</li>
        <li><strong>Date:</strong> ${params.date}</li>
      </ul>
      <p>Your generosity makes a difference. Thank you.</p>
    `,
  })
}
