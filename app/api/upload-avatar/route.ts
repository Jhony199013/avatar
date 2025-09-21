import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 60 // 60 секунд для обработки больших файлов
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Получаем FormData из запроса
    const formData = await request.formData()

    console.log("[v0] API: Получены данные для отправки на вебхук")

    // Отправляем данные на внешний вебхук
    const response = await fetch("https://n8n.neurotalk.pro/webhook/35db956f-489a-40a0-9aa9-c72c8d1e647a", {
      method: "POST",
      body: formData,
    })

    console.log("[v0] API: Ответ от вебхука:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (response.ok) {
      const responseText = await response.text()
      return NextResponse.json({
        success: true,
        message: "Данные успешно отправлены на вебхук",
        webhookResponse: responseText,
      })
    } else {
      const errorText = await response.text().catch(() => "Не удалось получить текст ошибки")
      console.error("[v0] API: Ошибка от вебхука:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: `Ошибка вебхука: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      )
    }
  } catch (error) {
    console.error("[v0] API: Ошибка при отправке на вебхук:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Внутренняя ошибка сервера при отправке данных",
        details: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 },
    )
  }
}
