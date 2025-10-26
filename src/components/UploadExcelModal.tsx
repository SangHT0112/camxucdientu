// src/components/UploadExcelModal.tsx
"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, Loader2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import QRCode from "qrcode"
import { toast } from "sonner" // Assuming sonner for toasts, replace with alert if not
import { BeInfo } from "@/types/BeInfo"

interface UploadExcelModalProps {
  onUploadSuccess: (beList: BeInfo[]) => void // Callback to update parent state
  beList: BeInfo[] // Current beList to display preview
}

export function UploadExcelModal({ onUploadSuccess, beList }: UploadExcelModalProps) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [generatingQR, setGeneratingQR] = useState(false)

  const generateQRForBe = async (be: BeInfo): Promise<string> => {
    const qrText = `ID:${be.sbd}|Name:${be.name}|Lớp:${be.lop}|Parent:${be.parent}|Phone:${be.phone}`
    try {
      const qrUrl = await QRCode.toDataURL(qrText, {
        width: 256,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      })
      return qrUrl
    } catch (err) {
      console.error("Lỗi generate QR:", err)
      return ""
    }
  }

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.name.endsWith(".xlsx")) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const target = e.target
          if (!target) return
          const result = target.result
          if (!result || typeof result === "string") return

          const data = new Uint8Array(result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | boolean | Date)[][]
          
          // ✅ Lấy userId từ key "user" (JSON), không dùng "user_id" || 1
          const userStr = localStorage.getItem("user")
          const user = userStr ? JSON.parse(userStr) : null
          const userId = user?.id
          if (!userId) {
            toast.error("Không tìm thấy user ID. Vui lòng đăng nhập lại.")
            window.location.href = '/login'
            return
          }
          console.log('UploadExcel: Loaded user ID:', userId) // 🔍 Debug: Sẽ log 3 thay vì 1

          const parsedBeListTemp = jsonData
            .slice(1)
            .map((row: (string | number | boolean | Date)[]) => ({
              sbd: row[0] as number,
              user_id: userId,  // ✅ Thêm để satisfy BeInfo type (API bỏ qua)
              name: row[1] as string,
              gender: row[2] as string,
              age: row[3] as number,
              dob: row[4] as string,
              lop: row[5] as string,
              parent: row[6] as string,
              phone: row[7] as string,
              address: (row[8] as string) || '', // Ensure string
            } as BeInfo))  // ✅ Cast to BeInfo
            .filter((be) => be.sbd)

          if (parsedBeListTemp.length === 0) {
            toast.error("Không có dữ liệu hợp lệ trong file Excel.")
            return
          }

          setGeneratingQR(true)

          const qrPromises = parsedBeListTemp.map((be) => generateQRForBe(be))
          const qrBase64List = await Promise.all(qrPromises)

          // Batch save to MySQL API (include user_id for type, but API cleans it)
          const besWithQR = parsedBeListTemp.map((be, index) => ({ 
            ...be, 
            qrBase64: qrBase64List[index] 
          })) as BeInfo[]  // ✅ Cast to BeInfo[]
          try {
            const response = await fetch('/api/bes', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'user-id': userId.toString(),  // ✅ Header: Sẽ gửi 3
              },
              body: JSON.stringify({
                bes: besWithQR
              })
            })
            if (!response.ok) {
              const errData = await response.json().catch(() => ({}))
              throw new Error(errData.error || `API error: ${response.status}`)
            }
            console.log("Lưu thành công vào MySQL với user_id:", userId) // 🔍 Debug
          } catch (mysqlError) {
            console.error("Lỗi lưu MySQL:", mysqlError)
            toast.error("Lưu localStorage (MySQL lỗi). Kiểm tra kết nối DB.")
            localStorage.setItem("beList", JSON.stringify(besWithQR))
            onUploadSuccess(besWithQR)
            setShowUploadModal(false)
            setGeneratingQR(false)
            return
          }

          onUploadSuccess(besWithQR)
          // Bỏ localStorage fallback nếu API success (trust DB)
          toast.success(`Đã upload thành công ${besWithQR.length} bé và tạo QR! Lưu MySQL. 📚✨`)
          setShowUploadModal(false)
        } catch (error) {
          console.error("Lỗi upload:", error)
          toast.error("Lỗi upload file! Kiểm tra format Excel.")
        } finally {
          setGeneratingQR(false)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast.error("Vui lòng chọn file Excel (.xlsx)! ❌")
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  })

  return (
    <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-primary/50 bg-secondary/90 hover:bg-secondary text-secondary-foreground font-bold backdrop-blur min-w-[80px] justify-center"
          disabled={generatingQR}
        >
          {generatingQR ? <Loader2 className="w-5 h-5 hidden md:block animate-spin" /> : <Upload className="w-5 h-5 hidden md:block" />}
          <span className="ml-0 md:ml-2 text-xs md:text-sm">{generatingQR ? "Đang tạo QR..." : "Upload Excel"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Upload file Excel danh sách bé</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 p-6">
          <div
            {...getRootProps()}
            className={`w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/50 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-lg font-semibold text-primary">Thả file Excel vào đây! 📁</p>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold">Kéo thả file Excel (.xlsx) vào đây hoặc click để chọn</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Sau upload, sẽ tự động tạo QR cho từng bé và lưu vĩnh viễn.
                </p>
              </>
            )}
          </div>
          {beList.length > 0 && (
            <div className="w-full bg-accent/20 p-4 rounded-lg">
              <p className="font-semibold">Danh sách đã upload ({beList.length} bé):</p>
              <ul className="text-sm max-h-32 overflow-y-auto">
                {beList.slice(0, 5).map((be, idx) => (
                  <li key={idx} className="flex justify-between items-center">
                    <span>
                      {be.name} ({be.lop})
                    </span>
                    <span className="text-xs">{be.sbd}</span>
                    {be.qrBase64 && <span className="text-xs text-green-600">✅ QR sẵn</span>}
                  </li>
                ))}
                {beList.length > 5 && (
                  <li className="text-xs text-muted-foreground">... và {beList.length - 5} bé nữa</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}