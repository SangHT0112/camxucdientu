"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Upload, ImageIcon } from "lucide-react"
import Image from "next/image"

type Emotion = {
  id: number
  child_id?: number
  child_name?: string
  class_name?: string
  name: string
  description: string
  imageUrl: string
  color: string
  date?: string
  createdAt: string
}

export default function EmotionsPage() {
  const [emotions, setEmotions] = useState<Emotion[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    color: "#3b82f6",
  })

  // Fetch danh sách emotions từ API khi load trang
  useEffect(() => {
    const fetchEmotions = async () => {
      try {
        const res = await fetch("/api/emotions")
        if (!res.ok) throw new Error("Lỗi load dữ liệu")
        const data: Emotion[] = await res.json()
        console.log("Fetched emotions:", data)
        setEmotions(data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchEmotions()
  }, [])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddEmotion = async () => {
  if (!formData.name || !formData.imageUrl) {
    alert("Vui lòng nhập tên và chọn hình ảnh cho cảm xúc")
    return
  }

  try {
    const res = await fetch("/api/emotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: formData.name,
        message: formData.description,
        audio: "", // Nếu chưa dùng, để trống
        image: formData.imageUrl,
      }),
    })
    if (!res.ok) throw new Error("Lỗi thêm cảm xúc")

    const updatedList = await fetch("/api/emotions").then(r => r.json())
    setEmotions(updatedList)

    setFormData({ name: "", description: "", imageUrl: "", color: "#3b82f6" })
    setIsAddDialogOpen(false)
  } catch (err) {
    console.error(err)
    alert("Thêm cảm xúc thất bại")
  }
}

  const handleEditEmotion = async () => {
    if (!selectedEmotion) return

    try {
      const res = await fetch("/api/emotions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEmotion.id,
          label: formData.name,
          message: formData.description,
          audio: "", // hoặc selectedEmotion.audio nếu có
          image: formData.imageUrl,
        }),
      })

      if (!res.ok) throw new Error("Lỗi cập nhật cảm xúc")

      const updatedList = await fetch("/api/emotions").then(r => r.json())
      setEmotions(updatedList)

      setFormData({ name: "", description: "", imageUrl: "", color: "#3b82f6" })
      setIsEditDialogOpen(false)
      setSelectedEmotion(null)
    } catch (err) {
      console.error(err)
      alert("Cập nhật cảm xúc thất bại")
    }
  }


  const handleDeleteEmotion = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa cảm xúc này?")) return
    try {
      const res = await fetch(`/api/emotions?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Xóa thất bại")
      setEmotions(emotions.filter(e => e.id !== id))
    } catch (err) {
      console.error(err)
      alert("Xóa thất bại")
    }
  }

  const openEditDialog = (emotion: Emotion) => {
    setSelectedEmotion(emotion)
    setFormData({
      name: emotion.name,
      description: emotion.description,
      imageUrl: emotion.imageUrl,
      color: emotion.color,
    })
    setIsEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý cảm xúc</h1>
          <p className="text-muted-foreground">Thêm và quản lý các loại cảm xúc với hình ảnh</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Thêm cảm xúc
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm cảm xúc mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên cảm xúc</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Vui vẻ, Buồn, Tức giận..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về cảm xúc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Màu sắc</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20"
                  />
                  <Input value={formData.color} readOnly className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hình ảnh</Label>
                <div className="flex flex-col gap-2">
                  {formData.imageUrl && (
                    <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
                      <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {formData.imageUrl ? "Thay đổi hình ảnh" : "Tải lên hình ảnh"}
                  </Button>
                </div>
              </div>
              <Button onClick={handleAddEmotion} className="w-full">
                Thêm cảm xúc
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách cảm xúc ({emotions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {emotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Chưa có cảm xúc nào. Nhấn "Thêm cảm xúc" để bắt đầu.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {emotions.map((emotion) => (
                <Card key={emotion.id} className="overflow-hidden">
                  <div className="relative h-48 w-full" style={{ backgroundColor: emotion.color + "20" }}>
                    <Image src={emotion.imageUrl || "/placeholder.svg"} alt={emotion.name} fill className="object-cover" />
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-3 space-y-1">
                      <h3 className="font-semibold">{emotion.name}</h3>
                      {emotion.description && <p className="text-sm text-muted-foreground">{emotion.description}</p>}
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: emotion.color }} />
                        <span className="text-xs text-muted-foreground">{emotion.color}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(emotion)} className="flex-1">
                        <Pencil className="mr-1 h-3 w-3" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteEmotion(emotion.id)}
                        className="flex-1"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Xóa
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cảm xúc</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Tên cảm xúc</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Mô tả</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Màu sắc</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20"
                />
                <Input value={formData.color} readOnly className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hình ảnh</Label>
              <div className="flex flex-col gap-2">
                {formData.imageUrl && (
                  <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
                    <Image src={formData.imageUrl || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                  </div>
                )}
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, true)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => editFileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Thay đổi hình ảnh
                </Button>
              </div>
            </div>
            <Button onClick={handleEditEmotion} className="w-full">
              Cập nhật
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
