import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface EmotionLog extends RowDataPacket {
  id: number;
  child_id: number;
  child_name: string;
  class_name: string;
  emotion_id: number;
  emotion_label?: string;
  date: string;
  created_at: string;
}

interface Emotion extends RowDataPacket {
  id: number;
  label: string;
}

// GET: Lấy danh sách cảm xúc của bé
export async function GET(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const child_id = searchParams.get("child_id");
    const date = searchParams.get("date");

    connection = await db.getConnection();
    let query = `
      SELECT el.*, e.label AS emotion_label
      FROM emotion_logs el
      JOIN emotions e ON el.emotion_id = e.id
    `;
    const params: any[] = [];
    if (child_id && date) {
      query += " WHERE el.child_id = ? AND el.date = ?";
      params.push(child_id, date);
    }
    query += " ORDER BY el.date DESC, el.created_at DESC";

    const [rows] = await connection.execute<EmotionLog[]>(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("❌ Lỗi GET emotion_logs:", error);
    return NextResponse.json({ error: "Lỗi load data" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST: Thêm / Upsert danh sách cảm xúc
export async function POST(request: NextRequest) {
  let connection;
  try {
    const { emotions }: { emotions: { child_id: number; child_name: string; class_name: string; emotion: string; date: string }[] } = await request.json();

    if (!emotions || !Array.isArray(emotions)) {
      return NextResponse.json({ error: "Dữ liệu emotions không hợp lệ" }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    for (const emo of emotions) {
      const { child_id, child_name, class_name, emotion, date } = emo;

      // Validate input
      if (!child_id || !child_name || !class_name || !emotion || !date) {
        await connection.rollback();
        return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
      }

      // Find emotion_id based on emotion label
      const [emotionRows] = await connection.execute<Emotion[]>(
        "SELECT id FROM emotions WHERE label = ?",
        [emotion]
      );

      if (emotionRows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: `Không tìm thấy cảm xúc: ${emotion}` }, { status: 404 });
      }

      const emotion_id = emotionRows[0].id;

      await connection.execute(
        `INSERT INTO emotion_logs (child_id, child_name, class_name, emotion_id, date) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         child_name = VALUES(child_name),
         class_name = VALUES(class_name),
         emotion_id = VALUES(emotion_id),
         date = VALUES(date)`,
        [child_id, child_name, class_name, emotion_id, date]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Lỗi POST emotion_logs:", error);
    return NextResponse.json({ error: "Lỗi lưu dữ liệu" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// DELETE: Xóa bản ghi cảm xúc theo id
export async function DELETE(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

    connection = await db.getConnection();
    const [result] = await connection.execute("DELETE FROM emotion_logs WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Lỗi DELETE emotion_logs:", error);
    return NextResponse.json({ error: "Lỗi xóa dữ liệu" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}