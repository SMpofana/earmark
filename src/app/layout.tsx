import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/layout/nav"
import { Footer } from "@/components/layout/footer"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "Earmark — Connect & Contribute in South Africa",
    template: "%s | Earmark",
  },
  description:
    "Earmark connects generous South Africans with verified non-profit organisations. Donate money, clothes, food, toys and blankets — we handle the courier.",
  keywords: ["NPO", "donate", "South Africa", "charity", "non-profit", "contribute"],
  openGraph: {
    siteName: "Earmark",
    locale: "en_ZA",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-ZA" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
