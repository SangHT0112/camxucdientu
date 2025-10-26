// src/components/DownloadQRButton.tsx
"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import JSZip from "jszip"
import { toast } from "sonner" // Assuming sonner for toasts, replace with alert if not
import { BeInfo } from "@/types/BeInfo"

interface DownloadQRButtonProps {
  beList: BeInfo[] // Current beList
}

export function DownloadQRButton({ beList }: DownloadQRButtonProps) {
  const [downloadingZip, setDownloadingZip] = useState(false)

  const handleDownloadAllQR = async () => {
    setDownloadingZip(true)
    try {
      if (beList.length === 0) {
        throw new Error('Chưa có danh sách bé! Upload trước nhé. 📚')
      }
      const qrCount = beList.filter((b) => b.qrBase64).length
      if (qrCount === 0) {
        console.log('Không có qrBase64 trong beList, gọi API /api/qr')
        const response = await fetch('/api/qr', {
          headers: { 'user-id': localStorage.getItem('user_id') || '1' },
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `API error: ${response.status}`)
        }
        const zipBlob = await response.blob()
        if (zipBlob.size === 0) {
          throw new Error('File ZIP rỗng từ API. Kiểm tra dữ liệu MySQL.')
        }
        const link = document.createElement('a')
        link.href = URL.createObjectURL(zipBlob)
        link.download = 'QR_codes_tat_ca_be.zip'
        link.click()
        URL.revokeObjectURL(link.href)
        toast.success('Đã tải ZIP từ MySQL! 💾 In ra dán bảng tên bé nhé!')
        setDownloadingZip(false)
        return
      }

      console.log('beList with QR:', beList.filter((b) => b.qrBase64))

      const zip = new JSZip()
      beList.forEach((be) => {
        if (be.qrBase64) {
          const filename = `QR_be_${be.sbd}_${be.name.replace(/\s+/g, '_')}.png`
          zip.file(filename, be.qrBase64.split(',')[1], { base64: true })
        }
      })

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      if (zipBlob.size === 0) {
        throw new Error('File ZIP rỗng. Kiểm tra dữ liệu qrBase64 trong beList.')
      }

      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = 'QR_codes_tat_ca_be.zip'
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success(`Đã tải ZIP chứa ${qrCount} mã QR! 💾 In ra dán bảng tên bé nhé!`)
    } catch (err) {
      console.error('Lỗi tải ZIP:', err)
      toast.error('Lỗi tải ZIP: ' + (err as Error).message)
    } finally {
      setDownloadingZip(false)
    }
  }

  return (
    <Button
      size="sm"
      onClick={handleDownloadAllQR}
      disabled={downloadingZip}
      className="px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-secondary/90 hover:bg-secondary text-secondary-foreground font-bold backdrop-blur min-w-[80px] justify-center"
    >
      {downloadingZip ? <Loader2 className="w-5 h-5 hidden md:block animate-spin" /> : <Download className="w-5 h-5 hidden md:block" />}
      <span className="ml-0 md:ml-2 text-xs md:text-sm">
        {downloadingZip ? "Đang tải..." : `Tải QR (${beList.filter((b) => b.qrBase64).length})`}
      </span>
    </Button>
  )
}