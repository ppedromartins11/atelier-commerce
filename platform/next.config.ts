import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};
export default nextConfig;
