"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, QrCode, Pencil, Trash2, Loader2 } from "lucide-react"
import { QRCodeGenerator } from "@/components/qr-code-generator"
import { toast } from "sonner" // Giả sử dùng sonner cho toast, hoặc thay bằng alert nếu chưa có

type Student = {
  id: string
  sbd: number
  user_id: number
  name: string
  gender: string
  age: number
  dob: string
  lop: string
  parent: string
  phone: string
  address: string | null
  qrBase64?: string | null
  avatar?: string | null
  createdAt: string
  studentCode: string
  class: string // Alias for lop in display
  dateOfBirth: string // Alias for dob in display
}

type BeInfo = {
  sbd: number
  name: string
  lop: string
  dob: string
  created_at?: string
  user_id: number
  gender: string
  age: number
  parent: string
  phone: string
  address: string | null
  qrBase64?: string | null
  avatar?: string | null
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showQRCode, setShowQRCode] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false) // Thêm state cho upload
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.id;
  if (!userId) {
    // Redirect nếu không có userId
    useEffect(() => {
      window.location.href = '/login'
    }, [])
    return null
  }
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    age: 0,
    dateOfBirth: "",
    class: "",
    parent: "",
    phone: "",
    address: "",
    avatar: "",
    studentCode: "",
  })

  // 🔥 Load students từ API MySQL (tương tự /api/bes)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/bes', {
          headers: {
            'user-id': userId.toString(),
          },
        })
        if (!response.ok) {
          throw new Error('Lỗi load danh sách học sinh')
        }
        const data = await response.json()
        console.log('Fetched data:', data) // Debug: Log data fetch
        // Map data từ BeInfo sang Student (đầy đủ fields)
        const mappedStudents: Student[] = data.map((be: BeInfo) => ({
          id: be.sbd.toString(),  // Dùng sbd làm id
          sbd: be.sbd,
          user_id: be.user_id,
          name: be.name,
          gender: be.gender,
          age: be.age,
          dob: be.dob,
          lop: be.lop,
          parent: be.parent,
          phone: be.phone,
          address: be.address,
          qrBase64: be.qrBase64,
          avatar: be.avatar,
          createdAt: be.created_at || new Date().toISOString(),
          studentCode: be.sbd.toString().padStart(3, '0'),  // Ví dụ: 001 cho sbd=1
          class: be.lop,
          dateOfBirth: be.dob,
        }))
        setStudents(mappedStudents)
      } catch (err) {
        console.error('Lỗi fetch students:', err)
        setError('Không thể load danh sách. Kiểm tra kết nối.')
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [userId])

  const handleAddStudent = async () => {
    if (!formData.name || !formData.dateOfBirth || !formData.class) {
      toast.error('Vui lòng điền họ tên, ngày sinh và lớp.')
      return
    }
    try {
      const newSbd = Math.max(...students.map(s => s.sbd), 0) + 1 // Tính sbd mới an toàn hơn
      const newStudentData = {
        sbd: newSbd,
        user_id: userId,
        name: formData.name,
        gender: formData.gender || 'Nam',  // Default nếu trống
        age: formData.age || 0,
        dob: formData.dateOfBirth,
        lop: formData.class,
        parent: formData.parent || 'Cha mẹ',
        phone: formData.phone || '',
        address: formData.address || null,
        avatar: formData.avatar || null,
      }
      console.log('Adding student data:', newStudentData) // Debug: Log data trước POST
      const response = await fetch('/api/bes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user-id': userId.toString(), // Thêm header nếu API cần
        },
        body: JSON.stringify({ bes: [newStudentData] })
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Lỗi thêm học sinh')
      }
      // Refetch thay vì reload để tránh flash
      const fetchStudents = async () => {
        try {
          const res = await fetch('/api/bes', {
            headers: { 'user-id': userId.toString() },
          })
          if (res.ok) {
            const data = await res.json()
            const mappedStudents: Student[] = data.map((be: BeInfo) => ({
              id: be.sbd.toString(),
              sbd: be.sbd,
              user_id: be.user_id,
              name: be.name,
              gender: be.gender,
              age: be.age,
              dob: be.dob,
              lop: be.lop,
              parent: be.parent,
              phone: be.phone,
              address: be.address,
              qrBase64: be.qrBase64,
              avatar: be.avatar,
              createdAt: be.created_at || new Date().toISOString(),
              studentCode: be.sbd.toString().padStart(3, '0'),
              class: be.lop,
              dateOfBirth: be.dob,
            }))
            setStudents(mappedStudents)
          }
        } catch (err) {
          console.error('Refetch error:', err)
        }
      }
      await fetchStudents()
      setFormData({ 
        name: "", 
        gender: "", 
        age: 0, 
        dateOfBirth: "", 
        class: "", 
        parent: "", 
        phone: "", 
        address: "", 
        avatar: "", 
        studentCode: "" 
      })
      setIsAddDialogOpen(false)
      toast.success('Thêm học sinh thành công!')
    } catch (err) {
      console.error('Add error:', err)
      toast.error('Lỗi thêm học sinh: ' + (err as Error).message)
    }
  }

  const handleUploadImage = async (file: File) => {
    if (!file) return null
    setUploading(true)
    try {
      const formDataImg = new FormData()
      formDataImg.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataImg,
      })
      if (!res.ok) {
        throw new Error('Upload failed')
      }
      const data = await res.json()
      console.log('Upload success, URL:', data.secure_url) // Debug: Log URL
      return data.secure_url  // ✅ link ảnh
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Lỗi upload ảnh: ' + (err as Error).message)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleEditStudent = async () => {
    if (!selectedStudent || !formData.name || !formData.dateOfBirth || !formData.class) {
      toast.error('Vui lòng điền họ tên, ngày sinh và lớp.')
      return
    }
    try {
      const updatedData = {
        user_id: userId,
        sbd: selectedStudent.sbd,
        name: formData.name,
        gender: formData.gender || selectedStudent.gender,  // Giữ cũ nếu trống
        age: formData.age !== undefined ? formData.age : selectedStudent.age,
        dob: formData.dateOfBirth || selectedStudent.dateOfBirth,
        lop: formData.class,
        parent: formData.parent || selectedStudent.parent,
        phone: formData.phone || selectedStudent.phone,
        address: formData.address !== undefined ? (formData.address || null) : selectedStudent.address,
        avatar: formData.avatar || selectedStudent.avatar || null,
      }
      console.log('Updating student data:', updatedData) // Debug: Log data trước POST
      const response = await fetch('/api/bes', {
        method: 'POST',  // Upsert via POST batch
        headers: { 
          'Content-Type': 'application/json',
          'user-id': userId.toString(), // Thêm header nếu cần
        },
        body: JSON.stringify({ bes: [updatedData] })
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Lỗi cập nhật học sinh')
      }
      // Refetch thay vì reload
      const fetchStudents = async () => {
        try {
          const res = await fetch('/api/bes', {
            headers: { 'user-id': userId.toString() },
          })
          if (res.ok) {
            const data = await res.json()
            const mappedStudents: Student[] = data.map((be: BeInfo) => ({
              id: be.sbd.toString(),
              sbd: be.sbd,
              user_id: be.user_id,
              name: be.name,
              gender: be.gender,
              age: be.age,
              dob: be.dob,
             lop: be.lop,
              parent: be.parent,
              phone: be.phone,
              address: be.address,
              qrBase64: be.qrBase64,
              avatar: be.avatar,
              createdAt: be.created_at || new Date().toISOString(),
              studentCode: be.sbd.toString().padStart(3, '0'),
              class: be.lop,
              dateOfBirth: be.dob,
            }))
            setStudents(mappedStudents)
          }
        } catch (err) {
          console.error('Refetch error:', err)
        }
      }
      await fetchStudents()
      setIsEditDialogOpen(false)
      setSelectedStudent(null)
      setFormData({ 
        name: "", 
        gender: "", 
        age: 0, 
        dateOfBirth: "", 
        class: "", 
        parent: "", 
        phone: "", 
        address: "", 
        avatar: "", 
        studentCode: "" 
      })
      toast.success('Cập nhật học sinh thành công!')
    } catch (err) {
      console.error('Edit error:', err)
      toast.error('Lỗi cập nhật: ' + (err as Error).message)
    }
  }

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa học sinh này?")) return
    try {
      // Note: Cần tạo API DELETE /api/bes/[id] nếu chưa có. Tạm dùng POST với flag delete
      // Hoặc implement DELETE endpoint
      const response = await fetch(`/api/bes/${id}`, { 
        method: 'DELETE',
        headers: { 'user-id': userId.toString() },
      })
      if (!response.ok) throw new Error('Lỗi xóa học sinh')
      // Refetch
      const fetchStudents = async () => {
        try {
          const res = await fetch('/api/bes', {
            headers: { 'user-id': userId.toString() },
          })
          if (res.ok) {
            const data = await res.json()
            const mappedStudents: Student[] = data.map((be: BeInfo) => ({
              id: be.sbd.toString(),
              sbd: be.sbd,
              user_id: be.user_id,
              name: be.name,
              gender: be.gender,
              age: be.age,
              dob: be.dob,
              lop: be.lop,
              parent: be.parent,
              phone: be.phone,
              address: be.address,
              qrBase64: be.qrBase64,
              avatar: be.avatar,
              createdAt: be.created_at || new Date().toISOString(),
              studentCode: be.sbd.toString().padStart(3, '0'),
              class: be.lop,
              dateOfBirth: be.dob,
            }))
            setStudents(mappedStudents)
          }
        } catch (err) {
          console.error('Refetch error:', err)
        }
      }
      await fetchStudents()
      toast.success('Xóa học sinh thành công!')
    } catch (err) {
      toast.error('Lỗi xóa: ' + (err as Error).message)
    }
  }

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student)
    setFormData({
      name: student.name,
      gender: student.gender,
      age: student.age,
      dateOfBirth: student.dateOfBirth,
      class: student.class,
      parent: student.parent,
      phone: student.phone,
      address: student.address || "",
      avatar: student.avatar || "",
      studentCode: student.studentCode,
    })
    setIsEditDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Đang load danh sách học sinh...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-destructive">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} className="ml-4">Thử lại</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý học sinh</h1>
          <p className="text-muted-foreground">Thêm, chỉnh sửa và tạo mã QR cho học sinh</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Thêm học sinh
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Thêm học sinh mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Họ và tên</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentCode">Mã học sinh</Label>
                <Input
                  id="studentCode"
                  value={formData.studentCode}
                  onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                  placeholder="HS001"
                  disabled // Tạm disable vì auto sbd
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Giới tính</Label>
                <Input
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  placeholder="Nam / Nữ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Tuổi</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  placeholder="18"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Lớp</Label>
                <Input
                  id="class"
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  placeholder="10A1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Tên phụ huynh</Label>
                <Input
                  id="parent"
                  value={formData.parent}
                  onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                  placeholder="Cha mẹ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Textarea
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Địa chỉ nhà..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Ảnh đại diện</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const url = await handleUploadImage(file)
                      if (url) {
                        setFormData({ ...formData, avatar: url })
                      }
                    }
                  }}
                />
                {uploading && <p className="text-sm text-muted-foreground">Đang upload...</p>}
                {formData.avatar && !uploading && (
                  <img
                    src={formData.avatar}
                    alt="Preview"
                    className="mt-2 w-24 h-24 object-cover rounded-full border"
                  />
                )}
              </div>
              <Button onClick={handleAddStudent} className="w-full" disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Thêm học sinh
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách học sinh ({students.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Chưa có học sinh nào. Nhấn &quot;Thêm học sinh&quot; để bắt đầu.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã học sinh</TableHead>
                  <TableHead>Họ và tên</TableHead>
                  <TableHead>Ảnh</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Ngày sinh</TableHead>
                  <TableHead>Giới tính</TableHead>
                  <TableHead>Tuổi</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.studentCode}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>
                      {student.avatar ? (
                        <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                          N/A
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{new Date(student.dateOfBirth).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell>{student.gender}</TableCell>
                    <TableCell>{student.age}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowQRCode(student)}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(student)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteStudent(student.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin học sinh</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-studentCode">Mã học sinh</Label>
              <Input
                id="edit-studentCode"
                value={formData.studentCode}
                disabled // Không chỉnh sửa sbd
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Họ và tên</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender">Giới tính</Label>
              <Input
                id="edit-gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-age">Tuổi</Label>
              <Input
                id="edit-age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-class">Lớp</Label>
              <Input
                id="edit-class"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dateOfBirth">Ngày sinh</Label>
              <Input
                id="edit-dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent">Tên phụ huynh</Label>
              <Input
                id="edit-parent"
                value={formData.parent}
                onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Số điện thoại</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Địa chỉ</Label>
              <Textarea
                id="edit-address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Ảnh đại diện</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const url = await handleUploadImage(file)
                    if (url) {
                      setFormData({ ...formData, avatar: url }) // ✅ Lưu URL Firebase/Cloudinary
                    }
                  }
                }}
              />
              {uploading && <p className="text-sm text-muted-foreground">Đang upload...</p>}
              {/* {formData.avatar && !uploading && (
                <img src={formData.avatar} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-full border" />
              )} */}
            </div>
            <Button onClick={handleEditStudent} className="w-full" disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cập nhật
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      {showQRCode && <QRCodeGenerator student={showQRCode} onClose={() => setShowQRCode(null)} />}
    </div>
  )
}