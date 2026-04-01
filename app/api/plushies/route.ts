import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";

export async function GET() {
  const all = await db.select().from(plushies).orderBy(plushies.birthday);
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  let body: { name: string; birthday: string; origin?: string; notes?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  if (!body.name?.trim() || !body.birthday) {
    return NextResponse.json({ error: "Name und Geburtstag sind Pflichtfelder" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const { tags, ...rest } = body;
  const [created] = await db
    .insert(plushies)
    .values({ ...rest, tags: tags ? JSON.stringify(tags) : null, createdAt: now, updatedAt: now })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
