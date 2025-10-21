// app/api/question-types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { PoolConnection, RowDataPacket, FieldPacket } from 'mysql2/promise';

interface QuestionTypeRow extends RowDataPacket {
  id: number;
  type_name: string;
  icon?: string;
}

interface QuestionType {
  id: number;
  type_name: string;
  icon?: string;
  description?: string; // Optional, không dùng trong component nhưng có thể trả về
}

export async function GET(request: NextRequest) {
  let connection: PoolConnection | null = null;
  try {
    // Lấy user_id từ header nếu cần filter (optional, hiện tại global)
    const userIdHeader = request.headers.get('user-id');
    let userId: number | null = null;
    if (userIdHeader) {
      const parsedId = parseInt(userIdHeader, 10);
      if (!isNaN(parsedId)) {
        userId = parsedId;
      }
    }

    connection = await db.getConnection();

    const query = 'SELECT id, type_name, icon FROM question_types' + (userId ? ' WHERE user_id = ?' : '');
    const params: (number | never)[] = userId ? [userId] : [];

    const [rows]: [QuestionTypeRow[], FieldPacket[]] = await connection.execute(query, params);

    const types: QuestionType[] = rows.map(row => ({
      id: row.id,
      type_name: row.type_name,
      icon: row.icon || undefined,
    }));

    return NextResponse.json(types);
  } catch (error: unknown) {
    console.error('Error fetching question types:', error);
    return NextResponse.json(
      { error: 'Không thể lấy danh sách loại câu hỏi' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}