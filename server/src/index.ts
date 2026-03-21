import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { dirname } from "node:path";
import { plushiesRouter } from "./routes/plushies";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.use("/uploads/*", serveStatic({ root: dirname(UPLOADS_DIR) || "." }));

app.route("/api/plushies", plushiesRouter);

export default app;

const PORT = Number(process.env.PORT ?? 3001);

Bun.serve({
  port: PORT,
  fetch: app.fetch,
});

console.log(`Server running on http://localhost:${PORT}`);
