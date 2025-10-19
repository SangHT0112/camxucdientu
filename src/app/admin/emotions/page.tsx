"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Upload, ImageIcon, Link, File, ExternalLink } from "lucide-react"
import Image from "next/image"

type Emotion = {
  id: number
  child_id?: number
  child_name?: string
  class_name?: string
  label: string
  message: string
  image: string  // URL hoặc path /uploads/xxx.png
  color: string
  date?: string
  created_at?: string
  audio?: string  // URL hoặc path /uploads/xxx.mp3
  updated_at?: string
}

export default function EmotionsPage() {
  const [emotions, setEmotions] = useState<Emotion[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null)
  
  // Refs cho add
  const imageUrlInputRef = useRef<HTMLInputElement>(null)
  const imageFileInputRef = useRef<HTMLInputElement>(null)
  const audioUrlInputRef = useRef<HTMLInputElement>(null)
  const audioFileInputRef = useRef<HTMLInputElement>(null)
  
  // Refs cho edit
  const editImageUrlInputRef = useRef<HTMLInputElement>(null)
  const editImageFileInputRef = useRef<HTMLInputElement>(null)
  const editAudioUrlInputRef = useRef<HTMLInputElement>(null)
  const editAudioFileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    label: "",
    message: "",
    image: "",
    audio: "",
    color: "#3b82f6",
  })
  const [previewImage, setPreviewImage] = useState<string>("")
  const [previewAudio, setPreviewAudio] = useState<string>("")
  
  // Mode: 'url' hoặc 'file'
  const [imageMode, setImageMode] = useState<'url' | 'file'>('url')
  const [audioMode, setAudioMode] = useState<'url' | 'file'>('url')
  
  // Edit modes
  const [editImageMode, setEditImageMode] = useState<'url' | 'file'>('url')
  const [editAudioMode, setEditAudioMode] = useState<'url' | 'file'>('url')

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

  const handleImageUrlInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    if (url) {
      setPreviewImage(url)
      setFormData({ ...formData, image: url })
    } else {
      setPreviewImage("")
      setFormData({ ...formData, image: "" })
    }
  }

  const handleAudioUrlInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    if (url) {
      setPreviewAudio(url)
      setFormData({ ...formData, audio: url })
    } else {
      setPreviewAudio("")
      setFormData({ ...formData, audio: "" })
    }
  }

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
      // formData.image sẽ được set path từ API
    }
  }

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewAudio(reader.result as string)
      }
      reader.readAsDataURL(file)
      // formData.audio sẽ được set path từ API
    }
  }

  const handleAddEmotion = async () => {
    if (!formData.label || (!imageMode || !formData.image) && (!imageFileInputRef.current?.files?.[0] && !audioFileInputRef.current?.files?.[0])) {
      alert("Vui lòng nhập tên và chọn hình ảnh (URL hoặc file)")
      return
    }

    const formDataToSend = new FormData()
    formDataToSend.append("label", formData.label)
    formDataToSend.append("message", formData.message)
    formDataToSend.append("color", formData.color)
    
    // Image
    if (imageMode === 'url' && formData.image) {
      formDataToSend.append("imageUrl", formData.image)
    } else if (imageFileInputRef.current?.files?.[0]) {
      formDataToSend.append("imageFile", imageFileInputRef.current.files[0])
    }
    
    // Audio
    if (audioMode === 'url' && formData.audio) {
      formDataToSend.append("audioUrl", formData.audio)
    } else if (audioFileInputRef.current?.files?.[0]) {
      formDataToSend.append("audioFile", audioFileInputRef.current.files[0])
    }

    try {
      const res = await fetch("/api/emotions", {
        method: "POST",
        body: formDataToSend,
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Lỗi thêm cảm xúc")
      }

      const updatedList = await fetch("/api/emotions").then(r => r.json())
      setEmotions(updatedList)

      // Reset
      setFormData({ label: "", message: "", image: "", audio: "", color: "#3b82f6" })
      setPreviewImage("")
      setPreviewAudio("")
      setImageMode('url')
      setAudioMode('url')
      if (imageUrlInputRef.current) imageUrlInputRef.current.value = ""
      if (audioUrlInputRef.current) audioUrlInputRef.current.value = ""
      if (imageFileInputRef.current) imageFileInputRef.current.value = ""
      if (audioFileInputRef.current) audioFileInputRef.current.value = ""
      setIsAddDialogOpen(false)
    } catch (err) {
      console.error(err)
      alert("Thêm cảm xúc thất bại: " + (err as Error).message)
    }
  }

  const handleEditEmotion = async () => {
    if (!selectedEmotion || (!editImageMode || !formData.image) && (!editImageFileInputRef.current?.files?.[0] && !editAudioFileInputRef.current?.files?.[0])) {
      alert("Vui lòng chọn hình ảnh mới (URL hoặc file) để cập nhật")
      return
    }

    const formDataToSend = new FormData()
    formDataToSend.append("id", selectedEmotion.id.toString())
    formDataToSend.append("label", formData.label)
    formDataToSend.append("message", formData.message)
    formDataToSend.append("color", formData.color)
    
    // Image
    if (editImageMode === 'url' && formData.image) {
      formDataToSend.append("imageUrl", formData.image)
    } else if (editImageFileInputRef.current?.files?.[0]) {
      formDataToSend.append("imageFile", editImageFileInputRef.current.files[0])
    }
    
    // Audio
    if (editAudioMode === 'url' && formData.audio) {
      formDataToSend.append("audioUrl", formData.audio)
    } else if (editAudioFileInputRef.current?.files?.[0]) {
      formDataToSend.append("audioFile", editAudioFileInputRef.current.files[0])
    }

    try {
      const res = await fetch("/api/emotions", {
        method: "PUT",
        body: formDataToSend,
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Lỗi cập nhật cảm xúc")
      }

      const updatedList = await fetch("/api/emotions").then(r => r.json())
      setEmotions(updatedList)

      // Reset
      setFormData({ label: "", message: "", image: "", audio: "", color: "#3b82f6" })
      setPreviewImage("")
      setPreviewAudio("")
      setEditImageMode('url')
      setEditAudioMode('url')
      if (editImageUrlInputRef.current) editImageUrlInputRef.current.value = ""
      if (editAudioUrlInputRef.current) editAudioUrlInputRef.current.value = ""
      if (editImageFileInputRef.current) editImageFileInputRef.current.value = ""
      if (editAudioFileInputRef.current) editAudioFileInputRef.current.value = ""
      setIsEditDialogOpen(false)
      setSelectedEmotion(null)
    } catch (err) {
      console.error(err)
      alert("Cập nhật cảm xúc thất bại: " + (err as Error).message)
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
      label: emotion.label,
      message: emotion.message,
      image: emotion.image,
      audio: emotion.audio || "",
      color: emotion.color,
    })
    setPreviewImage(emotion.image)
    setPreviewAudio(emotion.audio || "")
    // Detect mode from existing data (if starts with http, url; else file)
    setEditImageMode(emotion.image.startsWith('http') ? 'url' : 'file')
    setEditAudioMode((emotion.audio || '').startsWith('http') ? 'url' : 'file')
    setIsEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý cảm xúc</h1>
          <p className="text-muted-foreground">Thêm và quản lý các loại cảm xúc với hình ảnh và âm thanh (URL hoặc file)</p>
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
                <Label htmlFor="label">Tên cảm xúc</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Vui vẻ, Buồn, Tức giận..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Mô tả</Label>
                <Input
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant={imageMode === 'url' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImageMode('url')}
                    >
                      <Link className="mr-1 h-3 w-3" />
                      URL
                    </Button>
                    <Button
                      type="button"
                      variant={imageMode === 'file' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImageMode('file')}
                    >
                      <File className="mr-1 h-3 w-3" />
                      File
                    </Button>
                  </div>
                  {imageMode === 'url' ? (
                    <div className="flex flex-col gap-2">
                      {previewImage && (
                        <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
                          <Image src={previewImage} alt="Preview" fill className="object-cover" />
                        </div>
                      )}
                      <input
                        ref={imageUrlInputRef}
                        type="url"
                        placeholder="https://example.com/image.png"
                        onChange={(e) => handleImageUrlInput(e)}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => imageUrlInputRef.current?.focus()}
                        className="w-full"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Nhập URL hình ảnh
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {previewImage && (
                        <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
                          <Image src={previewImage} alt="Preview" fill className="object-cover" />
                        </div>
                      )}
                      <input
                        ref={imageFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => imageFileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Tải lên file hình ảnh
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Âm thanh (tùy chọn)</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant={audioMode === 'url' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAudioMode('url')}
                    >
                      <Link className="mr-1 h-3 w-3" />
                      URL
                    </Button>
                    <Button
                      type="button"
                      variant={audioMode === 'file' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAudioMode('file')}
                    >
                      <File className="mr-1 h-3 w-3" />
                      File
                    </Button>
                  </div>
                  {audioMode === 'url' ? (
                    <div className="flex flex-col gap-2">
                      {previewAudio && (
                        <div className="relative h-12 w-full overflow-hidden rounded-lg border">
                          <audio controls className="w-full">
                            <source src={previewAudio} type="audio/mpeg" />
                            Trình duyệt không hỗ trợ audio.
                          </audio>
                        </div>
                      )}
                      <input
                        ref={audioUrlInputRef}
                        type="url"
                        placeholder="https://example.com/audio.mp3"
                        onChange={(e) => handleAudioUrlInput(e)}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => audioUrlInputRef.current?.focus()}
                        className="w-full"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Nhập URL âm thanh
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {previewAudio && (
                        <div className="relative h-12 w-full overflow-hidden rounded-lg border">
                          <audio controls className="w-full">
                            <source src={previewAudio} type="audio/mpeg" />
                            Trình duyệt không hỗ trợ audio.
                          </audio>
                        </div>
                      )}
                      <input
                        ref={audioFileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioFileUpload(e)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => audioFileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Tải lên file âm thanh
                      </Button>
                    </div>
                  )}
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
              <p className="text-muted-foreground">Chưa có cảm xúc nào. Nhấn &quot;Thêm cảm xúc&quot; để bắt đầu.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {emotions.map((emotion) => (
                <Card key={emotion.id} className="overflow-hidden">
                  <div className="relative h-48 w-full" style={{ backgroundColor: emotion.color + "20" }}>
                    <Image src={emotion.image || "/placeholder.svg"} alt={emotion.label} fill className="object-cover" />
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-3 space-y-1">
                      <h3 className="font-semibold">{emotion.label}</h3>
                      {emotion.message && <p className="text-sm text-muted-foreground">{emotion.message}</p>}
                      {emotion.audio && (
                        <audio controls className="w-full mt-2">
                          <source src={emotion.audio} type="audio/mpeg" />
                          Trình duyệt không hỗ trợ audio.
                        </audio>
                      )}
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
              <Label htmlFor="edit-label">Tên cảm xúc</Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-message">Mô tả</Label>
              <Input
                id="edit-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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
              <Label>Hình ảnh (bắt buộc chọn mới để cập nhật)</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant={editImageMode === 'url' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditImageMode('url')}
                  >
                    <Link className="mr-1 h-3 w-3" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    variant={editImageMode === 'file' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditImageMode('file')}
                  >
                    <File className="mr-1 h-3 w-3" />
                    File
                  </Button>
                </div>
                {editImageMode === 'url' ? (
                  <div className="flex flex-col gap-2">
                    {previewImage && (
                      <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
                        <Image src={previewImage || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                      </div>
                    )}
                    <input
                      ref={editImageUrlInputRef}
                      type="url"
                      placeholder="https://example.com/image.png"
                      onChange={(e) => handleImageUrlInput(e)}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2"
                      defaultValue={formData.image}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => editImageUrlInputRef.current?.focus()}
                      className="w-full"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Nhập URL hình ảnh mới
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {previewImage && (
                      <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
                        <Image src={previewImage || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                      </div>
                    )}
                    <input
                      ref={editImageFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => editImageFileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Tải lên file hình ảnh mới
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Âm thanh (tùy chọn)</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant={editAudioMode === 'url' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditAudioMode('url')}
                  >
                    <Link className="mr-1 h-3 w-3" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    variant={editAudioMode === 'file' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditAudioMode('file')}
                  >
                    <File className="mr-1 h-3 w-3" />
                    File
                  </Button>
                </div>
                {editAudioMode === 'url' ? (
                  <div className="flex flex-col gap-2">
                    {previewAudio && (
                      <div className="relative h-12 w-full overflow-hidden rounded-lg border">
                        <audio controls className="w-full">
                          <source src={previewAudio} type="audio/mpeg" />
                          Trình duyệt không hỗ trợ audio.
                        </audio>
                      </div>
                    )}
                    <input
                      ref={editAudioUrlInputRef}
                      type="url"
                      placeholder="https://example.com/audio.mp3"
                      onChange={(e) => handleAudioUrlInput(e)}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2"
                      defaultValue={formData.audio}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => editAudioUrlInputRef.current?.focus()}
                      className="w-full"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Nhập URL âm thanh mới
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {previewAudio && (
                      <div className="relative h-12 w-full overflow-hidden rounded-lg border">
                        <audio controls className="w-full">
                          <source src={previewAudio} type="audio/mpeg" />
                          Trình duyệt không hỗ trợ audio.
                        </audio>
                      </div>
                    )}
                    <input
                      ref={editAudioFileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleAudioFileUpload(e)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => editAudioFileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Tải lên file âm thanh mới
                    </Button>
                  </div>
                )}
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