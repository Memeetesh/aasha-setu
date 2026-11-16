import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No server code anywhere (no route handlers/server actions, no
  // next/image) — everything talks to the FastAPI backend client-side, so
  // this ships as plain static files (Cloudflare Pages, no adapter needed).
  output: "export",
};

export default nextConfig;
