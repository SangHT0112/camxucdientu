import type { NextConfig } from "next";
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',  // Hoặc specific domains như 'unsplash.com'
      },
    ],
  },
};

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
