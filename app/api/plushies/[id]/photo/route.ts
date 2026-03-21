import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";
import { storage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const numId = Number(id);

  const [existing] = await db.select().from(plushies).where(eq(plushies.id, numId));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "No photo provided" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${numId}-${Date.now()}.${ext}`;

  if (existing.photoPath) await storage.delete(existing.photoPath);
  const savedPath = await storage.save(file, filename);

  await db
    .update(plushies)
    .set({ photoPath: savedPath, updatedAt: new Date().toISOString() })
    .where(eq(plushies.id, numId));

  return NextResponse.json({ photoUrl: storage.publicUrl(savedPath) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const numId = Number(id);

  const [existing] = await db.select().from(plushies).where(eq(plushies.id, numId));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.photoPath) await storage.delete(existing.photoPath);

  await db
    .update(plushies)
    .set({ photoPath: null, updatedAt: new Date().toISOString() })
    .where(eq(plushies.id, numId));

  return new NextResponse(null, { status: 204 });
}
