import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/coindrop",
  images: { unoptimized: true },
};

export default nextConfig;
