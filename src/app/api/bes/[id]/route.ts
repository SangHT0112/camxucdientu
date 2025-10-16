import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  let connection
  try {
    connection = await db.getConnection()
    const [rows] = await connection.execute('SELECT * FROM bes WHERE stt = ?', [params.id]) as any[]
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