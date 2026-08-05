/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.externals.push('@valkey/valkey-glide');
    return config;
  },
};

export default nextConfig;

