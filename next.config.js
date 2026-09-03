/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  // The /proxy/* rewrite that used to live here is now a route handler at
  // app/proxy/[...path]/route.ts. With output: 'standalone', Next serialises
  // resolved rewrite destinations into .next/required-server-files.json at
  // build time, so BACKEND_URL was baked into the image and could not be
  // changed at runtime. The route handler reads it per request instead.
}

module.exports = nextConfig
