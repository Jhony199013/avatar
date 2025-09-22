import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Голоса | Avatars App',
  description: 'Управление голосами для озвучивания видео',
}

export default function VoicesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
