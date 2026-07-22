import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  reactStrictMode: false, // Prevents double-rendering of heavy charts and animations in dev mode
  experimental: {
    optimizePackageImports: ["framer-motion", "recharts", "date-fns"],
  },
  turbopack: {
    root: typeof __dirname !== "undefined" ? path.resolve(__dirname) : path.resolve("."),
  },
};

export default nextConfig;
