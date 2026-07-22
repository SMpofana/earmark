import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = [
  "/",
  "/organisations",
  "/login",
  "/register",
  "/api/auth",
  "/api/webhooks",
  "/api/analytics/events",
]

// better-auth default cookie: <prefix>.session_token
const SESSION_COOKIE = "better-auth.session_token"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isPublic =
    PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    ) || pathname.startsWith("/organisations/")

  if (isPublic) return NextResponse.next()

  // Lightweight cookie-only check — avoids importing better-auth/drizzle/postgres
  // (which use Node APIs not available in the Edge Runtime).
  // Authoritative session + role checks still happen in each route handler /
  // server component via auth.api.getSession().
  const hasSession = request.cookies.get(SESSION_COOKIE)

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin role check is enforced inside /admin page and /api/admin routes
  // via auth.api.getSession() — not here, to keep middleware Edge-safe.
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}