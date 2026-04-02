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
  if (!(file instanceof Blob)) return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Foto zu groß (max. 10 MB)" }, { status: 413 });

  if (existing.photoPath) {
    await storage.delete(existing.photoPath, existing.originalPhotoPath);
  }

  const base = `${numId}-${Date.now()}`;
  const { optimizedPath, originalPath } = await storage.save(file as File, base);

  await db
    .update(plushies)
    .set({ photoPath: optimizedPath, originalPhotoPath: originalPath, updatedAt: new Date().toISOString() })
    .where(eq(plushies.id, numId));

  return NextResponse.json({ photoUrl: storage.publicUrl(optimizedPath) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const numId = Number(id);

  const [existing] = await db.select().from(plushies).where(eq(plushies.id, numId));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.photoPath) {
    await storage.delete(existing.photoPath, existing.originalPhotoPath);
  }

  await db
    .update(plushies)
    .set({ photoPath: null, originalPhotoPath: null, updatedAt: new Date().toISOString() })
    .where(eq(plushies.id, numId));

  return new NextResponse(null, { status: 204 });
}
