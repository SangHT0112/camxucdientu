import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface Emotion extends RowDataPacket {
  id: number;
  label: string;
  message: string;
  audio: string;
  image: string;
  created_at: string;
  updated_at: string;
}

// GET: Lấy danh sách loại cảm xúc hoặc một cảm xúc cụ thể
// GET: Lấy danh sách loại cảm xúc hoặc một cảm xúc cụ thể
export async function GET(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    connection = await db.getConnection();

    if (id) {
      // Lấy một cảm xúc cụ thể theo id
      const [rows] = await connection.execute<Emotion[]>(
        "SELECT * FROM emotions WHERE id = ?",
        [id]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: "Không tìm thấy cảm xúc" }, { status: 404 });
      }
      return NextResponse.json(rows[0]);
    } else {
      // Lấy tất cả các loại cảm xúc
      const [rows] = await connection.execute<Emotion[]>(
        "SELECT * FROM emotions ORDER BY created_at DESC" // Thêm ORDER BY để đảm bảo thứ tự
      );
      console.log("Fetched emotions:", rows); // Debug log
      return NextResponse.json(rows);
    }
  } catch (error) {
    console.error("❌ Lỗi GET emotions:", error);
    return NextResponse.json({ error: "Lỗi load data" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST: Thêm một loại cảm xúc mới
export async function POST(request: NextRequest) {
  let connection;
  try {
    const { label, message, audio, image } = await request.json();

    if (!label || !message || !audio || !image) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO emotions (label, message, audio, image) 
       VALUES (?, ?, ?, ?)`,
      [label, message, audio, image]
    );

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Lỗi POST emotions:", error);
    return NextResponse.json({ error: "Lỗi lưu cảm xúc" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// PUT: Cập nhật một loại cảm xúc theo id
export async function PUT(request: NextRequest) {
  let connection;
  try {
    const { id, label, message, audio, image } = await request.json();

    if (!id || !label || !message || !audio || !image) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `UPDATE emotions 
       SET label = ?, message = ?, audio = ?, image = ?, updated_at = NOW()
       WHERE id = ?`,
      [label, message, audio, image, id]
    );

    // Kiểm tra xem có bản ghi nào được cập nhật không
    if ((result as any).affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Không tìm thấy cảm xúc" }, { status: 404 });
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Lỗi PUT emotions:", error);
    return NextResponse.json({ error: "Lỗi cập nhật cảm xúc" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// DELETE: Xóa một loại cảm xúc theo id
export async function DELETE(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.execute("DELETE FROM emotions WHERE id = ?", [id]);

    // Kiểm tra xem có bản ghi nào được xóa không
    if ((result as any).affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Không tìm thấy cảm xúc" }, { status: 404 });
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Lỗi DELETE emotions:", error);
    return NextResponse.json({ error: "Lỗi xóa cảm xúc" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}