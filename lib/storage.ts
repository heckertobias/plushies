import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads");

export const storage = {
  async save(file: File, filename: string): Promise<string> {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const dest = join(UPLOADS_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(dest, buffer);
    return dest;
  },

  async delete(path: string): Promise<void> {
    await unlink(path).catch(() => {});
  },

  publicUrl(path: string): string {
    const filename = path.split("/").pop();
    return `/api/uploads/${filename}`;
  },
};
