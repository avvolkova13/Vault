import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages serves the static export from the repository sub-path.
  // Keep local development on the root path and enable the prefix only in CI.
  output: "export",
  trailingSlash: true,
  basePath: process.env.GITHUB_ACTIONS === "true" ? "/Vault" : "",
  assetPrefix: process.env.GITHUB_ACTIONS === "true" ? "/Vault/" : undefined,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
