/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Увеличиваем лимит размера тела запроса до 100МБ
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
  // Для App Router используем другую конфигурацию
  serverRuntimeConfig: {
    maxRequestSize: '100mb',
  },
}

export default nextConfig
