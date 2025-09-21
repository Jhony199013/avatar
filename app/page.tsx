"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Перенаправляем на страницу аватаров
    router.push("/avatars")
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-muted-foreground text-lg">Перенаправление...</div>
      </div>
    </div>
  )
}
