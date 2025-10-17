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

// POST: Thêm cảm xúc mới (tối đa 2 lần mỗi ngày: morning/afternoon)
export async function POST(request: NextRequest) {
  let connection;
  try {
    const { emotions }: { emotions: { child_id: number; child_name: string; class_name: string; emotion: string; date: string }[] } = await request.json();
    console.log("Received POST data:", emotions);

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

      // Kiểm tra số lần chọn cảm xúc trong ngày
      const [existingRows] = await connection.execute<EmotionLog[]>(
        "SELECT session FROM emotion_logs WHERE child_id = ? AND date = ?",
        [child_id, date]
      );
      console.log("Existing rows for child_id and date:", existingRows);
      if (existingRows.length >= 2) {
        await connection.rollback();
        return NextResponse.json(
          { error: `Bé đã chọn đủ 2 cảm xúc trong ngày ${date}` },
          { status: 409 }
        );
      }

      // Xác định session
      const session = existingRows.length === 0 ? "morning" : "afternoon";
      console.log("Assigned session:", session);

      // Kiểm tra xem session đã tồn tại chưa
      const [sessionRows] = await connection.execute<EmotionLog[]>(
        "SELECT id FROM emotion_logs WHERE child_id = ? AND date = ? AND session = ?",
        [child_id, date, session]
      );
      if (sessionRows.length > 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: `Bé đã chọn cảm xúc cho buổi ${session === "morning" ? "sáng" : "chiều"} trong ngày ${date}` },
          { status: 409 }
        );
      }

      // Tìm emotion_id
      const [emotionRows] = await connection.execute<Emotion[]>(
        "SELECT id FROM emotions WHERE label = ?",
        [emotion]
      );
      console.log("Emotion rows:", emotionRows);
      if (emotionRows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: `Không tìm thấy cảm xúc: ${emotion}` }, { status: 404 });
      }

      const emotion_id = emotionRows[0].id;

      // Thêm bản ghi mới
      await connection.execute(
        `INSERT INTO emotion_logs (child_id, child_name, class_name, emotion_id, date, session, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [child_id, child_name, class_name, emotion_id, date, session]
      );
      console.log("Inserted emotion log for:", { child_id, date, session });
    }

    await connection.commit();
    console.log("Transaction committed");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Lỗi POST emotion_logs:", error);
    if (connection) await connection.rollback();
    return NextResponse.json({ error: `Lỗi lưu dữ liệu:` }, { status: 500 });
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