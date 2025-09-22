import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://base.neurotalk.pro"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUyODcyNDAwLCJleHAiOjE5MTA2Mzg4MDB9.X_cIaZUuaPLipP5tBiV9w6oWwzRhmOvUXAVZTaKq79o"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface PhotoAvatar {
  id: number // bigint в базе данных
  uuid: string // UUID для идентификации аватара
  photo: string | null // ссылка на изображение
  status: "processing" | "done" | "error"
  name: string
  hey_gen_id: string | null
  created_at: string
}

export interface Voice {
  id: number // bigint в базе данных
  uuid: string // UUID для идентификации голоса
  oss_url: string | null // ссылка на аудиофайл
  download_url: string | null // альтернативная ссылка на аудиофайл
  status: "processing" | "done" | "error"
  name: string
  created_at: string
}

export interface Video {
  id: number // bigint в базе данных
  video_name: string // название видео
  created_at: string
}
