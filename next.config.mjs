/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Use the existing eslint config as-is; skip during builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
