import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";
import { storage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const [plushie] = await db.select().from(plushies).where(eq(plushies.id, Number(id)));
  if (!plushie) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plushie);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  let body: { name?: string; birthday?: string; origin?: string; notes?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const { tags, ...rest } = body;
  const [updated] = await db
    .update(plushies)
    .set({ ...rest, tags: tags !== undefined ? JSON.stringify(tags) : undefined, updatedAt: new Date().toISOString() })
    .where(eq(plushies.id, Number(id)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const [deleted] = await db
    .delete(plushies)
    .where(eq(plushies.id, Number(id)))
    .returning();
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (deleted.photoPath) await storage.delete(deleted.photoPath);
  return new NextResponse(null, { status: 204 });
}
