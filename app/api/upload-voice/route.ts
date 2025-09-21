import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 60 // 60 секунд для обработки больших аудиофайлов
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Получаем FormData из запроса
    const formData = await request.formData()

    console.log("[v0] API: Получены данные голоса для отправки на вебхук")

    const response = await fetch("https://n8n.neurotalk.pro/webhook/2ea00915-1635-4d47-a7d3-c8cf7ae96e95", {
      method: "POST",
      body: formData,
    })

    console.log("[v0] API: Ответ от вебхука голосов:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (response.ok) {
      const responseText = await response.text()
      return NextResponse.json({
        success: true,
        message: "Голос успешно отправлен на вебхук",
        webhookResponse: responseText,
      })
    } else {
      const errorText = await response.text().catch(() => "Не удалось получить текст ошибки")
      console.error("[v0] API: Ошибка от вебхука голосов:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: `Ошибка вебхука голосов: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      )
    }
  } catch (error) {
    console.error("[v0] API: Ошибка при отправке голоса на вебхук:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Внутренняя ошибка сервера при отправке голоса",
        details: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 },
    )
  }
}
