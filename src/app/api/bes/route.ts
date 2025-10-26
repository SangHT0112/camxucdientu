  import { NextRequest, NextResponse } from 'next/server'
  import db from '@/lib/db'
  import type { RowDataPacket, FieldPacket, PoolConnection } from 'mysql2/promise'

  interface DbBeInfo extends RowDataPacket {
    id?: number
    sbd: number
    user_id: number
    name: string
    gender: string
    age: number
    dob: Date  // mysql2 trả Date object
    lop: string
    parent: string
    phone: string
    address: string | null
    qr_base64?: string | null
    avatar?: string | null 
    created_at?: Date
  }

  interface BeInfo {  // Frontend-friendly (camelCase)
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
    avatar?: string | null 
    created_at?: string
  }

  interface MySQLError extends Error {
    code?: string
    errno?: number
    sqlMessage?: string
  }

  // Helper: Map DB row → Frontend format
  const mapToBeInfo = (row: DbBeInfo): BeInfo => {
    const { qr_base64, ...rest } = row
    return {
      ...rest,
      dob: row.dob ? row.dob.toISOString().split('T')[0] : '',
      qrBase64: qr_base64 || null,
      avatar: row.avatar || null,
      created_at: row.created_at ? row.created_at.toISOString() : '',
    }
  }

  // GET: Lấy toàn bộ danh sách bé (thêm filter user_id từ header nếu có)
  export async function GET(request: NextRequest) {
    let connection: PoolConnection | null = null  // Explicit type for logging
    try {
      const userId = request.headers.get('user-id') ? parseInt(request.headers.get('user-id')!) : null
      if (!db) {
        throw new Error('DB pool không tồn tại! Kiểm tra import hoặc config env.')
      }

      connection = await db.getConnection()
      if (!connection || typeof connection.execute !== 'function') {
        throw new Error('Connection không hợp lệ! getConnection() trả về undefined hoặc sai object.')
      }

      // Ping để verify connection thực sự live
      await connection.ping()

      let query = 'SELECT * FROM bes ORDER BY sbd ASC'
      const params: number[] = []
      if (userId) {
        query = 'SELECT * FROM bes WHERE user_id = ? ORDER BY sbd ASC'
        params.push(userId)
      }

      const [rows]: [DbBeInfo[], FieldPacket[]] = await connection.execute(query, params)

      if (!rows) {
        throw new Error('Rows undefined sau execute! Kiểm tra query hoặc DB schema.')
      }

      const formattedRows: BeInfo[] = rows.map(mapToBeInfo)
      return NextResponse.json(formattedRows)
    } catch (error) {
      // Log đầy đủ error (không assume mysql error)
      const mysqlError = error as MySQLError
      console.error('❌ Lỗi GET bes:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
        name: error instanceof Error ? error.name : 'Unknown',
        // Chỉ log mysql fields nếu có
        ...(mysqlError.code ? { code: mysqlError.code } : {}),
        ...(mysqlError.errno ? { errno: mysqlError.errno } : {}),
        ...(mysqlError.sqlMessage ? { sqlMessage: mysqlError.sqlMessage } : {}),
      })
      return NextResponse.json({ error: 'Lỗi load data: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
    } finally {
      if (connection) connection.release()
    }
  }

  // POST: Upsert (insert/update) danh sách bé theo stt
// ======================= POST =======================
export async function POST(request: NextRequest) {
  let connection: PoolConnection | null = null
  try {
    const { bes }: { bes: BeInfo[] } = await request.json()
    if (!bes || !Array.isArray(bes)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    connection = await db.getConnection()
    await connection.beginTransaction()

    for (const be of bes) {
      // 🔹 Giữ QR cũ nếu không có QR mới
      let qrBase64 = be.qrBase64 ?? null

      if (!qrBase64) {
        const [rows]: [DbBeInfo[], FieldPacket[]] = await connection.execute(
          'SELECT qr_base64 FROM bes WHERE sbd = ? AND user_id = ?',
          [be.sbd, be.user_id]
        )
        if (rows.length > 0 && rows[0].qr_base64) {
          qrBase64 = rows[0].qr_base64
        }
      }

      console.log('Upserting be:', { ...be, qrBase64 })

      await connection.execute(
        `INSERT INTO bes (sbd, user_id, name, gender, age, dob, lop, parent, phone, address, qr_base64, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          gender = VALUES(gender),
          age = VALUES(age),
          dob = VALUES(dob),
          lop = VALUES(lop),
          parent = VALUES(parent),
          phone = VALUES(phone),
          address = VALUES(address),
          qr_base64 = VALUES(qr_base64),
          avatar = VALUES(avatar)`,
        [
          be.sbd ?? null,
          be.user_id ?? null,
          be.name ?? null,
          be.gender ?? null,
          be.age ?? null,
          be.dob ?? null,
          be.lop ?? null,
          be.parent ?? null,
          be.phone ?? null,
          be.address ?? null,
          qrBase64 ?? null,
          be.avatar ?? null
        ]
      )

    }

    await connection.commit()
    return NextResponse.json({ success: true })
  } catch (error) {
    if (connection) await connection.rollback()
    console.error('❌ Lỗi POST bes:', error)
    return NextResponse.json({ error: 'Lỗi save data' }, { status: 500 })
  } finally {
    if (connection) connection.release()
  }
}