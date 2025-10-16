"use client"

import { useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import QRCode from "qrcode"

type Student = {
  id: string
  name: string
  studentCode: string
  class: string
  dateOfBirth: string
}

type QRCodeGeneratorProps = {
  student: Student
  onClose: () => void
}

export function QRCodeGenerator({ student, onClose }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const qrData = JSON.stringify({
        id: student.id,
        studentCode: student.studentCode,
        name: student.name,
        class: student.class,
      })

      QRCode.toCanvas(
        canvasRef.current,
        qrData,
        {
          width: 300,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) console.error(error)
        },
      )
    }
  }, [student])

  const handleDownload = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png")
      const link = document.createElement("a")
      link.download = `QR_${student.studentCode}_${student.name}.png`
      link.href = url
      link.click()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mã QR - {student.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border bg-white p-4">
              <canvas ref={canvasRef} />
            </div>
            <div className="text-center">
              <p className="font-medium">{student.name}</p>
              <p className="text-sm text-muted-foreground">
                Mã: {student.studentCode} - Lớp: {student.class}
              </p>
            </div>
          </div>
          <Button onClick={handleDownload} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Tải xuống mã QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
