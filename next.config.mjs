/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    // It's generally recommended to prefix public env vars with NEXT_PUBLIC_
    // For example: NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        port: '',
        pathname: '/**',
      },
      // You can add other hostnames here if needed
    ],
  },
  // App Router is enabled by default in Next.js 13+
  // No need for experimental flags
};

export default nextConfig;