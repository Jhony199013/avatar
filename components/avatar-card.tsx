"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Trash2, Eye } from "lucide-react"
import { supabase, type PhotoAvatar } from "@/lib/supabase"

interface AvatarCardProps {
  avatar: PhotoAvatar
  onDelete?: (avatarId: number) => void
}

export function AvatarCard({ avatar: initialAvatar, onDelete }: AvatarCardProps) {
  const [avatar, setAvatar] = useState<PhotoAvatar>(initialAvatar)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (avatar.status !== "done") {
      startPolling(avatar.id)
    }
  }, [avatar.id, avatar.status])

  const startPolling = (id: number) => {
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.from("photo_avatars").select("*").eq("id", id).single()

        if (error) {
          console.error("[v0] Ошибка polling:", error)
          return
        }

        setAvatar(data)

        // Останавливаем polling если статус стал "done"
        if (data.status === "done") {
          clearInterval(interval)
        }
      } catch (error) {
        console.error("[v0] Ошибка при polling:", error)
      }
    }, 2000) // Проверяем каждые 2 секунды

    // Очищаем interval через 5 минут если статус так и не изменился
    setTimeout(() => {
      clearInterval(interval)
    }, 300000)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      // Отправляем вебхук
      await fetch('https://n8n.neurotalk.pro/webhook/8f4ec110-a680-4915-82f6-19807867d632', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatarId: avatar.hey_gen_id,
          avatarName: avatar.name,
          action: 'delete'
        })
      })

      // Ждем 3 секунды для лоадера
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Закрываем попап
      setShowDeleteDialog(false)
      
      // Обновляем страницу для актуализации аватаров
      window.location.reload()
    } catch (error) {
      console.error("Ошибка при отправке вебхука:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div 
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
              {avatar.status === "done" ? (
                <img
                  src={avatar.photo || "/diverse-avatars.png"}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    imageRendering: "optimizeQuality",
                  }}
                  onError={(e) => {
                    e.currentTarget.src = "/diverse-avatars.png"
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-600">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" />
                    <div className="text-sm font-medium">Генерация аватара</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Иконка просмотра всегда видна в левом верхнем углу */}
            {avatar.status === "done" && (
              <div className="absolute top-2 left-2 z-10">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowPreviewDialog(true)}
                  className="bg-white/90 hover:bg-white text-gray-900 shadow-md"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {/* Иконка корзины появляется только при наведении */}
            {avatar.status === "done" && (
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
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-foreground">{avatar.name}</h3>
          </div>
        </div>
      </CardContent>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить аватар</AlertDialogTitle>
            <AlertDialogDescription>
              Вы точно уверены, что хотите удалить аватар <strong>"{avatar.name}"</strong>? 
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
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Удаление...
                </>
              ) : (
                "Да, удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог просмотра в оригинальном соотношении сторон */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Просмотр аватара: {avatar.name}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img
              src={avatar.photo || "/diverse-avatars.png"}
              alt={avatar.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              onError={(e) => {
                e.currentTarget.src = "/diverse-avatars.png"
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
