"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Trash2, Eye, Edit2, Check, X } from "lucide-react"
import { supabase, type PhotoAvatar } from "@/lib/supabase"

interface AvatarCardProps {
  avatar: PhotoAvatar
  onDelete?: (avatarId: number) => void
  onNameUpdate?: (avatarId: number, newName: string) => void
}

export function AvatarCard({ avatar: initialAvatar, onDelete, onNameUpdate }: AvatarCardProps) {
  const [avatar, setAvatar] = useState<PhotoAvatar>(initialAvatar)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState(avatar.name)
  const [isUpdatingName, setIsUpdatingName] = useState(false)

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

  const handleStartEdit = () => {
    setIsEditingName(true)
    setEditingName(avatar.name)
  }

  const handleCancelEdit = () => {
    setIsEditingName(false)
    setEditingName(avatar.name)
  }

  const handleSaveName = async () => {
    if (!editingName.trim()) return
    
    setIsUpdatingName(true)
    try {
      const response = await fetch('/api/update-avatar-name', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: avatar.id,
          name: editingName.trim()
        })
      })

      if (response.ok) {
        const updatedAvatar = { ...avatar, name: editingName.trim() }
        setAvatar(updatedAvatar)
        setIsEditingName(false)
        
        // Уведомляем родительский компонент об обновлении
        if (onNameUpdate) {
          onNameUpdate(avatar.id, editingName.trim())
        }
      } else {
        console.error('Ошибка при обновлении названия аватара')
      }
    } catch (error) {
      console.error('Ошибка при обновлении названия аватара:', error)
    } finally {
      setIsUpdatingName(false)
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
            {isEditingName ? (
              <div className="flex items-center gap-1 max-w-full">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border rounded min-w-0"
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
                  className="bg-blue-600 hover:bg-blue-700 h-7 w-7 p-0"
                >
                  {isUpdatingName ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isUpdatingName}
                  className="border-gray-300 hover:bg-gray-50 h-7 w-7 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h3 className="font-semibold text-foreground">{avatar.name}</h3>
                {avatar.status === "done" && (
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
