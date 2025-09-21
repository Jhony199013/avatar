"use client"

import React, { useEffect } from "react"
import { supabase } from "@/lib/supabase"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Undo,
  Redo,
  User,
  Type,
  ImageIcon,
  Layers,
  Settings,
  Play,
  Volume2,
  Pause,
  GripVertical,
  X,
  Loader2,
} from "lucide-react"
import type { PhotoAvatar, Voice } from "@/lib/supabase"

interface ImageTrackItem {
  id: string
  url: string
  startTime: number
  duration: number
  name: string
  width: number
}

interface CanvasElement {
  id: string
  type: "avatar" | "photo"
  url: string
  name: string
  x: number // center coordinates in pixels
  y: number // center coordinates in pixels
  width: number
  height: number
  originalWidth: number
  originalHeight: number
}

interface VideoEditorProps {
  isOpen: boolean
  onClose: () => void
  orientation: "portrait" | "landscape"
  avatars: PhotoAvatar[]
  voices: Voice[]
  onMaterialCreated: (videoTitle?: string) => void
}

// Функция генерации уникального ID
const generateUniqueId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 13; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function VideoEditor({ isOpen, onClose, orientation, avatars, voices, onMaterialCreated }: VideoEditorProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<PhotoAvatar | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null)
  const [text, setText] = useState("")
  const [videoTitle, setVideoTitle] = useState(`Название видео: ${generateUniqueId()}.mp4`)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editableId, setEditableId] = useState(generateUniqueId())
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)
  const [lastGeneratedText, setLastGeneratedText] = useState<string>("")
  const [audioDuration, setAudioDuration] = useState(0)
  const [isPlayingGenerated, setIsPlayingGenerated] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [isLoadingVoice, setIsLoadingVoice] = useState(false)
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)
  const [isDraggingLayer, setIsDraggingLayer] = useState(false)

  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([])
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showCoordinates, setShowCoordinates] = useState(false)
  const [showLayersDropdown, setShowLayersDropdown] = useState(false)
  const [showLayersMenu, setShowLayersMenu] = useState(false)
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)

  // Canvas dimensions: 1920x1080 for landscape, 1080x1920 for portrait
  const canvasWidth = orientation === "landscape" ? 1920 : 1080
  const canvasHeight = orientation === "landscape" ? 1080 : 1920

  const [imageTrackItems, setImageTrackItems] = useState<ImageTrackItem[]>([])
  const [currentBackgroundImage, setCurrentBackgroundImage] = useState<string | null>(null)
  const [isDraggingImageItem, setIsDraggingImageItem] = useState<string | null>(null)

  // Генерируем новое уникальное название при открытии редактора
  useEffect(() => {
    if (isOpen) {
      const newId = generateUniqueId()
      setEditableId(newId)
      setVideoTitle(`Название видео: ${newId}.mp4`)
    }
  }, [isOpen])
  const [isResizingImageItem, setIsResizingImageItem] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const generatedAudioRef = useRef<HTMLAudioElement | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const imageTimelineRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const readyAvatars = avatars.filter((avatar) => avatar.status === "done")
  const readyVoices = voices.filter((voice) => voice.status === "done")

  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null)

  React.useEffect(() => {
    if (selectedAvatar) {
      const img = new Image()
      img.onload = () => {
        const aspectRatio = img.width / img.height
        const scaledHeight = 300
        const scaledWidth = scaledHeight * aspectRatio

        const newElement: CanvasElement = {
          id: `avatar-${selectedAvatar.id}`,
          type: "avatar",
          url: selectedAvatar.photo || "/diverse-avatars.png",
          name: selectedAvatar.name,
          x: canvasWidth / 2,
          y: canvasHeight / 2,
          width: scaledWidth,
          height: scaledHeight,
          originalWidth: img.width,
          originalHeight: img.height,
        }

        // Avatar always goes to the beginning (highest priority)
        setCanvasElements((prev) => [newElement, ...prev.filter((el) => el.type !== "avatar")])
      }
      img.src = selectedAvatar.photo || "/diverse-avatars.png"
    } else {
      setCanvasElements((prev) => prev.filter((el) => el.type !== "avatar"))
    }
  }, [selectedAvatar, canvasWidth, canvasHeight])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file)
        const itemId = Math.random().toString(36).substr(2, 9)

        const newItem: ImageTrackItem = {
          id: itemId,
          url,
          name: file.name,
          startTime: currentTime, // Добавляем в позицию бегунка
          duration: Math.min(5, audioDuration || 10),
          width: 100,
        }
        setImageTrackItems((prev) => [...prev, newItem])

        const img = new Image()
        img.onload = () => {
          const aspectRatio = img.width / img.height
          const scaledHeight = 200
          const scaledWidth = scaledHeight * aspectRatio

          const newElement: CanvasElement = {
            id: `photo-${itemId}`,
            type: "photo",
            url,
            name: file.name,
            x: canvasWidth / 2,
            y: canvasHeight / 2,
            width: scaledWidth,
            height: scaledHeight,
            originalWidth: img.width,
            originalHeight: img.height,
          }

          setCanvasElements((prev) => {
            // Добавляем новый элемент в КОНЕЦ списка слоев (самый низкий z на холсте)
            return [...prev, newElement]
          })
        }
        img.src = url
      }
    })

    // Сбрасываем input для возможности загрузки того же файла снова
    if (event.target) {
      event.target.value = ""
    }
  }

  // const updateCurrentBackgroundImage = useCallback(() => {
  //   const currentItem = imageTrackItems.find(
  //     (item) => currentTime >= item.startTime && currentTime < item.startTime + item.duration,
  //   )
  //   setCurrentBackgroundImage(currentItem?.url || null)
  // }, [imageTrackItems, currentTime])

  // React.useEffect(() => {
  //   updateCurrentBackgroundImage()
  // }, [updateCurrentBackgroundImage])

  const handleImageItemMouseDown = (
    e: React.MouseEvent,
    itemId: string,
    action: "drag" | "resize-left" | "resize-right",
  ) => {
    e.preventDefault()
    e.stopPropagation()

    if (action === "drag") {
      setIsDraggingImageItem(itemId)
      const rect = imageTimelineRef.current?.getBoundingClientRect()
      if (rect) {
        const clickX = e.clientX - rect.left
        const item = imageTrackItems.find((i) => i.id === itemId)
        if (item) {
          const itemStartX = (item.startTime / (audioDuration || 1)) * rect.width
          setDragOffset(clickX - itemStartX)
        }
      }
    } else {
      setIsResizingImageItem(itemId)
    }
  }

  const handleImageItemMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!imageTimelineRef.current || audioDuration === 0) return

      const rect = imageTimelineRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left

      if (isDraggingImageItem) {
        const newStartTime = Math.max(0, Math.min(audioDuration, ((mouseX - dragOffset) / rect.width) * audioDuration))
        setImageTrackItems((prev) =>
          prev.map((item) => (item.id === isDraggingImageItem ? { ...item, startTime: newStartTime } : item)),
        )
      }

      if (isResizingImageItem) {
        const item = imageTrackItems.find((i) => i.id === isResizingImageItem)
        if (item) {
          const itemStartX = (item.startTime / audioDuration) * rect.width
          const newDuration = Math.max(
            0.5,
            Math.min(audioDuration - item.startTime, ((mouseX - itemStartX) / rect.width) * audioDuration),
          )
          setImageTrackItems((prev) =>
            prev.map((i) => (i.id === isResizingImageItem ? { ...i, duration: newDuration } : i)),
          )
        }
      }
    },
    [isDraggingImageItem, isResizingImageItem, imageTrackItems, audioDuration, dragOffset],
  )

  const handleImageItemMouseUp = useCallback(() => {
    setIsDraggingImageItem(null)
    setIsResizingImageItem(null)
    setDragOffset(0)
  }, [])

  React.useEffect(() => {
    if (isDraggingImageItem || isResizingImageItem) {
      document.addEventListener("mousemove", handleImageItemMouseMove)
      document.addEventListener("mouseup", handleImageItemMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleImageItemMouseMove)
        document.removeEventListener("mouseup", handleImageItemMouseUp)
      }
    }
  }, [isDraggingImageItem, isResizingImageItem, handleImageItemMouseMove, handleImageItemMouseUp])

  const generateTimeMarks = () => {
    if (audioDuration === 0) return []
    const marks = []
    const interval = Math.max(2, Math.ceil(audioDuration / 8)) // Показываем 8-10 меток равномерно
    for (let i = 0; i <= audioDuration; i += interval) {
      marks.push(i)
    }
    // Всегда добавляем финальную метку с точной длиной
    if (marks[marks.length - 1] < audioDuration) {
      marks.push(audioDuration)
    }
    return marks
  }

  const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string, action: "drag" | "resize") => {
    e.preventDefault()
    e.stopPropagation()

    setSelectedElementId(elementId)
    setShowCoordinates(true)

    if (action === "drag") {
      setIsDragging(true)
    } else {
      setIsResizing(true)
    }

    setDragStart({ x: e.clientX, y: e.clientY })
  }, [])

  const handleElementMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!canvasRef.current || !selectedElementId) return

      const rect = canvasRef.current.getBoundingClientRect()
      const scaleX = canvasWidth / rect.width
      const scaleY = canvasHeight / rect.height

      if (isDragging) {
        const deltaX = (e.clientX - dragStart.x) * scaleX
        const deltaY = (e.clientY - dragStart.y) * scaleY

        setCanvasElements((prev) =>
          prev.map((el) => {
            if (el.id === selectedElementId) {
              const newX = Math.max(el.width / 2, Math.min(canvasWidth - el.width / 2, el.x + deltaX))
              const newY = Math.max(el.height / 2, Math.min(canvasHeight - el.height / 2, el.y + deltaY))
              return { ...el, x: newX, y: newY }
            }
            return el
          }),
        )

        setDragStart({ x: e.clientX, y: e.clientY })
      }

      if (isResizing) {
        const deltaX = (e.clientX - dragStart.x) * scaleX
        const element = canvasElements.find((el) => el.id === selectedElementId)

        if (element) {
          const aspectRatio = element.originalWidth / element.originalHeight
          const newWidth = Math.max(50, Math.min(canvasWidth, element.width + deltaX))
          const newHeight = newWidth / aspectRatio

          setCanvasElements((prev) =>
            prev.map((el) => (el.id === selectedElementId ? { ...el, width: newWidth, height: newHeight } : el)),
          )
        }

        setDragStart({ x: e.clientX, y: e.clientY })
      }
    },
    [isDragging, isResizing, selectedElementId, dragStart, canvasElements, canvasWidth, canvasHeight],
  )

  const handleElementMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setShowCoordinates(false)
  }, [])

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleElementMouseMove)
      document.addEventListener("mouseup", handleElementMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleElementMouseMove)
        document.removeEventListener("mouseup", handleElementMouseUp)
      }
    }
  }, [isDragging, isResizing, handleElementMouseMove, handleElementMouseUp])

  const isElementVisible = (elementId: string) => {
    console.log("[v0] Checking visibility for element:", elementId)
    console.log("[v0] Current time:", currentTime)
    console.log("[v0] Audio duration:", audioDuration)
    console.log("[v0] Image track items:", imageTrackItems)
    console.log("[v0] Canvas elements:", canvasElements)

    // Find the canvas element to check its type
    const canvasElement = canvasElements.find((el) => el.id === elementId)

    if (!canvasElement) {
      console.log("[v0] Canvas element not found, hiding")
      return false
    }

    // Avatars are always visible (they don't have timeline entries)
    if (canvasElement.type === "avatar") {
      console.log("[v0] Avatar element, always visible")
      return true
    }

    // For photos, check timeline visibility
    if (audioDuration === 0) {
      console.log("[v0] No audio duration, showing photo element")
      return true
    }

    // For photos, we need to find the corresponding track item
    // Photo elements have IDs like "photo-6ftndwsvj" and track items have IDs like "6ftndwsvj"
    const photoId = elementId.replace("photo-", "")
    const trackItem = imageTrackItems.find((item) => item.id === photoId)
    console.log("[v0] Looking for photo ID:", photoId)
    console.log("[v0] Found track item:", trackItem)

    if (!trackItem) {
      console.log("[v0] No track item found for photo, hiding element")
      return false
    }

    const elementStartTime = trackItem.startTime
    const elementEndTime = trackItem.startTime + trackItem.duration
    const isVisible = currentTime >= elementStartTime && currentTime <= elementEndTime

    console.log("[v0] Element time range:", elementStartTime, "-", elementEndTime)
    console.log("[v0] Is visible:", isVisible)

    return isVisible
  }

  const selectedElement = canvasElements.find((el) => el.id === selectedElementId)

  const playVoice = async () => {
    const audioUrl = selectedVoice?.download_url || selectedVoice?.oss_url
    if (!audioUrl) return

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl)
        audioRef.current.addEventListener("ended", () => {
          setIsPlayingVoice(false)
        })
        audioRef.current.addEventListener("loadstart", () => {
          setIsLoadingVoice(true)
        })
        audioRef.current.addEventListener("canplay", () => {
          setIsLoadingVoice(false)
        })
      }

      if (isPlayingVoice) {
        audioRef.current.pause()
        setIsPlayingVoice(false)
      } else {
        await audioRef.current.play()
        setIsPlayingVoice(true)
      }
    } catch (error) {
      console.error("Ошибка воспроизведения аудио:", error)
      setIsLoadingVoice(false)
    }
  }

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlayingVoice(false)
    setIsLoadingVoice(false)
  }, [selectedVoice])

  const playGeneratedAudio = async () => {
    if (!generatedAudioUrl) return

    try {
      if (!generatedAudioRef.current) {
        generatedAudioRef.current = new Audio(generatedAudioUrl)
        generatedAudioRef.current.addEventListener("ended", () => {
          setIsPlayingGenerated(false)
          setCurrentTime(0)
        })
        generatedAudioRef.current.addEventListener("timeupdate", () => {
          if (generatedAudioRef.current) {
            setCurrentTime(generatedAudioRef.current.currentTime)
          }
        })
        generatedAudioRef.current.addEventListener("loadedmetadata", () => {
          if (generatedAudioRef.current) {
            setAudioDuration(generatedAudioRef.current.duration)
          }
        })
      }

      if (isPlayingGenerated) {
        generatedAudioRef.current.pause()
        setIsPlayingGenerated(false)
      } else {
        await generatedAudioRef.current.play()
        setIsPlayingGenerated(true)
      }
    } catch (error) {
      console.error("Ошибка воспроизведения сгенерированного аудио:", error)
    }
  }

  const handleGenerate = async () => {
    if (!selectedAvatar || !selectedVoice || !text.trim()) {
      alert("Пожалуйста, выберите аватар, голос и введите текст для озвучивания")
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      
      // Основные данные
      formData.append("speaker", selectedVoice.name)
      formData.append("text", text.trim())
      formData.append("orientation", orientation)
      formData.append("avatar_id", selectedAvatar.id.toString())
      formData.append("avatar_name", selectedAvatar.name)
      formData.append("video_title", `${editableId}.mp4`)
      
      // Добавляем ссылку на аудиофайл, если он сгенерирован
      if (generatedAudioUrl) {
        formData.append("audio_url", generatedAudioUrl)
      }

      // Структурируем данные для вебхука
      const avatarElement = canvasElements.find(el => el.type === "avatar")
      
      // Добавляем бинарные данные аватара
      // Пробуем загрузить по ссылке из avatarElement, если не получается - по selectedAvatar.photo
      let avatarLoaded = false
      
      if (avatarElement && avatarElement.url) {
        try {
          console.log("Загружаем аватар по ссылке из avatarElement:", avatarElement.url)
          const avatarResponse = await fetch(avatarElement.url)
          console.log("Ответ сервера для аватара (avatarElement):", avatarResponse.status, avatarResponse.statusText)
          
          if (avatarResponse.ok) {
            const avatarBlob = await avatarResponse.blob()
            console.log("Размер blob аватара (avatarElement):", avatarBlob.size, "тип:", avatarBlob.type)
            
            if (avatarBlob.size > 0) {
              formData.append("avatar_file", avatarBlob, `avatar_${selectedAvatar.id}.jpg`)
              console.log("Аватар добавлен в FormData (из avatarElement)")
              avatarLoaded = true
            }
          }
        } catch (error) {
          console.error("Ошибка загрузки аватара из avatarElement:", error)
        }
      }
      
      // Если не удалось загрузить из avatarElement, пробуем из selectedAvatar.photo
      if (!avatarLoaded && selectedAvatar && selectedAvatar.photo) {
        try {
          console.log("Загружаем аватар по ссылке из selectedAvatar.photo:", selectedAvatar.photo)
          const avatarResponse = await fetch(selectedAvatar.photo)
          console.log("Ответ сервера для аватара (selectedAvatar):", avatarResponse.status, avatarResponse.statusText)
          
          if (avatarResponse.ok) {
            const avatarBlob = await avatarResponse.blob()
            console.log("Размер blob аватара (selectedAvatar):", avatarBlob.size, "тип:", avatarBlob.type)
            
            if (avatarBlob.size > 0) {
              formData.append("avatar_file", avatarBlob, `avatar_${selectedAvatar.id}.jpg`)
              console.log("Аватар добавлен в FormData (из selectedAvatar)")
              avatarLoaded = true
            }
          }
        } catch (error) {
          console.error("Ошибка загрузки аватара из selectedAvatar:", error)
        }
      }
      
      if (!avatarLoaded) {
        console.log("Не удалось загрузить аватар ни по одной ссылке:", { 
          avatarElement, 
          avatarElementUrl: avatarElement?.url,
          selectedAvatar, 
          selectedAvatarPhoto: selectedAvatar?.photo 
        })
      }

      // Добавляем бинарные данные аудиофайла
      if (generatedAudioUrl) {
        try {
          let audioBlob: Blob
          
          // Проверяем, является ли это download_url (Cloudflare R2)
          if (generatedAudioUrl.includes('cloudflarestorage') || generatedAudioUrl.includes('download_url')) {
            console.log("Обнаружен download_url, загружаем через API роут для обхода CORS")
            
            // Загружаем через API роут для обхода CORS
            const proxyResponse = await fetch('/api/proxy-audio', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ audioUrl: generatedAudioUrl }),
            })
            
            if (!proxyResponse.ok) {
              throw new Error(`Proxy API error! status: ${proxyResponse.status}`)
            }
            
            audioBlob = await proxyResponse.blob()
            console.log("Аудио загружено через API роут, размер:", audioBlob.size, "тип:", audioBlob.type)
          } else {
            // Для oss_url загружаем напрямую
            console.log("Загружаем аудио по ссылке:", generatedAudioUrl)
            const audioResponse = await fetch(generatedAudioUrl)
            console.log("Ответ сервера для аудио:", audioResponse.status, audioResponse.statusText)
            
            if (!audioResponse.ok) {
              throw new Error(`HTTP error! status: ${audioResponse.status}`)
            }
            
            audioBlob = await audioResponse.blob()
            console.log("Размер blob аудио:", audioBlob.size, "тип:", audioBlob.type)
          }
          
          // Определяем расширение файла из URL и правильный MIME тип
          let fileExtension = 'mp3' // по умолчанию
          let mimeType = 'audio/mpeg' // по умолчанию
          
          // Если это download_url, используем audio/x-wav
          if (generatedAudioUrl.includes('download_url') || generatedAudioUrl.includes('cloudflarestorage')) {
            fileExtension = 'wav'
            mimeType = 'audio/x-wav'
          } else {
            // Извлекаем расширение из URL и устанавливаем правильный MIME тип
            if (generatedAudioUrl.includes('.wav')) {
              fileExtension = 'wav'
              mimeType = 'audio/mpeg' // Для wav используем audio/mpeg
            } else if (generatedAudioUrl.includes('.mp3')) {
              fileExtension = 'mp3'
              mimeType = 'audio/mpeg' // Для mp3 используем audio/mpeg
            } else if (generatedAudioUrl.includes('.m4a')) {
              fileExtension = 'm4a'
              mimeType = 'audio/mp4'
            } else if (generatedAudioUrl.includes('.ogg')) {
              fileExtension = 'ogg'
              mimeType = 'audio/ogg'
            } else if (generatedAudioUrl.includes('.aac')) {
              fileExtension = 'aac'
              mimeType = 'audio/aac'
            }
          }
          
          console.log("Определено расширение файла из URL:", fileExtension, "MIME тип:", mimeType)
          
          // Создаем новый Blob с правильным MIME типом
          const audioBlobWithCorrectType = new Blob([audioBlob], { type: mimeType })
          formData.append("audio_file", audioBlobWithCorrectType, `audio_${selectedAvatar.id}.${fileExtension}`)
          console.log("Аудио добавлено в FormData с правильным Content-Type:", mimeType)
        } catch (error) {
          console.error("Ошибка загрузки аудиофайла:", error)
        }
      } else {
        console.log("Нет ссылки на аудиофайл")
      }
      const otherElements = canvasElements.filter(el => el.type !== "avatar")

      // Данные аватара
      let avatarData = null
      if (avatarElement) {
        const originalIndex = canvasElements.findIndex(el => el.id === avatarElement.id)
        const zIndex = canvasElements.length - originalIndex
        
        avatarData = {
          id: avatarElement.id,
          name: avatarElement.name,
          url: avatarElement.url,
          x: avatarElement.x,
          y: avatarElement.y,
          width: avatarElement.width,
          height: avatarElement.height,
          originalWidth: avatarElement.originalWidth,
          originalHeight: avatarElement.originalHeight,
          z: zIndex
        }
      }

      // Данные остальных элементов
      const elementsData = otherElements.map((element) => {
        const originalIndex = canvasElements.findIndex(el => el.id === element.id)
        const zIndex = canvasElements.length - originalIndex
        
        const elementData: any = {
          id: element.id,
          type: element.type,
          name: element.name,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          originalWidth: element.originalWidth,
          originalHeight: element.originalHeight,
          z: zIndex
        }

        // Если это медиафайл, добавляем данные таймлайна
        if (element.type === "photo") {
          const mediaId = element.id.replace("photo-", "")
          const timelineItem = imageTrackItems.find(item => item.id === mediaId)
          if (timelineItem) {
            elementData.startTime = timelineItem.startTime
            elementData.duration = timelineItem.duration
            elementData.endTime = timelineItem.startTime + timelineItem.duration
          }
        }

        return elementData
      })

      // Создаем финальную структуру данных
      const webhookData = {
        avatar: avatarData,
        elements: elementsData,
        audio: generatedAudioUrl ? {
          url: generatedAudioUrl,
          duration: audioDuration
        } : null
      }

      formData.append("webhook_data", JSON.stringify(webhookData))

      // Логируем содержимое FormData
      console.log("Содержимое FormData:")
      for (const [key, value] of formData.entries()) {
        if (value && typeof value === 'object' && 'size' in value && 'type' in value) {
          console.log(`${key}:`, `Blob/File размером ${(value as any).size} байт, тип: ${(value as any).type}`)
        } else {
          console.log(`${key}:`, value)
        }
      }

      // Добавляем бинарные данные медиафайлов
      for (const element of canvasElements) {
        if (element.type === "photo") {
          try {
            const mediaResponse = await fetch(element.url)
            const mediaBlob = await mediaResponse.blob()
            formData.append(`media_${element.id}`, mediaBlob, element.name)
          } catch (error) {
            console.error(`Ошибка загрузки медиафайла ${element.name}:`, error)
          }
        }
      }

      const response = await fetch("https://n8n.neurotalk.pro/webhook/5cbb2538-6024-4317-bed2-78a74145fbed", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Вебхук отправлен успешно:", result)
        
        if (onMaterialCreated) {
          onMaterialCreated(`${editableId}.mp4`)
        }
        
        // Закрываем редактор после успешной генерации
        onClose()
      } else {
        alert("Ошибка при отправке данных. Попробуйте еще раз.")
      }
    } catch (error) {
      console.error("Ошибка при отправке вебхука:", error)
      alert("Ошибка при отправке данных. Проверьте подключение к интернету.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayGeneration = async () => {
    if (!selectedAvatar || !selectedVoice || !text.trim()) {
      alert("Пожалуйста, выберите аватар, голос и введите текст для озвучивания")
      return
    }

    setIsGenerating(true)
    try {
      const { data: voiceData, error } = await supabase
        .from("voices")
        .select("speaker")
        .eq("name", selectedVoice.name)
        .single()

      if (error || !voiceData) {
        console.error("Ошибка поиска голоса:", error)
        alert("Ошибка при поиске данных голоса. Попробуйте еще раз.")
        return
      }

      const webhookData = {
        voice: voiceData.speaker,
        text: text.trim(),
        avatar: selectedAvatar.name,
        orientation: orientation,
        video_title: `${editableId}.mp4`,
      }

      const response = await fetch("https://n8n.neurotalk.pro/webhook/1b385059-43c2-4e14-b783-cfda2ea10346", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      })

      if (response.ok) {
        const responseData = await response.json()
        console.log("[v0] Ответ от вебхука генерации:", responseData)

        let audioUrl = null
        if (Array.isArray(responseData) && responseData.length > 0) {
          // Для download_url структура: responseData[0].result[0].download_url
          audioUrl = responseData[0]?.result?.[0]?.download_url || responseData[0]?.data?.oss_url
        } else if (responseData?.result?.[0]?.download_url || responseData?.data?.oss_url) {
          audioUrl = responseData.result[0].download_url || responseData.data.oss_url
        }

        if (audioUrl) {
          console.log("[v0] Найден URL аудио:", audioUrl)
          setGeneratedAudioUrl(audioUrl)
          setGeneratedAudio(audioUrl)
          setLastGeneratedText(text.trim()) // Сохраняем текст после успешной генерации

          const tempAudio = new Audio(audioUrl)
          tempAudio.addEventListener("loadedmetadata", () => {
            setAudioDuration(tempAudio.duration)
          })
          tempAudio.load()
        } else {
          alert("Ошибка: не получен URL аудиофайла")
        }
      } else {
        alert("Ошибка при запуске генерации. Попробуйте еще раз.")
      }
    } catch (error) {
      console.error("Ошибка при отправке вебхука:", error)
      alert("Ошибка при запуске генерации. Проверьте подключение к интернету.")
    } finally {
      setIsGenerating(false)
    }
  }

  React.useEffect(() => {
    if (generatedAudioRef.current) {
      generatedAudioRef.current.pause()
      URL.revokeObjectURL(generatedAudioUrl || "")
    }
    setGeneratedAudioUrl(null)
    setGeneratedAudio(null)
    setAudioDuration(0)
    setCurrentTime(0)
    setIsPlayingGenerated(false)
    generatedAudioRef.current = null
  }, [selectedVoice, text, selectedAvatar])

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!generatedAudioRef.current || !timelineRef.current || audioDuration === 0) return

    const rect = timelineRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * audioDuration

    generatedAudioRef.current.currentTime = Math.max(0, Math.min(audioDuration, newTime))
    setCurrentTime(newTime)
  }

  const handleTimelineDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingTimeline(true)
    handleTimelineClick(e)
  }

  const handleTimelineDrag = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingTimeline || !generatedAudioRef.current || !timelineRef.current || audioDuration === 0) return

      const rect = timelineRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, clickX / rect.width))
      const newTime = percentage * audioDuration

      generatedAudioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    },
    [isDraggingTimeline, audioDuration],
  )

  const handleTimelineDragEnd = useCallback(() => {
    setIsDraggingTimeline(false)
  }, [])

  React.useEffect(() => {
    if (isDraggingTimeline) {
      document.addEventListener("mousemove", handleTimelineDrag)
      document.addEventListener("mouseup", handleTimelineDragEnd)
      return () => {
        document.removeEventListener("mousemove", handleTimelineDrag)
        document.removeEventListener("mouseup", handleTimelineDragEnd)
      }
    }
  }, [isDraggingTimeline, handleTimelineDrag, handleTimelineDragEnd])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
  }

  const handleLayerDragStart = (e: React.DragEvent, elementId: string) => {
    e.dataTransfer.setData("text/plain", elementId)
    e.dataTransfer.effectAllowed = "move"
    setIsDraggingLayer(true)
  }

  const handleLayerDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleLayerDrop = (e: React.DragEvent, targetElementId: string) => {
    e.preventDefault()
    const draggedElementId = e.dataTransfer.getData("text/plain")
    if (!draggedElementId || draggedElementId === targetElementId) return

    setCanvasElements((prev) => {
      const draggedIndex = prev.findIndex((el) => el.id === draggedElementId)
      const targetIndex = prev.findIndex((el) => el.id === targetElementId)

      if (draggedIndex === -1 || targetIndex === -1) return prev

      // Универсальная логика перетаскивания для всех элементов (включая аватар)
      const newElements = [...prev]
      const [moved] = newElements.splice(draggedIndex, 1)
      newElements.splice(targetIndex, 0, moved)

      return newElements
    })

    setIsDraggingLayer(false)
  }

  const handleLayerDragEnd = () => {
    setIsDraggingLayer(false)
  }

  const deleteElement = (elementId: string, elementType: string) => {
    // Удаляем элемент с холста
    setCanvasElements(prev => prev.filter(el => el.id !== elementId))
    
    // Если это медиафайл, удаляем его с таймлайна
    if (elementType === "photo") {
      // Извлекаем ID медиафайла из ID элемента (photo-{id} -> {id})
      const mediaId = elementId.replace("photo-", "")
      setImageTrackItems(prev => prev.filter(item => item.id !== mediaId))
    }
    
    // Если удаляем аватар, сбрасываем выбор
    if (elementType === "avatar") {
      setSelectedAvatar(null)
    }
    
    // Если удаляем выбранный элемент, сбрасываем выбор
    if (selectedElementId === elementId) {
      setSelectedElementId(null)
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Снимаем выделение при клике в свободную зону холста
    if (selectedElementId) {
      setSelectedElementId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-background z-50 flex flex-col"
      onClick={(e) => {
        // Снимаем выделение при клике в любую область за пределами холста
        if (selectedElementId && !(e.target as Element).closest('[data-canvas-area]')) {
          setSelectedElementId(null)
        }
        
        // Закрываем меню при клике в пустое место (но не при клике на кнопки меню)
        if (!(e.target as Element).closest('[data-canvas-area]') && 
            !(e.target as Element).closest('[data-menu-area]') &&
            !(e.target as Element).closest('button')) {
          setShowLayersMenu(false)
          setShowLayersDropdown(false)
        }
      }}
    >
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />

      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">Название видео:</span>
            {isEditingTitle ? (
              <input
                type="text"
                value={editableId}
                onChange={(e) => setEditableId(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false)
                  setVideoTitle(`Название видео: ${editableId}.mp4`)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false)
                    setVideoTitle(`Название видео: ${editableId}.mp4`)
                  }
                  if (e.key === 'Escape') {
                    const newId = generateUniqueId()
                    setEditableId(newId)
                    setVideoTitle(`Название видео: ${newId}.mp4`)
                    setIsEditingTitle(false)
                  }
                }}
                className="text-lg font-medium bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none px-1 min-w-[200px]"
                autoFocus
                maxLength={13}
              />
            ) : (
              <span 
                className="text-lg font-medium cursor-pointer hover:text-blue-600 transition-colors border-b border-dashed border-gray-300 px-1 min-w-[200px] inline-block"
                onClick={() => setIsEditingTitle(true)}
              >
                {editableId}.mp4
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {canvasWidth} × {canvasHeight}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <User className="w-4 h-4" />
            <span className="ml-1">Аватары</span>
          </Button>
          <Button variant="ghost" size="sm">
            <Type className="w-4 h-4" />
            <span className="ml-1">Текст</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="w-4 h-4" />
            <span className="ml-1">Медиа</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowLayersDropdown(!showLayersDropdown)}
            className={showLayersDropdown ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : ""}
          >
            <Layers className="w-4 h-4" />
            <span className="ml-1">Элементы</span>
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
            <span className="ml-1">Фон</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowLayersMenu(!showLayersMenu)}
            className={showLayersMenu ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : ""}
          >
            <Layers className="w-4 h-4" />
            <span className="ml-1">Слои</span>
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleGenerate}
            disabled={!selectedAvatar || !selectedVoice || !text.trim() || isLoading || !generatedAudioUrl}
          >
            <Play className="w-4 h-4" />
            <span className="ml-1">Сгенерировать</span>
          </Button>
        </div>
      </div>

      {/* Выпадающее меню слоев */}
      {showLayersMenu && (
        <div className="absolute top-16 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-80" data-menu-area>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <h3 className="font-medium text-gray-900">Слои</h3>
            </div>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {canvasElements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Нет элементов на холсте</p>
              </div>
            ) : (
              canvasElements.map((element, index) => (
                <div
                  key={element.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", element.id)
                    e.dataTransfer.effectAllowed = "move"
                    setIsDraggingLayer(true)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = "move"
                  }}
                  onDrop={(e) => handleLayerDrop(e, element.id)}
                  onDragEnd={() => {
                    setIsDraggingLayer(false)
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-move transition-colors ${
                    selectedElementId === element.id
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                  onClick={() => setSelectedElementId(element.id)}
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {element.type === "avatar" ? (
                      <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 max-w-[180px]">
                      <p className="text-sm font-medium text-gray-900 truncate">{element.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {element.type === "avatar" ? "Аватар" : "Медиа"}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      <img
                        src={element.url}
                        alt={element.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-6 h-6 p-0 text-gray-400 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteElement(element.id, element.type)
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[40%] border-r bg-white flex flex-col">
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Выберите аватар</h3>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedAvatar?.id.toString() || ""}
                  onValueChange={(value) => {
                    // Если кликнули на уже выбранный аватар, сбрасываем выбор
                    if (selectedAvatar && selectedAvatar.id.toString() === value) {
                      setSelectedAvatar(null)
                    } else {
                      const avatar = readyAvatars.find((a) => a.id.toString() === value)
                      setSelectedAvatar(avatar || null)
                    }
                  }}
                >
                  <SelectTrigger className="flex-1 h-12">
                    <SelectValue placeholder="Выберите аватар">
                      {selectedAvatar && (
                        <div className="flex items-center gap-3">
                          <img
                            src={selectedAvatar.photo || "/diverse-avatars.png"}
                            alt={selectedAvatar.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span>{selectedAvatar.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {readyAvatars.map((avatar) => (
                      <SelectItem key={avatar.id} value={avatar.id.toString()}>
                        <div className="flex items-center gap-3">
                          <img
                            src={avatar.photo || "/diverse-avatars.png"}
                            alt={avatar.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span>{avatar.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAvatar && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 px-3 bg-transparent"
                    onClick={() => setSelectedAvatar(null)}
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Выберите голос</h3>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedVoice?.id.toString() || ""}
                  onValueChange={(value) => {
                    // Если кликнули на уже выбранный голос, сбрасываем выбор
                    if (selectedVoice && selectedVoice.id.toString() === value) {
                      setSelectedVoice(null)
                    } else {
                      const voice = readyVoices.find((v) => v.id.toString() === value)
                      setSelectedVoice(voice || null)
                    }
                  }}
                >
                  <SelectTrigger className="flex-1 h-12">
                    <SelectValue placeholder="Выберите голос">
                      {selectedVoice && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Volume2 className="w-4 h-4 text-purple-600" />
                          </div>
                          <span>{selectedVoice.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {readyVoices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id.toString()}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Volume2 className="w-4 h-4 text-purple-600" />
                          </div>
                          <span>{voice.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVoice && (
                  <>
                    {(selectedVoice.download_url || selectedVoice.oss_url) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-12 px-3 bg-transparent"
                        onClick={playVoice}
                        disabled={isLoadingVoice}
                      >
                        {isLoadingVoice ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
                        ) : isPlayingVoice ? (
                          <Pause className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-12 px-3 bg-transparent"
                      onClick={() => setSelectedVoice(null)}
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3 flex-1">
              <h3 className="font-medium text-gray-900">Введите текст для озвучивания</h3>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите ваш скрипт или используйте '/' для команд"
                className="min-h-[300px] resize-none text-base"
                maxLength={2500}
              />
              <div className="text-right text-sm text-muted-foreground">{text.length}/2500</div>
            </div>
          </div>
        </div>

        <div className="w-[60%] bg-gray-50 flex flex-col" data-canvas-area>
          <div className="flex-1 flex items-center justify-center p-8">
            {/* Canvas */}
            <div 
              className="relative bg-white rounded-lg overflow-hidden shadow-lg"
              onClick={(e) => {
                // Снимаем выделение при клике в область холста (включая за пределами canvas)
                if (selectedElementId && e.target === e.currentTarget) {
                  setSelectedElementId(null)
                }
              }}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="w-full h-full cursor-crosshair"
                style={{ aspectRatio: `${canvasWidth}/${canvasHeight}` }}
                onMouseDown={handleCanvasMouseDown}
              />

              {/* Background image overlay */}
              {/* {currentBackgroundImage && (
                <div className="absolute inset-0">
                  <img
                    src={currentBackgroundImage || "/placeholder.svg"}
                    alt="Background"
                    className="w-full h-full object-cover"
                  />
                </div>
              )} */}

              {/* Canvas elements overlay */}
              {canvasElements
                .filter((element) => isElementVisible(element.id))
                .map((element) => {
                  const rect = canvasRef.current?.getBoundingClientRect()
                  if (!rect) return null

                  const scaleX = rect.width / canvasWidth
                  const scaleY = rect.height / canvasHeight
                  
                  // Находим индекс элемента в оригинальном массиве для правильного z-index
                  const originalIndex = canvasElements.findIndex(el => el.id === element.id)
                  const zIndex = canvasElements.length - originalIndex // Первый элемент (index 0) = самый высокий z-index

                  return (
                    <div key={element.id}>
                      <div
                        className={`absolute cursor-move ${
                          selectedElementId === element.id ? "ring-2 ring-purple-500" : ""
                        }`}
                        style={{
                          left: `${(element.x - element.width / 2) * scaleX}px`,
                          top: `${(element.y - element.height / 2) * scaleY}px`,
                          width: `${element.width * scaleX}px`,
                          height: `${element.height * scaleY}px`,
                          zIndex: zIndex,
                        }}
                        onMouseDown={(e) => handleElementMouseDown(e, element.id, "drag")}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedElementId(element.id)
                        }}
                        onMouseEnter={() => setHoveredElementId(element.id)}
                        onMouseLeave={() => setHoveredElementId(null)}
                      >
                        <img
                          src={element.url || "/placeholder.svg"}
                          alt={element.name}
                          className="w-full h-full object-cover rounded"
                          draggable={false}
                        />
                        
                        {/* Иконка корзины при наведении */}
                        {hoveredElementId === element.id && (
                          <div
                            className="absolute top-1 left-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center cursor-pointer transition-colors z-10"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteElement(element.id, element.type)
                            }}
                          >
                            <X className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        {selectedElementId === element.id && (
                          <div
                            className="absolute bottom-0 right-0 w-3 h-3 bg-purple-500 cursor-se-resize"
                            onMouseDown={(e) => handleElementMouseDown(e, element.id, "resize")}
                          />
                        )}
                      </div>

                      {/* Coordinates display */}
                      {showCoordinates && selectedElementId === element.id && (
                        <div
                          className="absolute bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium"
                          style={{
                            left: `${(element.x - element.width / 2) * scaleX}px`,
                            top: `${(element.y + element.height / 2) * scaleY + 5}px`,
                            zIndex: zIndex + 1, // Координаты всегда выше элемента
                          }}
                        >
                          {isDragging
                            ? `${Math.round(element.x)}, ${Math.round(element.y)}`
                            : isResizing
                              ? `${Math.round(element.width)} × ${Math.round(element.height)}`
                              : `${Math.round(element.x)}, ${Math.round(element.y)}`}
                        </div>
                      )}
                    </div>
                  )
                })}

              {canvasElements.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-purple-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Выберите аватар для отображения</h3>
                  <p className="text-sm text-center max-w-xs">
                    После выбора аватара в левой панели он появится здесь и вы сможете его перемещать
                  </p>
                </div>
              )}

              {/* Coordinates display */}
              {/* {showCoordinates && selectedElementId && (
                <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                  {(() => {
                    const element = canvasElements.find((el) => el.id === selectedElementId)
                    return element ? `X: ${Math.round(element.x)}, Y: ${Math.round(element.y)}` : ""
                  })()}
                </div>
              )} */}
            </div>
          </div>

          <div className="h-32 bg-gray-900 border-t flex flex-col">
            <div className="flex items-center px-6 py-2">
              <Button
                variant="ghost"
                size="lg"
                className="text-white hover:bg-gray-700 w-12 h-12 p-0 mr-4"
                onClick={generatedAudio ? playGeneratedAudio : handlePlayGeneration}
                disabled={(!selectedAvatar || !selectedVoice || !text.trim()) && !generatedAudio}
              >
                {isGenerating ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isPlayingGenerated ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </Button>

              {selectedAvatar && (
                <div className="flex items-center gap-3 mr-4">
                  <div className="w-12 h-8 bg-gray-700 rounded flex items-center justify-center overflow-hidden border border-gray-600">
                    <img
                      src={selectedAvatar.photo || "/diverse-avatars.png"}
                      alt={selectedAvatar.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-white text-xs">1</span>
                </div>
              )}

              <div className="flex-1">
                {audioDuration > 0 && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-400 px-1 mb-1">
                      {generateTimeMarks().map((time, index) => (
                        <span key={index} className="font-mono">
                          {formatTime(time)}
                        </span>
                      ))}
                    </div>

                    <div
                      ref={imageTimelineRef}
                      className="h-6 bg-gray-800 rounded relative overflow-hidden border border-gray-600 mb-1"
                    >
                      {/* Временные метки */}
                      {generateTimeMarks().map((time, index) => (
                        <div
                          key={index}
                          className="absolute top-0 w-px h-full bg-gray-500/50"
                          style={{ left: `${(time / audioDuration) * 100}%` }}
                        />
                      ))}

                      {/* Элементы изображений */}
                      {imageTrackItems.map((item) => {
                        // Проверяем, является ли этот элемент активным
                        const isActive = selectedElementId === `photo-${item.id}`
                        return (
                        <div
                          key={item.id}
                          className={`absolute top-0 h-full rounded cursor-move flex items-center justify-center overflow-hidden ${
                            isActive 
                              ? "bg-gradient-to-r from-purple-500 to-purple-600 border-2 border-purple-400 shadow-lg" 
                              : "bg-gradient-to-r from-orange-500 to-red-500 border border-orange-400"
                          }`}
                          style={{
                            left: `${(item.startTime / audioDuration) * 100}%`,
                            width: `${(item.duration / audioDuration) * 100}%`,
                            minWidth: "20px",
                            zIndex: isActive ? 20 : 10, // Выбранный элемент поверх остальных
                          }}
                          onMouseDown={(e) => handleImageItemMouseDown(e, item.id, "drag")}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedElementId(`photo-${item.id}`)
                          }}
                        >
                          <img
                            src={item.url || "/placeholder.svg"}
                            alt={item.name}
                            className="w-full h-full object-cover opacity-80"
                          />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <span className="text-white text-xs font-medium truncate px-1">
                              {item.name.split(".")[0]}
                            </span>
                          </div>

                          {/* Ручки для изменения размера */}
                          <div
                            className={`absolute left-0 top-0 w-2 h-full cursor-ew-resize transition-opacity ${
                              isActive 
                                ? "bg-purple-300 opacity-100" 
                                : "bg-orange-300 opacity-0 hover:opacity-100"
                            }`}
                            onMouseDown={(e) => handleImageItemMouseDown(e, item.id, "resize-left")}
                          />
                          <div
                            className={`absolute right-0 top-0 w-2 h-full cursor-ew-resize transition-opacity ${
                              isActive 
                                ? "bg-purple-300 opacity-100" 
                                : "bg-orange-300 opacity-0 hover:opacity-100"
                            }`}
                            onMouseDown={(e) => handleImageItemMouseDown(e, item.id, "resize-right")}
                          />
                        </div>
                        )
                      })}

                      {/* Курсор времени */}
                      <div
                        className="absolute top-0 w-0.5 h-full bg-white shadow-lg transition-all duration-100 pointer-events-none z-10"
                        style={{ left: `${(currentTime / audioDuration) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Аудио таймлайн */}
                {generatedAudio && audioDuration > 0 ? (
                  <div
                    ref={timelineRef}
                    className="h-8 bg-gray-700 rounded relative overflow-hidden border border-gray-600 cursor-pointer select-none"
                    onClick={handleTimelineClick}
                    onMouseDown={handleTimelineDragStart}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-yellow-500/20 to-red-500/20" />

                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-100"
                      style={{ width: `${(currentTime / audioDuration) * 100}%` }}
                    />

                    <div
                      className="absolute top-0 w-1 h-full bg-white shadow-lg transition-all duration-100"
                      style={{ left: `${(currentTime / audioDuration) * 100}%` }}
                    >
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full shadow-md border border-gray-300" />
                    </div>

                    {generateTimeMarks().map((time, index) => (
                      <div
                        key={index}
                        className="absolute top-0 w-px h-full bg-gray-500/50"
                        style={{ left: `${(time / audioDuration) * 100}%` }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-8 bg-gray-700 rounded relative overflow-hidden border border-gray-600 flex items-center justify-center">
                    <div className="text-gray-400 text-xs font-mono">00:00.00 / 00:00.00</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showLayersDropdown && (
            <div className="absolute top-16 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50" data-menu-area>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gray-600" />
                  <h3 className="font-medium text-gray-900">Слои</h3>
                </div>
              </div>
              <div className="p-2 max-h-80 overflow-y-auto">
                {canvasElements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">Нет элементов на холсте</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {canvasElements
                      .slice()
                      .reverse()
                      .map((element, index) => (
                        <div
                          key={element.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            selectedElementId === element.id
                              ? "bg-purple-50 border-purple-200"
                              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                          } ${isDraggingLayer ? "cursor-grabbing" : "cursor-grab"}`}
                          draggable
                          onDragStart={(e) => handleLayerDragStart(e, element.id)}
                          onDragOver={handleLayerDragOver}
                          onDrop={(e) => handleLayerDrop(e, element.id)}
                          onDragEnd={handleLayerDragEnd}
                          onClick={() => setSelectedElementId(element.id)}
                        >
                          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          {element.type === "avatar" ? (
                            <User className="w-5 h-5 text-purple-600 flex-shrink-0" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                          <img
                            src={element.url || "/placeholder.svg"}
                            alt={element.name}
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{element.name}</p>
                            <p className="text-xs text-gray-500">
                              {Math.round(element.width)} × {Math.round(element.height)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto text-gray-400 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteElement(element.id, element.type)
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
