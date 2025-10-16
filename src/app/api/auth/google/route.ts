// app/api/auth/google/route.ts (Backend API for Google OAuth - Fixed for your table schema)
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import jwt from 'jsonwebtoken'
import db from '@/lib/db'
import type { OkPacket, FieldPacket } from 'mysql2'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/callback/google`  // Adjust nếu cần
)

export async function POST(request: NextRequest) {
  let connection
  try {
    const { credential } = await request.json()  // ID token từ Google

    // Verify ID token
    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    if (!payload) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 })
    }

    const { email, name, sub: googleId } = payload  // Bỏ picture vì table không có profile_picture

    connection = await db.getConnection()

    // Check if user exists (SELECT query: [rows: any[], fields: FieldPacket[]])
    const [existingRows]: [any[], FieldPacket[]] = await connection.execute('SELECT * FROM users WHERE email = ?', [email])

    let user
    if (existingRows.length > 0) {
      // Update profile nếu cần (dùng username thay vì name)
      user = existingRows[0]
      await connection.execute(
        'UPDATE users SET username = ?, google_id = ? WHERE id = ?',
        [name, googleId, user.id]
      )
    } else {
      // Create new user (INSERT query: [result: OkPacket, fields: FieldPacket[]]) - Bỏ profile_picture
      const [result]: [OkPacket, FieldPacket[]] = await connection.execute(
        'INSERT INTO users (email, username, google_id, role) VALUES (?, ?, ?, ?)',
        [email, name, googleId, 'teacher']  // Default role
      )
      user = { id: result.insertId, username: name, email, role: 'teacher' }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      token,
      user
    })
  } catch (error) {
    console.error('Lỗi Google login:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  } finally {
    if (connection) connection.release()
  }
}