import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  devIndicators: false,
  // Container builds use the minimal server; local builds keep `next start`.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
};
export default nextConfig;
