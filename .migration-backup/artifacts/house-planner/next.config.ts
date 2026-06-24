import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  webpack: (config) => {
    config.externals = config.externals || [];
    return config;
  },
};

export default nextConfig;
