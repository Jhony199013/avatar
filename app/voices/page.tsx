"use client"

import { useState, useEffect } from "react"
import { Mic } from "lucide-react"
import { VoiceUploadModal } from "@/components/voice-upload-modal"
import { VoiceCard } from "@/components/voice-card"
import { supabase, type Voice } from "@/lib/supabase"
import Link from "next/link"

export default function VoicesPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [voices, setVoices] = useState<Voice[]>([])
  const [voicesLoading, setVoicesLoading] = useState(true)
  const [tempVoices, setTempVoices] = useState<Array<{ name: string; status: string; tempId: string }>>([])

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const { data, error } = await supabase.from("voices").select("*").order("created_at", { ascending: false })

        if (error) {
          console.error("[v0] Ошибка загрузки голосов:", error)
          return
        }

        console.log("[v0] Загружены голоса из базы:", data)
        setVoices(data || [])
      } catch (error) {
        console.error("[v0] Ошибка при получении голосов:", error)
      } finally {
        setVoicesLoading(false)
      }
    }

    fetchVoices()
  }, [])

  const handleVoiceUploaded = (tempVoice: { name: string; status: string }) => {
    setIsVoiceModalOpen(false)

    const tempVoiceWithId = {
      ...tempVoice,
      tempId: Date.now().toString(),
    }

    setTempVoices((prev) => [tempVoiceWithId, ...prev])

    const checkForNewVoice = async () => {
      try {
        const { data, error } = await supabase
          .from("voices")
          .select("*")
          .eq("name", tempVoice.name)
          .order("created_at", { ascending: false })
          .single()

        if (!error && data) {
          console.log("[v0] Найден новый голос в базе:", data)
          setTempVoices((prev) => prev.filter((temp) => temp.tempId !== tempVoiceWithId.tempId))

          const { data: allVoices } = await supabase
            .from("voices")
            .select("*")
            .order("created_at", { ascending: false })

          if (allVoices) {
            setVoices(allVoices)
          }
        } else {
          console.log("[v0] Голос еще не готов, продолжаем проверку...")
          setTimeout(checkForNewVoice, 2000)
        }
      } catch (error) {
        console.error("[v0] Ошибка polling голосов:", error)
        setTimeout(checkForNewVoice, 2000)
      }
    }

    setTimeout(checkForNewVoice, 2000)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Навигация */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-8">
            <Link
              href="/avatars"
              className="text-3xl font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Аватары
            </Link>
            <Link
              href="/voices"
              className="text-3xl font-bold text-foreground"
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
              onClick={() => setIsVoiceModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Mic className="w-4 h-4" />
              Добавить голос
            </button>
          </div>
        </div>

        {/* Контент голосов */}
        {voicesLoading ? (
          <div className="text-center py-20">
            <div className="text-muted-foreground text-lg">Загрузка голосов...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tempVoices.map((tempVoice) => (
              <div key={tempVoice.tempId} className="relative">
                <div className="aspect-square rounded-lg overflow-hidden bg-purple-100 relative flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mb-3">
                      <Mic className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <div className="text-sm text-purple-700 font-medium">Обработка голоса</div>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <div className="font-medium text-sm">{tempVoice.name}</div>
                  <div className="text-xs text-muted-foreground">Обработка...</div>
                </div>
              </div>
            ))}

            {voices.map((voice) => (
              <VoiceCard key={voice.id} voice={voice} />
            ))}

            {voices.length === 0 && tempVoices.length === 0 && (
              <div className="col-span-full text-center py-20">
                <div className="text-muted-foreground text-lg mb-4">У вас нет голосов</div>
                <div className="text-muted-foreground text-sm">Начните с создания нового голоса</div>
              </div>
            )}
          </div>
        )}

        <VoiceUploadModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onVoiceUploaded={handleVoiceUploaded}
        />
      </div>
    </div>
  )
}

