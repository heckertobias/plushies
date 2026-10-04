import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import sharp from "sharp";
import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";
import { widgetData } from "@/lib/widget";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(/* turbopackIgnore: true */ process.cwd(), "uploads");

/** Edge length of the photo sent along; a small widget is ~170 pt, i.e. ~510 px at 3x. */
const PHOTO_SIZE = 512;

/**
 * JSON feed for the Scriptable home-screen widget (scripts/scriptable-widget.js). Protected by
 * the same ICAL_TOKEN as the calendar feed, since it exposes the same read-only data. The photo
 * of the first plushie with a birthday today is inlined, so the widget needs a single request.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!process.env.ICAL_TOKEN || token !== process.env.ICAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await db.select().from(plushies);
  const data = widgetData(all);

  let photo: string | null = null;
  const firstWithPhoto = data.today.find((t) => t.hasPhoto);
  const withPhoto = firstWithPhoto && all.find((p) => p.id === firstWithPhoto.id);
  if (withPhoto?.photoPath) {
    try {
      // basename: photoPath may be stored as an absolute path; only the file name is trusted.
      const file = await readFile(/* turbopackIgnore: true */ join(UPLOADS_DIR, basename(withPhoto.photoPath)));
      const jpeg = await sharp(file)
        .resize(PHOTO_SIZE, PHOTO_SIZE, { fit: "cover" })
        .jpeg({ quality: 75 })
        .toBuffer();
      photo = jpeg.toString("base64");
    } catch {
      // A missing or broken photo only costs the widget its background.
    }
  }

  return NextResponse.json(
    { ...data, photo },
    { headers: { "Cache-Control": "no-cache, no-store" } },
  );
}
