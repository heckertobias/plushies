import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads");

const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 80;

export const storage = {
  async save(file: File, base: string): Promise<{ optimizedPath: string; originalPath: string }> {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const originalName = file instanceof File ? file.name : "";
    const ext = originalName.includes(".") ? (originalName.split(".").pop() ?? "jpg") : "jpg";

    const originalFilename = `${base}-original.${ext}`;
    const optimizedFilename = `${base}.webp`;

    const originalPath = join(UPLOADS_DIR, originalFilename);
    const optimizedPath = join(UPLOADS_DIR, optimizedFilename);

    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(originalPath, buffer);

    await sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(optimizedPath);

    return { optimizedPath, originalPath };
  },

  async delete(optimizedPath: string, originalPath?: string | null): Promise<void> {
    await unlink(optimizedPath).catch(() => {});
    if (originalPath) await unlink(originalPath).catch(() => {});
  },

  publicUrl(path: string): string {
    const filename = path.split("/").pop();
    return `/api/uploads/${filename}`;
  },
};
