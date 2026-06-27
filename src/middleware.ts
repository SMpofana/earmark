import { NextRequest, NextResponse } from "next/server"
import { auth } from "./lib/auth"

const PUBLIC_PATHS = [
  "/",
  "/organisations",
  "/login",
  "/register",
  "/api/auth",
  "/api/webhooks",
  "/api/analytics/events",
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isPublic =
    PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    ) || pathname.startsWith("/organisations/")

  if (isPublic) return NextResponse.next()

  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && session.user.role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
