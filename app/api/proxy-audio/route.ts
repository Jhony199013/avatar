import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 60 // 60 секунд для загрузки больших аудиофайлов
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { audioUrl } = await request.json()

    if (!audioUrl) {
      return NextResponse.json({ error: "audioUrl is required" }, { status: 400 })
    }

    console.log("[v0] API: Проксируем загрузку аудио:", audioUrl)

    // Загружаем аудиофайл на сервере (без CORS ограничений)
    const response = await fetch(audioUrl)
    
    if (!response.ok) {
      console.error("[v0] API: Ошибка загрузки аудио:", response.status, response.statusText)
      return NextResponse.json(
        { error: `Failed to fetch audio: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const audioBuffer = await response.arrayBuffer()
    console.log("[v0] API: Аудио загружено, размер:", audioBuffer.byteLength, "байт")

    // Определяем правильный MIME тип на основе URL
    let contentType = 'audio/mpeg' // по умолчанию
    
    if (audioUrl.includes('.wav')) {
      contentType = 'audio/mpeg' // Для wav используем audio/mpeg
    } else if (audioUrl.includes('.mp3')) {
      contentType = 'audio/mpeg' // Для mp3 используем audio/mpeg
    } else if (audioUrl.includes('.m4a')) {
      contentType = 'audio/mp4'
    } else if (audioUrl.includes('.ogg')) {
      contentType = 'audio/ogg'
    } else if (audioUrl.includes('.aac')) {
      contentType = 'audio/aac'
    }
    
    console.log("[v0] API: Установлен Content-Type:", contentType, "для URL:", audioUrl)

    // Возвращаем аудиофайл как blob
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("[v0] API: Ошибка при проксировании аудио:", error)
    return NextResponse.json(
      { error: "Internal server error while fetching audio" },
      { status: 500 }
    )
  }
}
