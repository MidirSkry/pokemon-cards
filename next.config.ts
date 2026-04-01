import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/prices": ["./data/**/*"],
    "/api/search": ["./data/**/*"],
  },
};

export default nextConfig;
