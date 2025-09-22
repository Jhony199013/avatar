import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Аватары | Avatars App',
  description: 'Управление аватарами для создания видео',
}

export default function AvatarsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
