import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { plushies } from "../db/schema";
import { localStorageAdapter as storage } from "../storage/local";

export const plushiesRouter = new Hono();

// GET /api/plushies
plushiesRouter.get("/", async (c) => {
  const all = await db.select().from(plushies).orderBy(plushies.birthday);
  return c.json(all);
});

// GET /api/plushies/:id
plushiesRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [plushie] = await db.select().from(plushies).where(eq(plushies.id, id));
  if (!plushie) return c.json({ error: "Not found" }, 404);
  return c.json(plushie);
});

// POST /api/plushies
plushiesRouter.post("/", async (c) => {
  const body = await c.req.json<{
    name: string;
    birthday: string;
    origin?: string;
    notes?: string;
  }>();
  const now = new Date().toISOString();
  const [created] = await db
    .insert(plushies)
    .values({ ...body, createdAt: now, updatedAt: now })
    .returning();
  return c.json(created, 201);
});

// PUT /api/plushies/:id
plushiesRouter.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{
    name?: string;
    birthday?: string;
    origin?: string;
    notes?: string;
  }>();
  const [updated] = await db
    .update(plushies)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(plushies.id, id))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/plushies/:id
plushiesRouter.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [deleted] = await db
    .delete(plushies)
    .where(eq(plushies.id, id))
    .returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  if (deleted.photoPath) await storage.delete(deleted.photoPath);
  return c.body(null, 204);
});

// POST /api/plushies/:id/photo
plushiesRouter.post("/:id/photo", async (c) => {
  const id = Number(c.req.param("id"));
  const [existing] = await db.select().from(plushies).where(eq(plushies.id, id));
  if (!existing) return c.json({ error: "Not found" }, 404);

  const formData = await c.req.formData();
  const file = formData.get("photo");
  if (!(file instanceof File)) return c.json({ error: "No photo provided" }, 400);

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${id}-${Date.now()}.${ext}`;

  if (existing.photoPath) await storage.delete(existing.photoPath);
  const savedPath = await storage.save(file, filename);

  const [updated] = await db
    .update(plushies)
    .set({ photoPath: savedPath, updatedAt: new Date().toISOString() })
    .where(eq(plushies.id, id))
    .returning();

  return c.json({ photoUrl: storage.publicUrl(updated.photoPath!) });
});
