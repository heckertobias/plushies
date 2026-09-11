import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Skew protection: a per-build id (git SHA, injected at build time via the Dockerfile) is
  // appended to asset/RSC requests. On a version mismatch Next.js hard-reloads a stale client on
  // its next router.refresh() instead of firing requests the new deployment can't serve (e.g. the
  // "Failed to find Server Action" errors from old cached clients). Undefined locally → no-op.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@libsql/**", "./node_modules/libsql/**"],
  },
  // web-push is a pure server-side package; don't bundle it. Externalizing it also keeps its
  // Node.js built-in imports out of the server bundle.
  serverExternalPackages: ["web-push"],
};

export default nextConfig;
