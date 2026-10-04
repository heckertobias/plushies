import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, sessionCookieOptions, COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/", "/api/ical", "/sw.js"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token || !(await verifySessionToken(token))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Sliding expiry: re-issue the cookie so it never runs out while the app is in use.
  const response = NextResponse.next();
  response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
  return response;
}

// PWA assets stay public: the icon routes (app/icon.tsx, app/apple-icon.tsx) and the manifest are
// requested by the browser on /login and while installing, i.e. before a session exists. They are
// generated routes without a file extension, so the old icon.png / apple-icon.png entries never
// matched them. The $ anchors keep /iconography-style paths behind the session check.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon$|apple-icon$|manifest.webmanifest$).*)",
  ],
};
