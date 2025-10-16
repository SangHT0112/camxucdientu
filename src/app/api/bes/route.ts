import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { RowDataPacket } from 'mysql2'

interface BeInfo extends RowDataPacket {
  stt: number
  user_id: number           // thêm user_id
  name: string
  gender: string
  age: number
  dob: string
  lop: string
  parent: string
  phone: string
  address: string
  qrBase64?: string
}

// GET: Lấy toàn bộ danh sách bé
export async function GET() {
  let connection
  try {
    connection = await db.getConnection()
    const [rows] = await connection.execute<BeInfo[]>('SELECT * FROM bes ORDER BY stt ASC')
    return NextResponse.json(rows)
  } catch (error) {
    console.error('❌ Lỗi GET bes:', error)
    return NextResponse.json({ error: 'Lỗi load data' }, { status: 500 })
  } finally {
    if (connection) connection.release()
  }
}

// POST: Upsert (insert/update) danh sách bé theo stt
export async function POST(request: NextRequest) {
  let connection
  try {
    const { bes }: { bes: BeInfo[] } = await request.json()
    if (!bes || !Array.isArray(bes)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    connection = await db.getConnection()
    await connection.beginTransaction()

    for (const be of bes) {
      await connection.execute(
        `INSERT INTO bes (stt, user_id, name, gender, age, dob, lop, parent, phone, address, qr_base64) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         user_id=VALUES(user_id), name=VALUES(name), gender=VALUES(gender), age=VALUES(age),
         dob=VALUES(dob), lop=VALUES(lop), parent=VALUES(parent), phone=VALUES(phone),
         address=VALUES(address), qr_base64=VALUES(qr_base64)`,
        [
          be.stt,
          be.user_id,             // thêm user_id vào mảng giá trị
          be.name,
          be.gender,
          be.age,
          be.dob,
          be.lop,
          be.parent,
          be.phone,
          be.address,
          be.qrBase64 ?? null,
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
