import { NextResponse } from "next/server";
import ical, { ICalEventRepeatingFreq } from "ical-generator";
import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!process.env.ICAL_TOKEN || token !== process.env.ICAL_TOKEN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const all = await db.select().from(plushies);

  const cal = ical({ name: "Plüschie-Geburtstage" });

  for (const p of all) {
    const [year, month, day] = p.birthday.split("-").map(Number);
    cal.createEvent({
      id: `plushie-${p.id}@plushie-kalender`,
      summary: `🎂 ${p.name}`,
      description: p.origin ? `Herkunft: ${p.origin}` : undefined,
      allDay: true,
      start: new Date(year!, month! - 1, day!),
      repeating: { freq: ICalEventRepeatingFreq.YEARLY },
    });
  }

  return new NextResponse(cal.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plushies.ics"',
      "Cache-Control": "no-cache, no-store",
    },
  });
}
