import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ホーム直下の無関係な lockfile をワークスペースルートに誤検出する警告を防ぐ。
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
