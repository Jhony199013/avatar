import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PUT(request: NextRequest) {
  try {
    const { id, name } = await request.json()
    
    if (!id || !name) {
      return NextResponse.json({ error: "ID и название аватара обязательны" }, { status: 400 })
    }

    // Обновляем название аватара в базе данных
    const { data, error } = await supabase
      .from("photo_avatars")
      .update({ name })
      .eq("id", id)
      .select()

    if (error) {
      console.error("Ошибка при обновлении названия аватара:", error)
      return NextResponse.json({ error: "Ошибка при обновлении названия аватара" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: "Название аватара успешно обновлено" 
    })
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
