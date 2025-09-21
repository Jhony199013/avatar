"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Check, AlertCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AvatarUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onAvatarUploaded?: (tempAvatar: { name: string; photo: string; status: string }) => void
}

export function AvatarUploadModal({ isOpen, onClose, onAvatarUploaded }: AvatarUploadModalProps) {
  const [avatarName, setAvatarName] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        // Вычисляем новые размеры с сохранением пропорций
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height
            height = maxWidth
          }
        }

        canvas.width = width
        canvas.height = height

        // Рисуем сжатое изображение
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          quality,
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files)
      const validFiles = validateFileTypes(files)
      if (validFiles.length > 0) {
        createPreviews(validFiles)
      }
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const validFiles = validateFileTypes(files)
      if (validFiles.length > 0) {
        createPreviews(validFiles)
      }
    }
  }

  const createPreviews = (files: File[]) => {
    // Очищаем предыдущие URL превью
    previewUrls.forEach((url) => URL.revokeObjectURL(url))

    const newPreviewUrls = files.map((file) => URL.createObjectURL(file))
    setSelectedFiles(files)
    setPreviewUrls(newPreviewUrls)
  }

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newPreviews = previewUrls.filter((_, i) => i !== index)

    // Освобождаем память от удаленного URL
    URL.revokeObjectURL(previewUrls[index])

    setSelectedFiles(newFiles)
    setPreviewUrls(newPreviews)
  }

  const handleUpload = async () => {
    if (!avatarName.trim() || selectedFiles.length === 0) {
      return
    }

    setIsUploading(true)

    try {
      console.log("[v0] Начинаем загрузку файлов...")

      const tempAvatar = {
        name: avatarName.trim(),
        photo: "", // Пустое фото для временной записи
        status: "loading",
      }

      // Создаем FormData для отправки
      const formData = new FormData()
      formData.append("avatar_name", avatarName.trim())

      // Добавляем все выбранные файлы
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        console.log(`[v0] Добавляем файл ${i + 1}: ${file.name}, размер: ${file.size} байт`)
        formData.append("photos", file)
      }

      console.log("[v0] Отправляем данные на вебхук...")

      // Отправляем через наш API роут для обхода CORS
      const response = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Ошибка от API роута:", response.status, errorText)
        throw new Error(`Ошибка загрузки: ${response.status}`)
      }

      const result = await response.json()
      console.log("[v0] Успешная загрузка:", result)

      if (onAvatarUploaded) {
        onAvatarUploaded(tempAvatar)
      }

      // Закрываем модальное окно и очищаем данные
      handleCancel()
    } catch (error) {
      console.error("[v0] Ошибка при загрузке:", error)
      alert(`Ошибка при загрузке: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    onClose()
    setAvatarName("")
    setSelectedFiles([])
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setPreviewUrls([])
  }

  const validateFileTypes = (files: File[]): File[] => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    files.forEach((file) => {
      if (allowedTypes.includes(file.type.toLowerCase())) {
        validFiles.push(file)
      } else {
        invalidFiles.push(file.name)
      }
    })

    if (invalidFiles.length > 0) {
      alert(
        `Следующие файлы имеют неподдерживаемый формат и были пропущены:\n${invalidFiles.join("\n")}\n\nПоддерживаются только JPEG и PNG файлы.`,
      )
    }

    return validFiles
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold">Загрузить фотографию вашего аватара</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Поле для имени аватара */}
          <div className="space-y-2">
            <Label htmlFor="avatar-name">Имя аватара</Label>
            <Input
              id="avatar-name"
              placeholder="Введите имя для вашего аватара"
              value={avatarName}
              onChange={(e) => setAvatarName(e.target.value)}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Загрузите одну качественную фотографию себя в анфас для создания аватара
          </div>

          {/* Область загрузки */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-border",
              "hover:border-primary/50",
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground mb-1">Перетащите фотографию для загрузки</div>
                <div className="text-sm text-muted-foreground">Загружайте PNG или JPG файлы размером до 200МБ</div>
              </div>
              <Button variant="outline" onClick={() => document.getElementById("file-input")?.click()}>
                Выбрать фотографию
              </Button>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm font-medium">Выбранная фотография:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={url || "/placeholder.svg"}
                        alt={`Превью ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="mt-1 text-xs text-muted-foreground truncate">{selectedFiles[index].name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Требования к фотографии */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Требования к фотографии</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">Хорошая фотография</div>
                  <div className="text-sm text-muted-foreground">
                    Качественная фотография себя в анфас с хорошим освещением, четким изображением лица, 
                    без размытия. Фотография должна быть недавней и отражать ваш текущий внешний вид. 
                    Лицо должно быть хорошо видно, без теней и бликов.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-3 h-3 text-red-600" />
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">Плохая фотография</div>
                  <div className="text-sm text-muted-foreground">
                    Размытые или нечеткие изображения, фотографии в профиль или сбоку, плохое освещение, 
                    тени на лице, солнцезащитные очки, закрытое лицо, групповые фотографии, 
                    черно-белые изображения, низкое качество или маленькое разрешение.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
              Отмена
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!avatarName.trim() || selectedFiles.length === 0 || isUploading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isUploading ? "Загружаем..." : "Загрузить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
