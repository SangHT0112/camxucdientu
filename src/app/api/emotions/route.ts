import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import fs from "fs";
import path from "path";

interface Emotion extends RowDataPacket {
  id: number;
  label: string;
  message: string;
  audio: string;
  image: string;  // URL hoặc path
  color: string | null;
  created_at: string;
  updated_at: string;
}

// Helper: Save file (image or audio) và return path
async function saveFile(file: File, type: 'image' | 'audio'): Promise<string> {
  const dir = type === 'image' ? 'uploads/images' : 'uploads/audio';
  const uploadsDir = path.join(process.cwd(), "public", dir);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const ext = path.extname(file.name) || (type === 'image' ? '.png' : '.mp3');
  const filename = `${file.name.replace(ext, "")}-${timestamp}${ext}`;
  const filepath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  fs.writeFileSync(filepath, buffer);
  return `/${dir}/${filename}`;
}

// GET: Lấy danh sách loại cảm xúc hoặc một cảm xúc cụ thể
export async function GET(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    connection = await db.getConnection();

    if (id) {
      const [rows] = await connection.execute<Emotion[]>(
        "SELECT * FROM emotions WHERE id = ?",
        [id]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: "Không tìm thấy cảm xúc" }, { status: 404 });
      }
      return NextResponse.json(rows[0]);
    } else {
      const [rows] = await connection.execute<Emotion[]>(
        "SELECT * FROM emotions ORDER BY created_at DESC"
      );
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
    const formData = await request.formData();
    const label = formData.get("label") as string;
    const message = (formData.get("message") as string) || "";
    const color = (formData.get("color") as string) || "#3b82f6";
    
    // Image
    let image = "";
    const imageUrl = formData.get("imageUrl") as string;
    const imageFile = formData.get("imageFile") as File;
    if (imageUrl) {
      try {
        new URL(imageUrl);
        image = imageUrl;
      } catch {
        return NextResponse.json({ error: "URL hình ảnh không hợp lệ" }, { status: 400 });
      }
    } else if (imageFile) {
      image = await saveFile(imageFile, 'image');
    } else {
      return NextResponse.json({ error: "Thiếu hình ảnh (URL hoặc file)" }, { status: 400 });
    }
    
    // Audio
    let audio = "";
    const audioUrl = formData.get("audioUrl") as string;
    const audioFile = formData.get("audioFile") as File;
    if (audioUrl) {
      try {
        new URL(audioUrl);
        audio = audioUrl;
      } catch {
        return NextResponse.json({ error: "URL âm thanh không hợp lệ" }, { status: 400 });
      }
    } else if (audioFile) {
      audio = await saveFile(audioFile, 'audio');
    }

    if (!label || !image) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc (label/image)" }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO emotions (label, message, audio, image, color) VALUES (?, ?, ?, ?, ?)`,
      [label, message, audio, image, color]
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
    const formData = await request.formData();
    const id = parseInt(formData.get("id") as string || "0");
    const label = formData.get("label") as string;
    const message = (formData.get("message") as string) || "";
    const color = (formData.get("color") as string) || "#3b82f6";
    
    // Image
    let image = "";
    const imageUrl = formData.get("imageUrl") as string;
    const imageFile = formData.get("imageFile") as File;
    if (imageUrl) {
      try {
        new URL(imageUrl);
        image = imageUrl;
      } catch {
        return NextResponse.json({ error: "URL hình ảnh không hợp lệ" }, { status: 400 });
      }
    } else if (imageFile) {
      image = await saveFile(imageFile, 'image');
    } else {
      return NextResponse.json({ error: "Thiếu hình ảnh mới (URL hoặc file)" }, { status: 400 });
    }
    
    // Audio
    let audio = "";
    const audioUrl = formData.get("audioUrl") as string;
    const audioFile = formData.get("audioFile") as File;
    if (audioUrl) {
      try {
        new URL(audioUrl);
        audio = audioUrl;
      } catch {
        return NextResponse.json({ error: "URL âm thanh không hợp lệ" }, { status: 400 });
      }
    } else if (audioFile) {
      audio = await saveFile(audioFile, 'audio');
    }

    if (!id || !label || !image) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc (id/label/image)" }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `UPDATE emotions 
       SET label = ?, message = ?, audio = ?, image = ?, color = ?, updated_at = NOW()
       WHERE id = ?`,
      [label, message, audio, image, color, id]
    );

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

// DELETE: Xóa một loại cảm xúc theo id (xóa file nếu là path local)
export async function DELETE(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    connection = await db.getConnection();
    const [rows] = await connection.execute<Emotion[]>("SELECT image, audio FROM emotions WHERE id = ?", [parseInt(id)]);
    const emotion = rows[0];

    await connection.beginTransaction();

    const [result] = await connection.execute("DELETE FROM emotions WHERE id = ?", [parseInt(id)]);

    if ((result as any).affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Không tìm thấy cảm xúc" }, { status: 404 });
    }

    // Xóa files nếu là path local (không xóa nếu là URL external)
    if (emotion?.image && !emotion.image.startsWith('http')) {
      const imgPath = path.join(process.cwd(), "public", emotion.image.replace(/^\//, ''));
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    if (emotion?.audio && !emotion.audio.startsWith('http')) {
      const audioPath = path.join(process.cwd(), "public", emotion.audio.replace(/^\//, ''));
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
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