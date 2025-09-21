"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Upload, Mic, CloudUpload, AudioWaveform as Waveform, Play, Pause, Square, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onVoiceUploaded?: (tempVoice: { name: string; status: string }) => void
}

export function VoiceUploadModal({ isOpen, onClose, onVoiceUploaded }: VoiceUploadModalProps) {
  const [voiceName, setVoiceName] = useState("")
  const [selectedMethod, setSelectedMethod] = useState<"upload" | "record" | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (selectedMethod === "record") {
      checkMicrophonePermission()
    }
  }, [selectedMethod])

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [])

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setHasPermission(true)
      stream.getTracks().forEach((track) => track.stop()) // Останавливаем поток после проверки
    } catch (error) {
      console.error("Ошибка доступа к микрофону:", error)
      setHasPermission(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        setRecordedBlob(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()

      setIsRecording(true)
      setRecordingTime(0)

      // Запускаем таймер
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      console.log("[v0] Запись голоса начата успешно")
    } catch (error) {
      console.error("[v0] Ошибка при начале записи:", error)
      alert("Не удалось получить доступ к микрофону. Проверьте разрешения браузера.")
      setIsRecording(false)
      setRecordingTime(0)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const playRecording = () => {
    if (recordedBlob) {
      const audioUrl = URL.createObjectURL(recordedBlob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }

      audio.play()
      setIsPlaying(true)
    }
  }

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const deleteRecording = () => {
    setRecordedBlob(null)
    setRecordingTime(0)
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
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
      const file = e.dataTransfer.files[0]
      if (validateFileType(file)) {
        setSelectedFile(file)
      }
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (validateFileType(file)) {
        setSelectedFile(file)
      }
    }
  }

  const validateFileType = (file: File): boolean => {
    const allowedTypes = ["audio/wav", "audio/wave", "audio/mpeg", "audio/mp3"]
    const allowedExtensions = [".wav", ".mp3"]

    const isValidType = allowedTypes.includes(file.type.toLowerCase())
    const isValidExtension = allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))

    if (!isValidType && !isValidExtension) {
      alert("Поддерживаются только WAV и MP3 файлы.")
      return false
    }

    return true
  }

  const handleUpload = async () => {
    if (!voiceName.trim()) {
      alert("Пожалуйста, введите название голоса")
      return
    }

    if (selectedMethod === "upload" && !selectedFile) {
      alert("Пожалуйста, выберите аудиофайл")
      return
    }

    if (selectedMethod === "record" && !recordedBlob) {
      alert("Пожалуйста, запишите голос")
      return
    }

    setIsUploading(true)

    try {
      console.log("[v0] Начинаем загрузку голоса...")

      const tempVoice = {
        name: voiceName.trim(),
        status: "loading",
      }

      // Создаем FormData для отправки
      const formData = new FormData()
      formData.append("voice_name", voiceName.trim())

      if (selectedMethod === "upload" && selectedFile) {
        formData.append("voice_file", selectedFile)
      } else if (selectedMethod === "record" && recordedBlob) {
        const recordedFile = new File([recordedBlob], `${voiceName.trim()}_recording.wav`, { type: "audio/wav" })
        formData.append("voice_file", recordedFile)
      }

      console.log("[v0] Отправляем данные на вебхук голосов...")

      // Отправляем через API роут (будет создан в следующей задаче)
      const response = await fetch("/api/upload-voice", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Ошибка от API роута:", response.status, errorText)
        throw new Error(`Ошибка загрузки: ${response.status}`)
      }

      const result = await response.json()
      console.log("[v0] Успешная загрузка голоса:", result)

      if (onVoiceUploaded) {
        onVoiceUploaded(tempVoice)
      }

      console.log("[v0] Голос обработан:", voiceName.trim())

      handleCancel()
    } catch (error) {
      console.error("[v0] Ошибка при загрузке голоса:", error)
      alert(`Ошибка при загрузке: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    if (isRecording) {
      stopRecording()
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
    }

    onClose()
    setVoiceName("")
    setSelectedMethod(null)
    setSelectedFile(null)
    setRecordedBlob(null)
    setRecordingTime(0)
    setIsPlaying(false)
    setHasPermission(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold">Добавить голос</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Поле для названия голоса */}
          <div className="space-y-2">
            <Label htmlFor="voice-name">Название голоса</Label>
            <Input
              id="voice-name"
              placeholder="Введите название для вашего голоса"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
            />
          </div>

          {/* Выбор метода */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Выберите способ добавления голоса</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Загрузка файла */}
              <div
                className={cn(
                  "border-2 rounded-lg p-4 cursor-pointer transition-all hover:border-blue-300",
                  selectedMethod === "upload" ? "border-blue-500 bg-blue-50" : "border-border",
                )}
                onClick={() => setSelectedMethod("upload")}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
                    <div className="relative">
                      <CloudUpload className="w-7 h-7 text-blue-600" />
                      <Waveform className="w-3 h-3 text-blue-600 absolute -bottom-1 -right-1" />
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-600 mb-1">Загрузить аудиофайл</div>
                    <div className="text-xs text-muted-foreground">
                      Клонируйте свой голос, загрузив локальный аудиофайл. Чем чище аудио и чем больше образцов вы
                      предоставите, тем выше качество клонированного голоса
                    </div>
                  </div>
                </div>
              </div>

              {/* Запись голоса */}
              <div
                className={cn(
                  "border-2 rounded-lg p-4 cursor-pointer transition-all hover:border-purple-300",
                  selectedMethod === "record" ? "border-purple-500 bg-purple-50" : "border-border",
                )}
                onClick={() => setSelectedMethod("record")}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Mic className="w-7 h-7 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-purple-600 mb-1">Записать образец текста</div>
                    <div className="text-xs text-muted-foreground">
                      Создайте свой собственный клонированный голос, записав образец длиннее одной минуты. Чем чище
                      образец, тем выше сходство в клонированном голосе
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Область загрузки файла */}
          {selectedMethod === "upload" && (
            <div className="space-y-3">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-border",
                  "hover:border-primary/50",
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-10 h-10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground mb-1">Перетащите аудиофайл для загрузки</div>
                    <div className="text-sm text-muted-foreground">Загружайте WAV или MP3 файлы</div>
                  </div>
                  <Button variant="outline" onClick={() => document.getElementById("audio-file-input")?.click()}>
                    Выбрать файл
                  </Button>
                  <input
                    id="audio-file-input"
                    type="file"
                    accept="audio/wav,audio/mp3,audio/mpeg"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>

              {selectedFile && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{selectedFile.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} МБ
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Область записи голоса */}
          {selectedMethod === "record" && (
            <div className="space-y-3">
              {hasPermission === false && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-800 text-sm">
                    Не удалось получить доступ к микрофону. Пожалуйста, разрешите доступ к микрофону в настройках
                    браузера.
                  </div>
                </div>
              )}

              <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg">
                <div className="flex flex-col items-center space-y-3">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                      isRecording ? "bg-red-100 animate-pulse" : "bg-purple-100",
                    )}
                  >
                    <Mic className={cn("w-8 h-8", isRecording ? "text-red-600" : "text-purple-600")} />
                  </div>

                  <div className="text-center">
                    <div className="font-medium text-base mb-1">
                      {isRecording ? "Идет запись..." : recordedBlob ? "Запись готова" : "Готов к записи"}
                    </div>
                    <div className="text-xl font-mono text-purple-600">{formatTime(recordingTime)}</div>
                    {recordingTime > 0 && recordingTime < 60 && (
                      <div className="text-xs text-orange-600 mt-1">
                        Рекомендуется записать минимум 1 минуту для лучшего качества
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap justify-center">
                    {!isRecording && !recordedBlob && (
                      <Button
                        onClick={startRecording}
                        disabled={hasPermission === false}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Начать запись
                      </Button>
                    )}

                    {isRecording && (
                      <Button onClick={stopRecording} variant="destructive">
                        <Square className="w-4 h-4 mr-2" />
                        Остановить
                      </Button>
                    )}

                    {recordedBlob && !isRecording && (
                      <>
                        <Button onClick={isPlaying ? pausePlayback : playRecording} variant="outline" size="sm">
                          {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                          {isPlaying ? "Пауза" : "Воспроизвести"}
                        </Button>
                        <Button onClick={deleteRecording} variant="outline" size="sm">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Удалить
                        </Button>
                        <Button
                          onClick={startRecording}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          size="sm"
                        >
                          <Mic className="w-4 h-4 mr-1" />
                          Записать заново
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
              Отмена
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                !voiceName.trim() ||
                !selectedMethod ||
                (selectedMethod === "upload" && !selectedFile) ||
                (selectedMethod === "record" && !recordedBlob) ||
                isUploading
              }
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
