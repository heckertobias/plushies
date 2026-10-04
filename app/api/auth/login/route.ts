import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!process.env.AUTH_PASSWORD || body.password !== process.env.AUTH_PASSWORD) {
    // Same response time whether password is wrong or env var is missing
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
