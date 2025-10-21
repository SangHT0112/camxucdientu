// app/api/quiz_results/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { child_id, total_questions, correct_answers, score } = await request.json();
    if (!child_id || total_questions === undefined || correct_answers === undefined) {
      return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 });
    }
    await db.query(
      'INSERT INTO quiz_results (child_id, total_questions, correct_answers, score) VALUES (?, ?, ?, ?)',
      [child_id, total_questions, correct_answers, score]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi lưu quiz_results:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}