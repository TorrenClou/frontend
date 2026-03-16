/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  async rewrites() {
    // Proxy /proxy/* → backend, resolved server-side using BACKEND_URL (runtime env var)
    // This allows the browser to use relative URLs (/proxy/api/...) that work on ANY server IP
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:47200'
    return [
      {
        source: '/proxy/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig

