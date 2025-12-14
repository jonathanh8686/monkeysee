/** @type {import('next').NextConfig} */

const INTERNAL_API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL || 'http://localhost:8000';
  console.log('[next.config] INTERNAL_API_BASE_URL =', INTERNAL_API_BASE_URL);


const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${INTERNAL_API_BASE_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
