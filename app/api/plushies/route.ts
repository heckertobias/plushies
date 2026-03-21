import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";

export async function GET() {
  const all = await db.select().from(plushies).orderBy(plushies.birthday);
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  const body = await request.json() as {
    name: string;
    birthday: string;
    origin?: string;
    notes?: string;
  };
  const now = new Date().toISOString();
  const [created] = await db
    .insert(plushies)
    .values({ ...body, createdAt: now, updatedAt: now })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
