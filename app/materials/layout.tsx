import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Материал | Avatars App',
  description: 'Создание и управление видео материалами',
}

export default function MaterialsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
