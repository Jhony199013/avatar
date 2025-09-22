"use client"

import { useState, useEffect } from "react"
import { User } from "lucide-react"
import { AvatarUploadModal } from "@/components/avatar-upload-modal"
import { AvatarCard } from "@/components/avatar-card"
import { supabase, type PhotoAvatar } from "@/lib/supabase"
import Link from "next/link"

function AvatarsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [avatars, setAvatars] = useState<PhotoAvatar[]>([])
  const [loading, setLoading] = useState(true)
  const [tempAvatars, setTempAvatars] = useState<
    Array<{ name: string; photo: string; status: string; tempId: string }>
  >([])

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const { data, error } = await supabase
          .from("photo_avatars")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("[v0] Ошибка загрузки аватаров:", error)
          return
        }

        setAvatars(data || [])
      } catch (error) {
        console.error("[v0] Ошибка при получении аватаров:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvatars()
  }, [])

  const handleAvatarUploaded = (tempAvatar: { name: string; photo: string; status: string }) => {
    setIsModalOpen(false)

    const tempAvatarWithId = {
      ...tempAvatar,
      tempId: Date.now().toString(),
    }

    setTempAvatars((prev) => [tempAvatarWithId, ...prev])

    const checkForNewAvatar = async () => {
      try {
        const { data, error } = await supabase
          .from("photo_avatars")
          .select("*")
          .eq("name", tempAvatar.name)
          .order("created_at", { ascending: false })
          .single()

        if (!error && data) {
          console.log("[v0] Найден новый аватар в базе:", data)
          setTempAvatars((prev) => prev.filter((temp) => temp.tempId !== tempAvatarWithId.tempId))

          const { data: allAvatars } = await supabase
            .from("photo_avatars")
            .select("*")
            .order("created_at", { ascending: false })

          if (allAvatars) {
            setAvatars(allAvatars)
          }
        } else {
          console.log("[v0] Аватар еще не готов, продолжаем проверку...")
          setTimeout(checkForNewAvatar, 2000)
        }
      } catch (error) {
        console.error("[v0] Ошибка polling:", error)
        setTimeout(checkForNewAvatar, 2000)
      }
    }

    setTimeout(checkForNewAvatar, 2000)
  }

  const handleDeleteAvatar = async (avatarId: number) => {
    try {
      const { error } = await supabase
        .from("photo_avatars")
        .delete()
        .eq("id", avatarId)

      if (error) {
        console.error("[v0] Ошибка при удалении аватара:", error)
        throw error
      }

      // Обновляем список аватаров
      setAvatars(prev => prev.filter(avatar => avatar.id !== avatarId))
      console.log("[v0] Аватар успешно удален")
    } catch (error) {
      console.error("[v0] Ошибка при удалении аватара:", error)
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Навигация */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-8">
            <Link
              href="/avatars"
              className="text-3xl font-bold text-foreground"
            >
              Аватары
            </Link>
            <Link
              href="/voices"
              className="text-3xl font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Голоса
            </Link>
            <Link
              href="/materials"
              className="text-3xl font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Материал
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <User className="w-4 h-4" />
              Добавить аватар
            </button>
          </div>
        </div>

        {/* Контент аватаров */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-muted-foreground text-lg">Загрузка аватаров...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tempAvatars.map((tempAvatar) => (
              <div key={tempAvatar.tempId} className="relative">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                    <div className="text-sm text-gray-600 font-medium">Генерация аватара</div>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <div className="font-medium text-sm">{tempAvatar.name}</div>
                  <div className="text-xs text-muted-foreground">Обработка...</div>
                </div>
              </div>
            ))}

            {avatars.map((avatar) => (
              <AvatarCard key={avatar.id} avatar={avatar} onDelete={handleDeleteAvatar} />
            ))}

            {avatars.length === 0 && tempAvatars.length === 0 && (
              <div className="col-span-full flex items-center justify-center py-32">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-400"></div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    После выбора аватара он отобразится тут
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Здесь будут показаны все ваши созданные аватары. Выберите подходящий для создания контента.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <AvatarUploadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAvatarUploaded={handleAvatarUploaded}
        />
      </div>
    </div>
  )
}

export default AvatarsPage

