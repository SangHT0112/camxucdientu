"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {  QrCode, Sparkles, Star, X, ImageIcon, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import { useDropzone } from "react-dropzone"
import QRCode from "qrcode"
import JSZip from "jszip"
import { Scanner } from "@yudiel/react-qr-scanner"
import { UploadExcelModal } from "@/components/UploadExcelModal" // Import new component
import { DownloadQRButton } from "@/components/DownloadQRButton"
import { BeInfo } from "@/types/BeInfo"

// 🔥 Fix: Thêm interface cho QR Code result
interface QrCodeResult {
  rawValue: string
}

// 🔥 Fix: Định nghĩa constraints với type đúng
const constraints: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
}

export default function PreschoolGreeting() {
  const [showScanner, setShowScanner] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [beList, setBeList] = useState<BeInfo[]>([])
  const [generatingQR, setGeneratingQR] = useState(false)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [cameraError, setCameraError] = useState<string>("")
  const [showFileFallback, setShowFileFallback] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      alert("Bạn cần đăng nhập trước khi truy cập trang này!")
      router.push("/login")
    }
  }, [router])

  // Load beList từ API MySQL (ưu tiên), fallback localStorage
  useEffect(() => {
    const fetchBeList = async () => {
      try {
        const response = await fetch('/api/bes')
        if (response.ok) {
          const data = await response.json()
          if (data.length > 0) {
            setBeList(data)
            console.log(`Đã load ${data.length} bé từ MySQL!`)
            return
          }
        }
      } catch (error) {
        console.error("Lỗi load từ API:", error)
      }

      // Fallback localStorage
      const saved = localStorage.getItem("beList")
      if (saved) {
        const parsed = JSON.parse(saved) as BeInfo[]
        setBeList(parsed)
        console.log(`Fallback từ localStorage: ${parsed.length} bé`)
      }
    }
    fetchBeList()
  }, [])

  // 🔥 Fix: Sử dụng type đúng cho detectedCodes
  const handleScan = (detectedCodes: QrCodeResult[]) => {
    const result = detectedCodes[0]?.rawValue
    if (result) {
      console.log("✅ QR scanned:", result)
      const idMatch = result.match(/ID:(\d+)/)
      if (idMatch) {
        const id = idMatch[1]
        const be = beList.find((b) => b.sbd.toString() === id)
        if (be) {
          alert(`Quét thành công! Chào ${be.name} (${be.lop})! 😊`)
          setShowScanner(false)
          router.push(`/child/${id}`)
        } else {
          alert("Không tìm thấy bé với ID này! Kiểm tra lại QR.")
        }
      } else {
        alert("QR không hợp lệ! Cần chứa ID bé.")
      }
    }
  }

  // 🔥 Fix: Sử dụng type cụ thể cho error
  const handleError = (error: unknown) => {
    console.error("❌ Scan error:", error)
    
    if (error instanceof Error) {
      if (error.name === "NotAllowedError" || error.message.includes("Permission")) {
        setCameraError("Bị từ chối truy cập camera! Vui lòng cho phép quyền camera.")
        setShowFileFallback(true)
      } else if (error.name === "NotFoundError") {
        setCameraError("Không tìm thấy camera! Kiểm tra kết nối.")
        setShowFileFallback(true)
      } else {
        setCameraError("Lỗi quét: " + error.message)
      }
    } else {
      setCameraError("Lỗi không xác định khi truy cập camera")
      setShowFileFallback(true)
    }
  }

  // 🔥 Fix: Xóa biến imageData không sử dụng
  const handleFileScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          canvas.width = img.width
          canvas.height = img.height
          ctx?.drawImage(img, 0, 0)
          // 🔥 Fix: Xóa dòng này vì không sử dụng imageData
          // const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
          alert("Scan file: " + e.target?.result)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("❌ File scan error:", error)
      alert("Lỗi đọc QR từ ảnh: " + (error as Error).message)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleScanClick = () => {
    if (beList.length === 0) {
      alert("Upload danh sách bé trước nhé! 📚")
      return
    }
    setShowScanner(true)
    setCameraError("")
    setShowFileFallback(false)
  }

  const handleCloseScanner = () => {
    setShowScanner(false)
    setShowFileFallback(false)
    setCameraError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFixPermission = () => {
    const instructions = `
🔧 HƯỚNG DẪN SỬA LỖI CAMERA:

1. 📱 TRÊN ĐIỆN THOẠI:
   • Chạm vào biểu tượng 🔒 hoặc 🛡️ trên thanh URL
   • Chọn "Cho phép" hoặc "Allow" camera
   • Tải lại trang và thử lại

2. 💻 TRÊN MÁY TÍNH:
   • Click vào biểu tượng camera 🎥 hoặc khóa 🔒 trên thanh URL
   • Đổi camera thành "Cho phép" hoặc "Allow"
   • Tải lại trang

3. 🌐 TRÌNH DUYỆT:
   • Dùng Chrome, Firefox, Safari mới nhất
   • Đảm bảo đang dùng HTTPS (không phải HTTP)
   • Xóa cache và cookie nếu cần

4. ⚙️ HỆ THỐNG:
   • Kiểm tra camera không bị ứng dụng khác chiếm
   • Đảm bảo camera hoạt động bình thường

Sau khi sửa, nhấn nút "Quét mã QR" lại nhé! 📸
    `
    alert(instructions)
  }

  const handleUploadClick = () => {
    setShowUploadModal(true)
  }

  const handleAdminClick = () => {
    router.push('/admin')
  }

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
          const userId = Number(localStorage.getItem("user_id")) || 1
          const parsedBeListTemp = jsonData
          .slice(1)
          .map((row: (string | number | boolean | Date)[]) => ({
            sbd: row[0] as number,
            user_id: userId,
            name: row[1] as string,
            gender: row[2] as string,
            age: row[3] as number,
            dob: row[4] as string,
            lop: row[5] as string,
            parent: row[6] as string,
            phone: row[7] as string,
            address: row[8] as string,
          }))
          .filter((be) => be.sbd)

          setGeneratingQR(true)

          const qrPromises = parsedBeListTemp.map((be) => generateQRForBe(be))
          const qrBase64List = await Promise.all(qrPromises)

          // Batch save to MySQL API
          try {
            const response = await fetch('/api/bes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bes: parsedBeListTemp.map((be, index) => ({ ...be, qrBase64: qrBase64List[index] }))
              })
            })
            if (!response.ok) {
              throw new Error(`API error: ${response.status}`)
            }
            console.log("Lưu thành công vào MySQL!")
          } catch (mysqlError) {
            console.error("Lỗi lưu MySQL:", mysqlError)
            const parsedBeListWithQR = parsedBeListTemp.map((be, index) => ({ ...be, qrBase64: qrBase64List[index] }))
            localStorage.setItem("beList", JSON.stringify(parsedBeListWithQR))
            alert("Lưu localStorage (MySQL lỗi). Kiểm tra kết nối DB.")
            setBeList(parsedBeListWithQR)
            return
          }

          const parsedBeListWithQR = parsedBeListTemp.map((be, index) => ({ ...be, qrBase64: qrBase64List[index] }))
          setBeList(parsedBeListWithQR)
          localStorage.setItem("beList", JSON.stringify(parsedBeListWithQR))
          alert(`Đã upload thành công ${parsedBeListWithQR.length} bé và tạo QR! Lưu MySQL + local. 📚✨`)
          setShowUploadModal(false)
        } catch (error) {
          console.error("Lỗi upload:", error)
          alert("Lỗi upload file! Kiểm tra format Excel.")
        } finally {
          setGeneratingQR(false)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      alert("Vui lòng chọn file Excel (.xlsx)! ❌")
    }
  }

 const handleDownloadAllQR = async () => {
  setDownloadingZip(true);
  try {
    if (beList.length === 0) {
      throw new Error('Chưa có danh sách bé! Upload trước nhé. 📚');
    }
    const qrCount = beList.filter((b) => b.qrBase64).length;
    if (qrCount === 0) {
      console.log('Không có qrBase64 trong beList, gọi API /api/qr');
      const response = await fetch('/api/qr', {
        headers: { 'user-id': localStorage.getItem('user_id') || '1' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      const zipBlob = await response.blob();
      if (zipBlob.size === 0) {
        throw new Error('File ZIP rỗng từ API. Kiểm tra dữ liệu MySQL.');
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = 'QR_codes_tat_ca_be.zip';
      link.click();
      URL.revokeObjectURL(link.href);
      alert('Đã tải ZIP từ MySQL! 💾 In ra dán bảng tên bé nhé!');
      return;
    }

    console.log('beList with QR:', beList.filter((b) => b.qrBase64));

    const zip = new JSZip();
    beList.forEach((be) => {
      if (be.qrBase64) {
        const filename = `QR_be_${be.sbd}_${be.name.replace(/\s+/g, '_')}.png`;
        zip.file(filename, be.qrBase64.split(',')[1], { base64: true });
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    if (zipBlob.size === 0) {
      throw new Error('File ZIP rỗng. Kiểm tra dữ liệu qrBase64 trong beList.');
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = 'QR_codes_tat_ca_be.zip';
    link.click();
    URL.revokeObjectURL(link.href);
    alert(`Đã tải ZIP chứa ${qrCount} mã QR! 💾 In ra dán bảng tên bé nhé!`);
  } catch (err) {
    console.error('Lỗi tải ZIP:', err);
  } finally {
    setDownloadingZip(false);
  }
};

// Callback for upload success
  const handleUploadSuccess = (newBeList: BeInfo[]) => {
    setBeList(newBeList)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  })

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-accent/30 via-background to-secondary/20">
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
        {/* Admin Management Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdminClick}
          className="px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-primary/50 bg-secondary/90 hover:bg-secondary text-secondary-foreground font-bold backdrop-blur min-w-[80px] justify-center"
        >
          <Settings className="w-5 h-5 hidden md:block" />
          <span className="ml-0 md:ml-2 text-xs md:text-sm">Admin</span>
        </Button>
      </div>

     <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {/* Upload Excel Button - Now a separate component */}
        <UploadExcelModal onUploadSuccess={handleUploadSuccess} beList={beList} />

        {/* Download QR Button - Now a separate component */}
        <DownloadQRButton beList={beList} />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-40 right-20 w-32 h-32 bg-secondary/20 rounded-full blur-2xl animate-pulse delay-300" />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-accent/20 rounded-full blur-xl animate-pulse delay-700" />
      </div>

      <Card className="relative max-w-2xl w-full p-8 md:p-12 shadow-2xl border-4 border-primary/20 bg-card/95 backdrop-blur">
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Decorative stars */}
          <div className="flex gap-4 animate-bounce">
            <Star className="w-8 h-8 text-primary fill-primary" />
            <Sparkles className="w-10 h-10 text-secondary fill-secondary" />
            <Star className="w-8 h-8 text-accent fill-accent" />
          </div>

          {/* Greeting message */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-7xl font-bold text-primary leading-tight text-balance">
              Xin chào bé ngoan! 👋
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">Hôm nay bé học gì vui nhỉ? ✨</p>
          </div>

          {/* QR Scanner button */}
          <Button
            size="lg"
            onClick={handleScanClick}
            className="text-2xl md:text-3xl px-8 md:px-12 py-6 md:py-8 h-auto rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          >
            <QrCode className="w-10 h-10 mr-4" />
            Quét mã QR 
          </Button>

          {cameraError && (
            <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg max-w-md text-center">
              <p className="font-semibold">Lỗi Camera:</p>
              <p>{cameraError}</p>
              <Button onClick={handleFixPermission} variant="outline" size="sm" className="mt-2 bg-transparent">
                📋 Xem hướng dẫn sửa lỗi
              </Button>
            </div>
          )}

          {/* Scanner UI */}
          {showScanner && (
            <div className="relative w-full max-w-md">
              <Button
                onClick={handleCloseScanner}
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 z-10 rounded-full w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="w-full h-64 bg-gray-900 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <Scanner onScan={handleScan} onError={handleError} constraints={constraints} />
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">Đưa mã QR vào khung để quét</p>

              {/* Fallback file upload */}
              {showFileFallback && (
                <div className="mt-4 p-4 bg-accent/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">Camera không sẵn sàng? Thử upload ảnh QR:</p>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileScan} className="hidden" />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Chọn ảnh QR
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </main>
  )
}