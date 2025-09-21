import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const fileName = formData.get("fileName") as string
    const avatarName = formData.get("avatarName") as string
    const uuid = formData.get("uuid") as string

    if (!file || !fileName || !avatarName || !uuid) {
      return NextResponse.json({ success: false, error: "Отсутствуют обязательные поля" }, { status: 400 })
    }

    console.log(`[SERVER] Загружаем файл ${fileName} в S3 бакет avatars13`)

    // Подготавливаем данные для загрузки в S3
    const s3FormData = new FormData()
    s3FormData.append("file", file)

    // Загружаем в S3 reg.ru
    const s3Response = await fetch(`https://s3.regru.cloud/avatars13/${fileName}`, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        // Здесь нужно будет добавить авторизационные заголовки для S3
        // 'Authorization': 'AWS4-HMAC-SHA256 ...',
        // 'X-Amz-Date': new Date().toISOString(),
      },
    })

    if (!s3Response.ok) {
      const errorText = await s3Response.text()
      console.error(`[SERVER] Ошибка S3:`, errorText)
      return NextResponse.json(
        { success: false, error: `Ошибка S3: ${s3Response.status} ${s3Response.statusText}` },
        { status: 500 },
      )
    }

    const s3Url = `https://s3.regru.cloud/avatars13/${fileName}`

    console.log(`[SERVER] Файл ${fileName} успешно загружен в S3:`, s3Url)

    return NextResponse.json({
      success: true,
      fileName,
      s3Url,
      avatarName,
      uuid,
      message: "Файл успешно загружен в S3",
    })
  } catch (error) {
    console.error("[SERVER] Ошибка при загрузке в S3:", error)
    return NextResponse.json({ success: false, error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
