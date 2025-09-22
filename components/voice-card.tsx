"use client"

import { useState, useRef } from "react"
import { Play, Pause, Volume2, Trash2, Edit2, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import type { Voice } from "@/lib/supabase"

interface VoiceCardProps {
  voice: Voice
  onNameUpdate?: (voiceId: number, newName: string) => void
}

export function VoiceCard({ voice, onNameUpdate }: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState(voice.name)
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlayPause = async () => {
    const audioUrl = voice.download_url || voice.oss_url
    if (!audioUrl) return

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl)
        audioRef.current.addEventListener("ended", () => {
          setIsPlaying(false)
        })
        audioRef.current.addEventListener("loadstart", () => {
          setIsLoading(true)
        })
        audioRef.current.addEventListener("canplay", () => {
          setIsLoading(false)
        })
      }

        if (isPlaying) {
          audioRef.current.pause()
          setIsPlaying(false)
        } else {
          // При воспроизведении всегда начинаем с начала
          audioRef.current.currentTime = 0
          await audioRef.current.play()
          setIsPlaying(true)
        }
    } catch (error) {
      console.error("Ошибка воспроизведения аудио:", error)
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      // Отправляем вебхук
      await fetch('https://n8n.neurotalk.pro/webhook/d3a3b41f-825a-4983-92af-9a69f3580e81', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speaker: voice.speaker,
          voiceName: voice.name,
          action: 'delete'
        })
      })

      // Закрываем попап
      setShowDeleteDialog(false)
      
      // Обновляем страницу для актуализации голосов
      window.location.reload()
    } catch (error) {
      console.error("Ошибка при отправке вебхука:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStartEdit = () => {
    setIsEditingName(true)
    setEditingName(voice.name)
  }

  const handleCancelEdit = () => {
    setIsEditingName(false)
    setEditingName(voice.name)
  }

  const handleSaveName = async () => {
    if (!editingName.trim()) return
    
    setIsUpdatingName(true)
    try {
      const response = await fetch('/api/update-voice-name', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: voice.id,
          name: editingName.trim()
        })
      })

      if (response.ok) {
        setIsEditingName(false)
        
        // Уведомляем родительский компонент об обновлении
        if (onNameUpdate) {
          onNameUpdate(voice.id, editingName.trim())
        }
      } else {
        console.error('Ошибка при обновлении названия голоса')
      }
    } catch (error) {
      console.error('Ошибка при обновлении названия голоса:', error)
    } finally {
      setIsUpdatingName(false)
    }
  }

  const isProcessing = voice.status === "processing"

  return (
    <Card 
      className="w-full max-w-sm relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* Иконка корзины при наведении */}
      {!isProcessing && (
        <div 
          className={`absolute top-2 right-2 z-10 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="bg-red-600/90 hover:bg-red-600 shadow-md"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">

          {/* Иконка голоса */}
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center relative ${
              isProcessing ? "bg-purple-100" : "bg-purple-50"
            }`}
          >
            <Volume2 className="w-8 h-8 text-purple-600" />
            {isProcessing && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
              </div>
            )}
          </div>

          {/* Название голоса */}
          <div className="text-center">
            {isEditingName ? (
              <div className="flex items-center gap-0.5 max-w-full px-1">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm border rounded min-w-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveName()
                    } else if (e.key === 'Escape') {
                      handleCancelEdit()
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={isUpdatingName || !editingName.trim()}
                  className="bg-purple-600 hover:bg-purple-700 h-6 w-6 p-0"
                >
                  {isUpdatingName ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Check className="w-2.5 h-2.5" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isUpdatingName}
                  className="border-gray-300 hover:bg-gray-50 h-6 w-6 p-0"
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h3 className="font-semibold text-lg text-gray-900">{voice.name}</h3>
                {!isProcessing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStartEdit}
                    className="h-6 w-6 p-0 hover:bg-gray-100"
                  >
                    <Edit2 className="w-3 h-3 text-gray-500 hover:text-gray-700" />
                  </Button>
                )}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">{isProcessing ? "Обработка..." : "Готов"}</p>
          </div>

          {/* Кнопка воспроизведения */}
          {!isProcessing && (voice.download_url || voice.oss_url) && (
            <Button onClick={handlePlayPause} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700">
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : isPlaying ? (
                <Pause className="w-4 h-4 mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isLoading ? "Загрузка..." : isPlaying ? "Пауза" : "Воспроизвести"}
            </Button>
          )}
        </div>
      </CardContent>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить голос</AlertDialogTitle>
            <AlertDialogDescription>
              Вы точно уверены, что хотите удалить голос <strong>"{voice.name}"</strong>? 
              Это действие нельзя будет отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Нет</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Удаление..." : "Да, удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
