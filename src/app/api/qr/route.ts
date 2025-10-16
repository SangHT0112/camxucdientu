import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  let connection;
  try {
    connection = await db.getConnection();
    const userId = request.headers.get('user-id') || '1';
    const [rows] = await connection.execute(
      'SELECT stt, name, qr_base64 FROM bes WHERE qr_base64 IS NOT NULL AND user_id = ?',
      [userId]
    ) as any[];
    // console.log('Rows from MySQL:', rows); // Debug

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Chưa có mã QR nào.' }, { status: 404 });
    }

    const zip = new JSZip();
    rows.forEach((be: { stt: number; name: string; qr_base64: string }) => {
      if (be.qr_base64) {
        // console.log(`Adding QR for ${be.name}:`, be.qr_base64); // Debug
        const filename = `QR_be_${be.stt}_${be.name.replace(/\s+/g, '_')}.png`;
        zip.file(filename, be.qr_base64.split(',')[1], { base64: true });
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return new NextResponse(zipBlob, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename=QR_codes.zip',
        'Content-Type': 'application/zip',
      },
    });
  } catch (error) {
    console.error('Lỗi tạo ZIP QR:', error);
    return NextResponse.json({ error: 'Lỗi server khi tạo file ZIP.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}