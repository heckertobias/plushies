import type { NextConfig } from "next";

// Node.js built-in modules that web-push (and its deps) require at runtime.
// Webpack doesn't recognise these in a server bundle built for Next.js, so we mark
// them as externals so they are require()'d at runtime instead of bundled.
const NODE_BUILTINS = [
  "http", "https", "net", "tls", "crypto", "stream", "buffer",
  "util", "events", "url", "path", "fs", "os", "zlib", "dns",
  "querystring", "child_process", "assert", "string_decoder",
];
const builtinRe = new RegExp(`^(node:)?(${NODE_BUILTINS.join("|")})$`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function webpackConfig(config: any, { isServer }: { isServer: boolean }) {
  if (isServer && Array.isArray(config.externals)) {
    config.externals.push(
      (ctx: { request?: string }, callback: (err: null, result?: string) => void) => {
        if (ctx.request && builtinRe.test(ctx.request)) {
          callback(null, `commonjs ${ctx.request}`);
        } else {
          callback(null, undefined);
        }
      },
    );
  }
  return config;
}

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@libsql/**", "./node_modules/libsql/**"],
  },
  // web-push is a pure server-side package; don't bundle it
  serverExternalPackages: ["web-push"],
  webpack: webpackConfig,
};

export default nextConfig;
