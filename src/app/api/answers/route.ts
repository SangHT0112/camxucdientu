// app/api/answers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { PoolConnection, RowDataPacket, FieldPacket, OkPacket } from 'mysql2/promise';

interface Answer {
  id?: number;
  question_id: number;
  answer_text: string;
  is_correct: boolean;
}

export async function GET(request: NextRequest) {
  let connection: PoolConnection | null = null;
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('question_id');

    if (!db) throw new Error('DB pool không tồn tại từ lib/db');

    connection = await db.getConnection();
    if (!connection) throw new Error('Không thể lấy connection từ db pool');

    let query = 'SELECT id, question_id, answer_text, is_correct FROM answers';
    const params: (string | number)[] = []; // ✅ fix any[]

    if (questionId) {
      const parsedId = parseInt(questionId, 10);
      if (isNaN(parsedId)) {
        return NextResponse.json({ error: 'question_id phải là số hợp lệ' }, { status: 400 });
      }
      query += ' WHERE question_id = ?';
      params.push(parsedId);
    }

    query += ' ORDER BY id ASC';

    const [rows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(query, params);
    const answers: Answer[] = rows as Answer[];

    return NextResponse.json(answers);
  } catch (error) {
    console.error('Error fetching answers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function POST(request: NextRequest) {
  let connection: PoolConnection | null = null;
  try {
    const newAnswer: Partial<Answer> = await request.json();

    if (!newAnswer.question_id || !newAnswer.answer_text || typeof newAnswer.is_correct !== 'boolean') {
      return NextResponse.json({ error: 'Thiếu question_id, answer_text hoặc is_correct' }, { status: 400 });
    }

    if (!db) throw new Error('DB pool không tồn tại từ lib/db');

    connection = await db.getConnection();
    if (!connection) throw new Error('Không thể lấy connection từ db pool');

    await connection.beginTransaction();

    const [result]: [OkPacket, FieldPacket[]] = await connection.execute(
      'INSERT INTO answers (question_id, answer_text, is_correct) VALUES (?, ?, ?)',
      [newAnswer.question_id, newAnswer.answer_text, newAnswer.is_correct]
    );

    const insertId = Number(result.insertId);
    if (!insertId) throw new Error('Không thể lấy ID sau khi insert');

    await connection.commit();

    const [newAnswerRows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(
      'SELECT id, question_id, answer_text, is_correct FROM answers WHERE id = ?',
      [insertId]
    );

    if (!newAnswerRows.length) throw new Error('Không tìm thấy answer sau khi insert');

    const createdAnswer: Answer = newAnswerRows[0] as Answer;
    return NextResponse.json(createdAnswer);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error creating answer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
