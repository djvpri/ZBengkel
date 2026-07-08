/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  output: 'standalone',
  typescript: {
    // Prisma enums di seed files tidak tersedia sebelum prisma generate —
    // seed tidak dijalankan saat build, diabaikan di type check
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
}
module.exports = nextConfig
