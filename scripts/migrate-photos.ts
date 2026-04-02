/**
 * One-time migration: convert existing photos to WebP + keep original.
 *
 * For each plushie where photoPath is set but originalPhotoPath is NULL:
 *   1. Treat the existing file as the original → set originalPhotoPath
 *   2. Create an optimized WebP next to it → update photoPath
 *
 * Run with: npx tsx scripts/migrate-photos.ts
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { isNotNull, eq } from "drizzle-orm";
import { join, parse } from "node:path";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";
import * as schema from "../lib/schema";
import { plushies } from "../lib/schema";

const DB_URL = process.env.DATABASE_URL ?? `file:${join(process.cwd(), "plushies.db")}`;

const client = createClient({ url: DB_URL });
const db = drizzle(client, { schema });

async function main() {
  const rows = await db.select().from(plushies).where(isNotNull(plushies.photoPath));
  const pending = rows.filter((p) => p.photoPath && !p.originalPhotoPath);

  if (pending.length === 0) {
    console.log("Nichts zu migrieren.");
    return;
  }

  console.log(`${pending.length} Foto(s) werden migriert…\n`);

  let ok = 0;
  let fail = 0;

  for (const p of pending) {
    const originalPath = p.photoPath!;
    const { dir, name } = parse(originalPath);

    // Already a WebP — just set originalPhotoPath
    if (originalPath.endsWith(".webp")) {
      await db.update(plushies).set({ originalPhotoPath: originalPath }).where(eq(plushies.id, p.id));
      console.log(`  [SKIP] ${p.name} — bereits WebP, originalPhotoPath gesetzt`);
      ok++;
      continue;
    }

    try {
      const webpPath = join(dir, `${name}.webp`);
      const buffer = await readFile(originalPath);

      await sharp(buffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(webpPath);

      await db
        .update(plushies)
        .set({ photoPath: webpPath, originalPhotoPath: originalPath })
        .where(eq(plushies.id, p.id));

      const { size } = await stat(webpPath);
      console.log(`  ✓ ${p.name}: ${(buffer.length / 1024).toFixed(0)} KB → ${(size / 1024).toFixed(0)} KB WebP`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${p.name} (ID ${p.id}):`, err);
      fail++;
    }
  }

  console.log(`\nFertig: ${ok} migriert, ${fail} fehlgeschlagen.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
