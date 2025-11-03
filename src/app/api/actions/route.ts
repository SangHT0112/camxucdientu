import { NextResponse } from "next/server"
import db from "@/lib/db"
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"

// Kiểu dữ liệu cho một hành động
interface Action extends RowDataPacket {
  id: number
  action_name: string
  emotion_name: string
  icon: string
}

// Lấy danh sách hành động (có thể lọc theo emotion_id)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const emotionId = searchParams.get("emotion_id")

    let query = `
      SELECT a.id, a.action_name, e.label AS emotion_name, a.icon 
      FROM actions a
      JOIN emotions e ON a.emotion_id = e.id
    `
    const params: (string | number)[] = []

    if (emotionId) {
      query += " WHERE a.emotion_id = ?"
      params.push(Number(emotionId))
    }

    const [rows] = await db.query<Action[]>(query, params)
    return NextResponse.json(rows)
  } catch (error) {
    console.error("❌ Lỗi GET /api/actions:", error)
    return NextResponse.json({ error: "Lỗi lấy danh sách hành động" }, { status: 500 })
  }
}

// Thêm hành động mới
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      emotion_id: number
      action_name: string
      icon?: string
    }

    if (!body.emotion_id || !body.action_name) {
      return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 })
    }

    const [result] = await db.query<ResultSetHeader>(
      "INSERT INTO actions (emotion_id, action_name, icon) VALUES (?, ?, ?)",
      [body.emotion_id, body.action_name, body.icon ?? null]
    )

    return NextResponse.json({
      message: "✅ Thêm hành động thành công",
      insertedId: result.insertId,
    })
  } catch (error) {
    console.error("❌ Lỗi POST /api/actions:", error)
    return NextResponse.json({ error: "Lỗi thêm hành động" }, { status: 500 })
  }
}
