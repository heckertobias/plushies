import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  let body: { endpoint: string; keys: { p256dh: string; auth: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "endpoint, p256dh und auth sind Pflichtfelder" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Upsert: update keys if endpoint already exists
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, body.endpoint))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ p256dh: body.keys.p256dh, auth: body.keys.auth })
      .where(eq(pushSubscriptions.endpoint, body.endpoint));
  } else {
    await db.insert(pushSubscriptions).values({
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      createdAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  let body: { endpoint: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: "endpoint fehlt" }, { status: 400 });
  }

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, body.endpoint));
  return NextResponse.json({ ok: true });
}
