/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@punk-records/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
