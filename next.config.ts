import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper handling of server components
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  // Corpus JSON is large - ensure it's served properly
  async headers() {
    return [
      {
        source: '/corpus.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ]
  },
}

export default nextConfig;
