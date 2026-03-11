/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["hyparquet"],
  eslint: {
    // Use the existing eslint config as-is; skip during builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
