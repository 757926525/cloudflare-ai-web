import type { NextConfig } from "next";

const isPagesBuild = process.env.PAGES_BUILD === "true" || process.env.CF_PAGES === "1";

const nextConfig: NextConfig = {
  ...(isPagesBuild
    ? {
        output: "export",
        images: { unoptimized: true },
      }
    : {
        output: "standalone",
      }),
  reactCompiler: true,
};

export default nextConfig;
