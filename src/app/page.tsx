"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, QrCode, Sparkles, Star, Download, Loader2, X, ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import { useDropzone } from "react-dropzone"
import QRCode from "qrcode"
import JSZip from "jszip"
import { Scanner } from "@yudiel/react-qr-scanner"

interface BeInfo {
  sbd: number
  name: string
  gender: string
  age: number
  dob: string
  lop: string
  parent: string
  phone: string
  address: string
  qrBase64?: string
  user_id: number    
}

// 🔥 Fix: Thêm định nghĩa constraints cho Scanner (MediaTrackConstraints từ DOM types)
const constraints: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
}

interface QrCodeResult {
  rawValue: string
}

export default function PreschoolGreeting() {
  const [showScanner, setShowScanner] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [beList, setBeList] = useState<BeInfo[]>([])
  const [generatingQR, setGeneratingQR] = useState(false)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [cameraError, setCameraError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [showFileFallback, setShowFileFallback] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      alert("Bạn cần đăng nhập trước khi truy cập trang này!")
      router.push("/login") // Chuyển về trang login
    }
  }, [router])

  // Load beList từ API MySQL
  useEffect(() => {
    const fetchBeList = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/bes')
        if (response.ok) {
          const data = await response.json()
          setBeList(data)
          console.log(`Đã load ${data.length} bé từ MySQL!`)
          return
        } else {
          console.error(`API error: ${response.status}`)
          alert("Lỗi load dữ liệu từ CSDL. Vui lòng thử lại sau.")
        }
      } catch (error) {
        console.error("Lỗi load từ API:", error)
        alert("Lỗi kết nối CSDL. Vui lòng kiểm tra và thử lại.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchBeList()
  }, [])

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

  const handleError = (error: Error) => {
    console.error("❌ Scan error:", error)
    if (error.name === "NotAllowedError" || error.message.includes("Permission")) {
      setCameraError("Bị từ chối truy cập camera! Vui lòng cho phép quyền camera.")
      setShowFileFallback(true)
    } else if (error.name === "NotFoundError") {
      setCameraError("Không tìm thấy camera! Kiểm tra kết nối.")
      setShowFileFallback(true)
    } else {
      setCameraError("Lỗi quét: " + error.message)
    }
  }

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

  // Refresh beList từ DB sau khi upload thành công
  const refreshBeList = async () => {
    try {
      const response = await fetch('/api/bes')
      if (response.ok) {
        const data = await response.json()
        setBeList(data)
        console.log(`Đã refresh ${data.length} bé từ MySQL!`)
      }
    } catch (error) {
      console.error("Lỗi refresh từ API:", error)
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
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          const userId = user.id;
          if (!userId) {
            alert("Không xác định được user_id. Vui lòng đăng nhập lại.");
            return;
          }

          const parsedBeListTemp = jsonData
          .slice(1)
          .map((row: (string | number | boolean | Date)[]) => ({
            sbd: row[0] as number,
            user_id: userId,     // thêm user_id
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

          // Refresh beList từ DB
          await refreshBeList()

          alert(`Đã upload thành công ${parsedBeListTemp.length} bé và tạo QR! Lưu vào CSDL. 📚✨`)
          setShowUploadModal(false)
        } catch (error) {
          console.error("Lỗi upload:", error)
          alert("Lỗi upload file! Kiểm tra format Excel hoặc kết nối CSDL.")
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
    // Kiểm tra nếu beList rỗng hoặc không có qrBase64
    if (beList.length === 0) {
      throw new Error('Chưa có danh sách bé! Upload trước nhé. 📚');
    }
    const qrCount = beList.filter((b) => b.qrBase64).length;
    if (qrCount === 0) {
      console.log('Không có qrBase64 trong beList, gọi API /api/qr');
      // Fallback sang API /api/qr
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

    // Debug: Kiểm tra qrBase64 trong beList
    console.log('beList with QR:', beList.filter((b) => b.qrBase64));

    // Tạo file ZIP từ beList
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
    // alert(`Lỗi tải file: ${err.message}. Kiểm tra dữ liệu hoặc thử lại.`);
  } finally {
    setDownloadingZip(false);
  }
};

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  })

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-accent/30 via-background to-secondary/20">
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Đang tải dữ liệu...</p>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-accent/30 via-background to-secondary/20">
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {/* Upload Excel Button */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              className="px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-primary/50 bg-secondary/90 hover:bg-secondary text-secondary-foreground font-bold backdrop-blur"
              disabled={generatingQR}
            >
              {generatingQR ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              <span className="ml-2 hidden md:inline">{generatingQR ? "Đang tạo QR..." : "Upload Excel"}</span>
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

        {/* Download QR ZIP Button */}
        {beList.length > 0 && (
          <Button
            size="sm"
            onClick={handleDownloadAllQR}
            disabled={downloadingZip}
            className="px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-secondary/90 hover:bg-secondary text-secondary-foreground font-bold backdrop-blur"
          >
            {downloadingZip ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span className="ml-2 hidden md:inline">
              {downloadingZip ? "Đang tải..." : `Tải QR (${beList.filter((b) => b.qrBase64).length})`}
            </span>
          </Button>
        )}
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
            {/* <p className="text-2xl md:text-4xl font-semibold text-secondary  leading-relaxed text-pretty">
              Chúc bé một ngày vui vẻ tại trường mầm non! 🌈
            </p> */}
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
              {/* <div className="w-full h-64 bg-gray-900 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <Scanner onScan={handleScan} onError={handleError} constraints={constraints} />
              </div> */}
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