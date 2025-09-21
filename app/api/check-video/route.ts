import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { videoTitle } = await request.json()
    
    if (!videoTitle) {
      return NextResponse.json({ error: "Название видео не указано" }, { status: 400 })
    }

    // Формируем URL для проверки видео в S3
    const videoUrl = `https://s3.regru.cloud/avatars13/video_avatars/${encodeURIComponent(videoTitle)}`
    
    try {
      // Проверяем существование файла
      const response = await fetch(videoUrl, { method: 'HEAD' })
      
      if (response.ok) {
        return NextResponse.json({ 
          exists: true, 
          url: videoUrl,
          title: videoTitle 
        })
      } else {
        return NextResponse.json({ 
          exists: false, 
          url: videoUrl,
          title: videoTitle 
        })
      }
    } catch (error) {
      console.error("Ошибка при проверке видео:", error)
      return NextResponse.json({ 
        exists: false, 
        url: videoUrl,
        title: videoTitle,
        error: "Ошибка при проверке файла"
      })
    }
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}