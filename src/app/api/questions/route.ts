// app/api/questions/route.ts
import { NextRequest, NextResponse } from "next/server"
import db from "@/lib/db"
import { FieldPacket, RowDataPacket, PoolConnection } from 'mysql2/promise';

interface QuestionRow extends RowDataPacket {
  question_id: number;
  question: string | null;
  emoji: string | null;
  explanation: string | null;
  answer_id: number | null;
  answer_text: string | null;
  is_correct: 0 | 1 | null;
}

interface ApiQuestion {
  id: number;
  question: string;
  emoji: string;
  answers: { id: number; text: string }[];
  correctAnswer: number;
  explanation: string;
}

export async function GET(request: NextRequest) {
  let connection: PoolConnection | null = null;
  try {
    connection = await db.getConnection();
    const [rows]: [QuestionRow[], FieldPacket[]] = await connection.execute(`
      SELECT 
        q.id AS question_id,
        q.question_text AS question,
        q.emoji,
        q.explanation,
        a.id AS answer_id,
        a.answer_text,
        a.is_correct
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      ORDER BY q.id DESC, a.id ASC
      LIMIT 12
    `)


    const questionMap = new Map<number, ApiQuestion>()

    rows.forEach(row => {
      const qid = row.question_id
      if (!questionMap.has(qid)) {
        questionMap.set(qid, {
          id: qid,
          question: row.question || '',
          emoji: row.emoji || '',
          answers: [],
          correctAnswer: -1,
          explanation: row.explanation || '',
        })
      }

      const q = questionMap.get(qid)!
      if (row.answer_id !== null) {
        q.answers.push({
          id: row.answer_id,
          text: row.answer_text || ''
        })
        if (row.is_correct === 1) {
          q.correctAnswer = q.answers.length - 1
        }
      }
    })

    const questions: ApiQuestion[] = Array.from(questionMap.values())

    return NextResponse.json(questions)
  } catch (error: unknown) {
    console.error("Lỗi lấy questions:", error)
    return NextResponse.json({ error: "Không thể lấy dữ liệu" }, { status: 500 })
  } finally {
    if (connection) connection.release();
  }
}