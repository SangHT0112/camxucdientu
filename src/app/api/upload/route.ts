import { v2 as cloudinary } from "cloudinary"
import { NextResponse } from "next/server"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get("file") as File

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: "avatars" }, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    }).end(buffer)
  })

  return NextResponse.json(result)
}
