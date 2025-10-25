import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

interface EmotionLog extends RowDataPacket {
  id: number;
  child_id: number;
  child_name: string;
  class_name: string;
  emotion_id: number;
  emotion_label?: string;
  date: string;
  session: string;
  created_at: string;
}

interface Emotion extends RowDataPacket {
  id: number;
  label: string;
}

// GET: Lấy danh sách cảm xúc với nhiều điều kiện lọc
export async function GET(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const child_id = searchParams.get("child_id");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const lastDays = searchParams.get("lastDays");
    const lastMonths = searchParams.get("lastMonths");

    connection = await db.getConnection();
    
    let query = `
      SELECT el.*, e.label AS emotion_label
      FROM emotion_logs el
      JOIN emotions e ON el.emotion_id = e.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    // Lọc theo child_id
    if (child_id) {
      query += " AND el.child_id = ?";
      params.push(child_id);
    }

    // Lọc theo ngày cụ thể
    if (date && !lastDays && !lastMonths) {
      query += " AND el.date = ?";
      params.push(date);
    }

    // Lọc theo khoảng thời gian
    if (from && to) {
      query += " AND el.date BETWEEN ? AND ?";
      params.push(from, to);
    }

    // Lọc theo số ngày gần nhất
    if (lastDays) {
      query += " AND el.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)";
      params.push(parseInt(lastDays));
    }

    // Lọc theo số tháng gần nhất
    if (lastMonths) {
      query += " AND el.date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)";
      params.push(parseInt(lastMonths));
    }

    query += " ORDER BY el.date DESC, el.created_at DESC";

    console.log("📋 Query:", query);
    console.log("📋 Params:", params);

    const [rows] = await connection.execute<EmotionLog[]>(query, params);
    console.log("📥 Kết quả trả về:", rows.length, "bản ghi");
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("❌ Lỗi GET emotion_logs:", error);
    return NextResponse.json({ error: "Lỗi load data" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST: Thêm cảm xúc mới (giữ nguyên như cũ)
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
    const [result] = await connection.execute<ResultSetHeader>("DELETE FROM emotion_logs WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
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