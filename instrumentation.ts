export async function register() {
  // Next.js calls register() in every runtime; the Node.js-only work (DB migrations, console
  // timestamps, badge scheduler) lives in instrumentation-node.ts and is only imported here.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}
