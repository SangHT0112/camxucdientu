import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { RowDataPacket } from 'mysql2'

interface Be extends RowDataPacket {
  stt: number
  name: string
  gender: string
  lop: string
  qrBase64?: string
  created_at: string
  updated_at: string
}

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  let connection
  try {
    const { id } = await params;
    
    connection = await db.getConnection()
    const [rows] = await connection.execute<Be[]>(
      'SELECT * FROM bes WHERE sbd = ?', 
      [id]
    )
    
    if (rows.length > 0) {
      return NextResponse.json(rows[0])
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('Lỗi GET be by id:', error)
    return NextResponse.json({ error: 'Lỗi load data' }, { status: 500 })
  } finally {
    if (connection) connection.release()
  }
}