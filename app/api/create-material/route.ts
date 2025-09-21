import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 60 // 60 секунд для обработки материалов
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Получаем FormData из запроса
    const formData = await request.formData()

    console.log("[v0] API: Получены данные материала для отправки на вебхук")

    const response = await fetch("https://n8n.neurotalk.pro/webhook-test/1b385059-43c2-4e14-b783-cfda2ea10346", {
      method: "POST",
      body: formData,
    })

    console.log("[v0] API: Ответ от вебхука материалов:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (response.ok) {
      const responseText = await response.text()
      return NextResponse.json({
        success: true,
        message: "Материал успешно отправлен на вебхук",
        webhookResponse: responseText,
      })
    } else {
      const errorText = await response.text().catch(() => "Не удалось получить текст ошибки")
      console.error("[v0] API: Ошибка от вебхука материалов:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: `Ошибка вебхука материалов: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      )
    }
  } catch (error) {
    console.error("[v0] API: Ошибка при отправке материала на вебхук:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Внутренняя ошибка сервера при отправке материала",
        details: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 },
    )
  }
}
