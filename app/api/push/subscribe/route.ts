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

  // Log just enough to confirm in the docker logs that a subscribe request actually arrived,
  // without leaking the full endpoint/keys.
  let endpointHost = "?";
  try {
    endpointHost = new URL(body.endpoint).host;
  } catch {
    // ignore – keep "?"
  }
  console.log(
    `[subscribe] received endpoint host=${endpointHost} p256dh.len=${body.keys.p256dh.length} auth.len=${body.keys.auth.length}`,
  );

  const now = new Date().toISOString();

  try {
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
  } catch (err) {
    console.error("[subscribe] db error", err);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }

  const total = (await db.select().from(pushSubscriptions)).length;
  console.log(`[subscribe] ok, total=${total}`);

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
