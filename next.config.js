/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is stable in Next.js 14, no longer experimental
  reactStrictMode: false, // Temporarily disable to fix LiveKit connection issues
}

module.exports = nextConfig