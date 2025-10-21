// app/api/child_answers/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { child_id, question_id, answer_id, is_correct } = await request.json();
    if (!child_id || !question_id || !answer_id) {
      return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 });
    }
    await db.query(
      'INSERT INTO child_answers (child_id, question_id, answer_id, is_correct) VALUES (?, ?, ?, ?)',
      [child_id, question_id, answer_id, is_correct]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi lưu child_answers:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}