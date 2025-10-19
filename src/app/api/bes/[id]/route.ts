import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { RowDataPacket, FieldPacket, PoolConnection } from 'mysql2/promise'

interface DbBeInfo extends RowDataPacket {
  id?: number
  sbd: number  // Fix: stt → sbd để khớp query
  user_id: number
  name: string
  gender: string
  age: number
  dob: Date
  lop: string
  parent: string
  phone: string
  address: string | null
  qr_base64?: string | null
  created_at?: Date
}

interface BeInfo {  // Frontend-friendly
  id?: number
  sbd: number
  user_id: number
  name: string
  gender: string
  age: number
  dob: string  // YYYY-MM-DD
  lop: string
  parent: string
  phone: string
  address: string | null
  qrBase64?: string | null
  created_at?: string
}

// Helper: Map DB row → Frontend format
const mapToBeInfo = (row: DbBeInfo): BeInfo => ({
  ...row,
  dob: row.dob ? row.dob.toISOString().split('T')[0] : '',
  qrBase64: row.qr_base64 || null,
  created_at: row.created_at ? row.created_at.toISOString() : '',
})

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: PoolConnection | null = null
  try {
    const { id } = await params
    const sbd = parseInt(id)
    if (isNaN(sbd)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }
    const userId = request.headers.get('user-id') ? parseInt(request.headers.get('user-id')!) : null
    
    if (!db) {
      throw new Error('DB pool không tồn tại!')
    }
    console.log('✅ DB pool OK for single be')

    connection = await db.getConnection()
    if (!connection || typeof connection.execute !== 'function') {
      throw new Error('Connection không hợp lệ!')
    }
    console.log('✅ Connection OK for single be')

    await connection.ping()
    console.log('✅ Ping OK for single be')

    let query = 'SELECT * FROM bes WHERE sbd = ?'
    const paramsQuery: number[] = [sbd]
    if (userId !== null) {
      query += ' AND user_id = ?'
      paramsQuery.push(userId)
      console.log(`✅ Filtering single by user_id: ${userId}`)
    }

    console.log(`🔍 About to execute single: query="${query}", params length=${paramsQuery.length}`)  // Debug log

    const [rows]: [DbBeInfo[], FieldPacket[]] = await connection.execute(query, paramsQuery)

    console.log(`✅ Query single OK, rows length: ${rows ? rows.length : 'undefined'}`)

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const formattedBe: BeInfo = mapToBeInfo(rows[0])
    return NextResponse.json(formattedBe)
  } catch (error) {
    console.error('❌ Lỗi GET be by id:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack',
    })
    return NextResponse.json({ error: 'Lỗi load data' }, { status: 500 })
  } finally {
    if (connection) connection.release()
  }
}