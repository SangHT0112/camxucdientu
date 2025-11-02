import { NextResponse } from "next/server"
import db from "@/lib/db"
import type { RowDataPacket } from "mysql2/promise"

interface TierRow extends RowDataPacket {
  id: number
  tier_name: "free" | "basic" | "pro"
  price: number
  max_tests: number
  max_questions: number
  created_at: Date
}

export async function GET() {
  try {
    const [rows] = await db.query<TierRow[]>(`
      SELECT id, tier_name, price, max_tests, max_questions, created_at
      FROM tiers
      ORDER BY id ASC
    `)

    return NextResponse.json(rows)
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Error in /api/tiers:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Unknown error" }, { status: 500 })
  }
}
