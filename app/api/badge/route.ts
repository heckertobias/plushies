import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";
import { countTodaysBirthdays } from "@/lib/groupPlushies";
import dayjs from "dayjs";

export async function GET() {
  const all = await db.select().from(plushies);
  const count = countTodaysBirthdays(all, dayjs());
  return NextResponse.json({ count });
}
