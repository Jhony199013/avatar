"use client"

import React, { useState, useEffect, useMemo } from "react"
import { FileText, Trash2 } from "lucide-react"
import { MaterialCreator } from "@/components/material-creator"
import { supabase, type PhotoAvatar, type Voice, type Video } from "@/lib/supabase"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface VideoFile {
  name: string
  url: string
  size?: number
  lastModified?: Date
}

// Мемоизированный компонент для готового видео
const VideoCard = React.memo(({ video, onDelete }: { video: VideoFile, onDelete: (videoName: string) => void }) => {
  const videoTitle = video.name.replace('.mp4', '')
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden relative group">
      <div className="aspect-video bg-gray-100 relative">
        <video
          key={video.name}
          className="w-full h-full object-cover"
          poster=""
          controls
          preload="metadata"
        >
          <source src={video.url} type="video/mp4" />
          Ваш браузер не поддерживает видео.
        </video>
        {/* Иконка удаления */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(video.name)
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 transition-opacity duration-200 z-50"
          title="Удалить видео"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate mb-2">{videoTitle}</h3>
      </div>
    </div>
  )
})

// Мемоизированный компонент для видео в процессе загрузки
const PendingVideoCard = React.memo(({ videoTitle, progress, onDelete }: { videoTitle: string, progress: number, onDelete: (videoName: string) => void }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden relative group">
      <div className="aspect-video bg-gray-100 relative flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <div className="text-gray-600 text-sm">Генерация видео...</div>
        </div>
        {/* Иконка удаления */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(videoTitle)
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 transition-opacity duration-200"
          title="Удалить видео"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate mb-2">{videoTitle}</h3>
        <div className="text-sm text-gray-500 mb-2">Загрузка</div>
        {/* Прогресс-бар */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-400 mt-1 text-right">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  )
})

function MaterialsPage() {
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false)
  const [avatars, setAvatars] = useState<PhotoAvatar[]>([])
  const [voices, setVoices] = useState<Voice[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([])
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)
  const [pendingVideos, setPendingVideos] = useState<string[]>([])
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({})
  const [videoTimers, setVideoTimers] = useState<Record<string, NodeJS.Timeout>>({})
  const [videoStartTimes, setVideoStartTimes] = useState<Record<string, number>>({})
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{isOpen: boolean, videoTitle: string}>({isOpen: false, videoTitle: ''})

  // Функция для запуска прогресса видео
  const startVideoProgress = (videoTitle: string) => {
    // Проверяем, не запущен ли уже таймер для этого видео
    if (videoTimers[videoTitle]) {
      return
    }
    
    const now = Date.now()
    const startTime = videoStartTimes[videoTitle] || now
    
    // Вычисляем текущий прогресс на основе времени
    const elapsedSeconds = (now - startTime) / 1000
    const calculatedProgress = Math.min(99, (elapsedSeconds / 180) * 99) // 180 секунд = 99%
    
    // Устанавливаем прогресс
    setVideoProgress(prev => {
      if (prev[videoTitle] === undefined || prev[videoTitle] < calculatedProgress) {
        return { ...prev, [videoTitle]: calculatedProgress }
      }
      return prev
    })
    
    // Сохраняем время начала если его еще нет
    if (!videoStartTimes[videoTitle]) {
      setVideoStartTimes(prev => ({ ...prev, [videoTitle]: startTime }))
      // Сохраняем в localStorage
      localStorage.setItem(`videoStartTime_${videoTitle}`, startTime.toString())
    }
    
    // Создаем таймер для увеличения прогресса до 99% за 3 минуты (180 секунд)
    const timer = setInterval(() => {
      setVideoProgress(prev => {
        const currentProgress = prev[videoTitle] || 0
        if (currentProgress < 99) {
          // Увеличиваем прогресс на 0.55% каждую секунду (99% / 180 секунд)
          const newProgress = Math.min(99, currentProgress + 0.55)
          return { ...prev, [videoTitle]: newProgress }
        }
        return prev
      })
    }, 1000) // Обновляем каждую секунду
    
    setVideoTimers(prev => ({ ...prev, [videoTitle]: timer }))
  }

  // Функция для остановки прогресса видео
  const stopVideoProgress = (videoTitle: string) => {
    const timer = videoTimers[videoTitle]
    if (timer) {
      clearInterval(timer)
      setVideoTimers(prev => {
        const newTimers = { ...prev }
        delete newTimers[videoTitle]
        return newTimers
      })
    }
    
    // Очищаем время начала
    setVideoStartTimes(prev => {
      const newStartTimes = { ...prev }
      delete newStartTimes[videoTitle]
      return newStartTimes
    })
    localStorage.removeItem(`videoStartTime_${videoTitle}`)
  }

  // Функция для установки прогресса на 100%
  const setVideoComplete = (videoTitle: string) => {
    stopVideoProgress(videoTitle)
    setVideoProgress(prev => ({ ...prev, [videoTitle]: 100 }))
  }

  // Функция для проверки существования видео
  const checkVideoExists = async (videoTitle: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/check-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoTitle }),
      })
      
      const data = await response.json()
      return data.exists
    } catch (error) {
      console.error('Ошибка при проверке видео:', error)
      return false
    }
  }


  const fetchVideoFiles = async () => {
    try {
      setIsLoadingVideos(true)
      
      // Загружаем видео из базы данных
      const { data: videosData, error: videosError } = await supabase
        .from("video")
        .select("*")
        .order("created_at", { ascending: false })

      if (videosError) {
        console.error("[v0] Ошибка загрузки видео:", videosError)
      } else {
        setVideos(videosData || [])
        
        // Проверяем существование видеофайлов для каждого названия из базы
        const existingVideos: VideoFile[] = []
        const stillPending: string[] = []
        
        for (const video of videosData || []) {
          const exists = await checkVideoExists(video.video_name)
          if (exists) {
            existingVideos.push({
              name: video.video_name,
              url: `https://s3.regru.cloud/avatars13/video_avatars/${encodeURIComponent(video.video_name)}`
            })
          } else {
            stillPending.push(video.video_name)
            // Запускаем прогресс для видео, которое еще не найдено
            if (!videoProgress[video.video_name] && !videoTimers[video.video_name]) {
              startVideoProgress(video.video_name)
            }
          }
        }
        
        // Обновляем только если есть изменения, чтобы избежать перерендеринга
        setVideoFiles(prev => {
          const prevNames = prev.map(v => v.name).sort()
          const newNames = existingVideos.map(v => v.name).sort()
          
          // Если списки одинаковые, не обновляем
          if (prevNames.length === newNames.length && 
              prevNames.every((name, index) => name === newNames[index])) {
            return prev
          }
          
          return existingVideos
        })
        
        setPendingVideos(prev => {
          const prevSorted = [...prev].sort()
          const newSorted = [...stillPending].sort()
          
          // Если списки одинаковые, не обновляем
          if (prevSorted.length === newSorted.length && 
              prevSorted.every((name, index) => name === newSorted[index])) {
            return prev
          }
          
          return stillPending
        })
      }
    } catch (error) {
      console.error("[v0] Ошибка при загрузке видеофайлов:", error)
    } finally {
      setIsLoadingVideos(false)
    }
  }

  // Загружаем данные при загрузке компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загружаем аватары
        const { data: avatarsData, error: avatarsError } = await supabase
          .from("photo_avatars")
          .select("*")
          .order("created_at", { ascending: false })

        if (avatarsError) {
          console.error("[v0] Ошибка загрузки аватаров:", avatarsError)
        } else {
          setAvatars(avatarsData || [])
        }

        // Загружаем голоса
        const { data: voicesData, error: voicesError } = await supabase
          .from("voices")
          .select("*")
          .order("created_at", { ascending: false })

        if (voicesError) {
          console.error("[v0] Ошибка загрузки голосов:", voicesError)
        } else {
          setVoices(voicesData || [])
        }

        // Загружаем видеофайлы
        await fetchVideoFiles()
      } catch (error) {
        console.error("[v0] Ошибка при загрузке данных:", error)
      }
    }

    fetchData()
  }, [])

  // Периодическая проверка видео каждые 30 секунд (только для pending видео)
  useEffect(() => {
    if (pendingVideos.length === 0) return

    const interval = setInterval(() => {
      // Проверяем только pending видео, чтобы не сбрасывать воспроизведение готовых
      const checkPendingVideos = async () => {
        const existingVideos: VideoFile[] = []
        const stillPending: string[] = []
        
        for (const videoTitle of pendingVideos) {
          const exists = await checkVideoExists(videoTitle)
          if (exists) {
            existingVideos.push({
              name: videoTitle,
              url: `https://s3.regru.cloud/avatars13/video_avatars/${encodeURIComponent(videoTitle)}`
            })
            setVideoComplete(videoTitle)
          } else {
            stillPending.push(videoTitle)
          }
        }
        
        // Обновляем только если есть изменения
        if (existingVideos.length > 0) {
          setVideoFiles(prev => [...prev, ...existingVideos])
        }
        
        if (stillPending.length !== pendingVideos.length) {
          setPendingVideos(stillPending)
        }
      }
      
      checkPendingVideos()
    }, 30000) // 30 секунд

    return () => clearInterval(interval)
  }, [pendingVideos])

  // Очистка таймеров при размонтировании компонента
  useEffect(() => {
    return () => {
      Object.values(videoTimers).forEach(timer => {
        if (timer) clearInterval(timer)
      })
    }
  }, [videoTimers])


  const handleMaterialCreated = async (videoTitle?: string) => {
    setIsMaterialModalOpen(false)
    
    if (videoTitle) {
      try {
        // Записываем видео в базу данных
        const { data, error } = await supabase
          .from("video")
          .insert([{ video_name: videoTitle }])
          .select()

        if (error) {
          console.error("[v0] Ошибка при записи видео в базу данных:", error)
        } else {
          console.log("[v0] Видео успешно записано в базу данных:", data)
          
          // Обновляем список видео
          setVideos(prev => [...prev, ...(data || [])])
          
          // Добавляем в pending (ожидающие загрузки)
          setPendingVideos(prev => [...prev, videoTitle])
          
          // Запускаем прогресс для нового видео
          startVideoProgress(videoTitle)
        }
      } catch (error) {
        console.error("[v0] Ошибка при записи видео в базу данных:", error)
      }
    } else {
      console.log("[v0] Материал успешно создан")
    }
  }

  const showDeleteConfirm = (e: React.MouseEvent, videoTitle: string) => {
    // Предотвращаем перезагрузку страницы
    e.preventDefault()
    e.stopPropagation()
    
    // Показываем попап подтверждения
    setDeleteConfirmModal({isOpen: true, videoTitle})
  }

  const handleDeleteVideo = async (videoTitle: string) => {
    try {
      // Удаляем из базы данных
      const { error } = await supabase
        .from("video")
        .delete()
        .eq("video_name", videoTitle)

      if (error) {
        console.error("[v0] Ошибка при удалении видео из базы данных:", error)
      } else {
        console.log("[v0] Видео успешно удалено из базы данных:", videoTitle)
        
        // Останавливаем прогресс и очищаем таймеры
        stopVideoProgress(videoTitle)
        setVideoProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[videoTitle]
          return newProgress
        })
        
        // Удаляем из состояния
        setVideos(prev => prev.filter(video => video.video_name !== videoTitle))
        setPendingVideos(prev => prev.filter(title => title !== videoTitle))
        setVideoFiles(prev => prev.filter(video => video.name !== videoTitle))
      }
    } catch (error) {
      console.error("[v0] Ошибка при удалении видео:", error)
    }
    
    // Закрываем попап
    setDeleteConfirmModal({isOpen: false, videoTitle: ''})
  }

  const cancelDelete = () => {
    setDeleteConfirmModal({isOpen: false, videoTitle: ''})
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
              className="text-3xl font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Голоса
            </Link>
            <Link
              href="/materials"
              className="text-3xl font-bold text-foreground"
            >
              Материал
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMaterialModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Добавить материал
            </button>
          </div>
        </div>

        {/* Контент материалов */}
        {isLoadingVideos ? (
          <div className="text-center py-20">
            <div className="text-muted-foreground text-lg">Загрузка материалов...</div>
          </div>
        ) : videoFiles.length > 0 || pendingVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {/* Отображаем готовые видео */}
            {videoFiles.map((video) => (
              <VideoCard 
                key={`ready-${video.name}`}
                video={video} 
                onDelete={(videoName) => showDeleteConfirm({ preventDefault: () => {}, stopPropagation: () => {} } as any, videoName)} 
              />
            ))}
            
            {/* Отображаем видео в процессе загрузки */}
            {pendingVideos.map((videoTitle) => {
              const progress = videoProgress[videoTitle] || 0
              return (
                <PendingVideoCard 
                  key={`pending-${videoTitle}`}
                  videoTitle={videoTitle}
                  progress={progress}
                  onDelete={(videoName) => showDeleteConfirm({ preventDefault: () => {}, stopPropagation: () => {} } as any, videoName)}
                />
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-muted-foreground text-lg mb-4">У вас нет материалов</div>
            <div className="text-muted-foreground text-sm">Начните с создания нового материала</div>
          </div>
        )}

        <MaterialCreator
          isOpen={isMaterialModalOpen}
          onClose={() => setIsMaterialModalOpen(false)}
          avatars={avatars}
          voices={voices}
          onMaterialCreated={handleMaterialCreated}
        />

        {/* Попап подтверждения удаления */}
        <AlertDialog open={deleteConfirmModal.isOpen} onOpenChange={(open) => !open && cancelDelete()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить видео</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить видео <strong>{deleteConfirmModal.videoTitle.replace('.mp4', '')}</strong>?
                Это действие нельзя будет отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>Нет</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteVideo(deleteConfirmModal.videoTitle)}
                className="bg-red-600 hover:bg-red-700"
              >
                Да, удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export default MaterialsPage
