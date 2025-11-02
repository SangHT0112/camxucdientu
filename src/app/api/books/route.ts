import { NextResponse } from "next/server"
import db from "@/lib/db"
import type { RowDataPacket } from "mysql2/promise"

interface BookRow extends RowDataPacket {
  id: number
  name: string
  applicable_for: string
  publisher: string
  created_at: Date
}

export async function GET() {
  try {
    const [rows] = await db.query<BookRow[]>(`
      SELECT id, name, applicable_for, publisher, created_at
      FROM books
      ORDER BY id DESC
    `)

    return NextResponse.json(rows)
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Error in /api/books:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Unknown error" }, { status: 500 })
  }
}
