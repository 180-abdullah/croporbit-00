import type { NextConfig } from "next";

// Static export: every page is prebuilt from committed JSON, so the demo works offline and hosts free anywhere.
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: base,
  assetPrefix: base || undefined,
};
export default nextConfig;
