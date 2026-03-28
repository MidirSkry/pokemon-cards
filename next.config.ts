import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/prices": ["./data/**/*"],
  },
};

export default nextConfig;
