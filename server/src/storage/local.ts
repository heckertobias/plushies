import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { StorageAdapter } from "./index";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";

export const localStorageAdapter: StorageAdapter = {
  async save(file: File, filename: string): Promise<string> {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const dest = join(UPLOADS_DIR, filename);
    await Bun.write(dest, file);
    return dest;
  },

  async delete(path: string): Promise<void> {
    await unlink(path).catch(() => {});
  },

  publicUrl(path: string): string {
    const filename = path.split("/").pop();
    return `/uploads/${filename}`;
  },
};
