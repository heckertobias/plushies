import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join, extname, resolve } from "node:path";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(/* turbopackIgnore: true */ process.cwd(), "uploads");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  // Only allow a single filename segment — no subdirectories or traversal
  const filename = path.length === 1 ? path[0] : undefined;
  if (!filename || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const filepath = resolve(UPLOADS_DIR, filename);
  // Guard against path traversal (e.g. ../../etc/passwd)
  // turbopackIgnore: UPLOADS_DIR is a runtime path outside the project; without the hint Turbopack
  // can't scope this filesystem access and traces the whole project into the standalone output.
  if (
    !filepath.startsWith(resolve(/* turbopackIgnore: true */ UPLOADS_DIR) + "/") &&
    filepath !== resolve(/* turbopackIgnore: true */ UPLOADS_DIR)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(/* turbopackIgnore: true */ filepath);
    const contentType = MIME[extname(filename).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(buffer, { headers: { "Content-Type": contentType } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
