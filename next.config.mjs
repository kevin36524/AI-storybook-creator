/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  images: {
    domains: ['storage.googleapis.com'],
  },
};

export default nextConfig;