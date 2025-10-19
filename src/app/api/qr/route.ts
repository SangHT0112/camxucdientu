import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import db from '@/lib/db';
import type { RowDataPacket, FieldPacket, PoolConnection } from 'mysql2/promise';

interface QrRow extends RowDataPacket {
  sbd: number;
  name: string;
  qr_base64: string;
}

export async function GET(request: NextRequest) {
  let connection: PoolConnection | null = null;
  try {
    connection = await db.getConnection();
    const userId = request.headers.get('user-id') || '1';
    const [rows]: [QrRow[], FieldPacket[]] = await connection.execute(
      'SELECT sbd, name, qr_base64 FROM bes WHERE qr_base64 IS NOT NULL AND user_id = ?',
      [userId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Chưa có mã QR nào.' }, { status: 404 });
    }

    const zip = new JSZip();
    rows.forEach((be: QrRow) => {
      if (be.qr_base64) {
        const filename = `QR_be_${be.sbd}_${be.name.replace(/\s+/g, '_')}.png`;
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