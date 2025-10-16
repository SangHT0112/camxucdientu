"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, QrCode, Pencil, Trash2, Loader2 } from "lucide-react"
import { QRCodeGenerator } from "@/components/qr-code-generator"

type Student = {
  id: string
  name: string
  studentCode: string
  class: string
  dateOfBirth: string
  createdAt: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showQRCode, setShowQRCode] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    studentCode: "",
    class: "",
    dateOfBirth: "",
  })

  // 🔥 Load students từ API MySQL (tương tự /api/bes)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/bes')  // Hoặc /api/students nếu bạn tạo riêng
        if (!response.ok) {
          throw new Error('Lỗi load danh sách học sinh')
        }
        const data = await response.json()
        // Map data từ BeInfo sang Student (adjust nếu cần)
        const mappedStudents: Student[] = data.map((be: any) => ({
          id: be.stt.toString(),  // Dùng stt làm id
          name: be.name,
          studentCode: be.stt.toString().padStart(3, '0'),  // Ví dụ: 001 cho stt=1
          class: be.lop,
          dateOfBirth: be.dob,
          createdAt: be.created_at || new Date().toISOString(),
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
  }, [])

  const handleAddStudent = async () => {
    try {
      const newStudentData = {
        stt: students.length + 1,  // Tự generate stt (hoặc từ backend)
        name: formData.name,
        gender: 'Nam',  // Default, adjust nếu cần
        age: 0,  // Default
        dob: formData.dateOfBirth,
        lop: formData.class,
        parent: 'Cha mẹ',  // Default
        phone: '',  // Default
        address: '',  // Default
      }
      const response = await fetch('/api/bes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bes: [newStudentData] })
      })
      if (!response.ok) throw new Error('Lỗi thêm học sinh')
      // Reload list
      window.location.reload()  // Simple reload, hoặc refetch như fetchStudents()
      setFormData({ name: "", studentCode: "", class: "", dateOfBirth: "" })
      setIsAddDialogOpen(false)
    } catch (err) {
      alert('Lỗi thêm học sinh: ' + (err as Error).message)
    }
  }

  const handleEditStudent = async () => {
    if (!selectedStudent) return
    try {
      const updatedData = {
        stt: parseInt(selectedStudent.id),
        name: formData.name,
        gender: 'Nam',  // Adjust nếu có field gender
        age: 0,
        dob: formData.dateOfBirth,
        lop: formData.class,
        parent: 'Cha mẹ',
        phone: '',
        address: '',
      }
      const response = await fetch('/api/bes', {
        method: 'POST',  // Upsert via POST batch
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bes: [updatedData] })
      })
      if (!response.ok) throw new Error('Lỗi cập nhật học sinh')
      window.location.reload()
      setIsEditDialogOpen(false)
      setSelectedStudent(null)
      setFormData({ name: "", studentCode: "", class: "", dateOfBirth: "" })
    } catch (err) {
      alert('Lỗi cập nhật: ' + (err as Error).message)
    }
  }

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa học sinh này?")) return
    try {
      // Note: Cần tạo API DELETE /api/bes/[id] nếu chưa có
      const response = await fetch(`/api/bes/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Lỗi xóa học sinh')
      window.location.reload()
    } catch (err) {
      alert('Lỗi xóa: ' + (err as Error).message)
    }
  }

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student)
    setFormData({
      name: student.name,
      studentCode: student.studentCode,
      class: student.class,
      dateOfBirth: student.dateOfBirth,
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
          <DialogContent>
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
              <Button onClick={handleAddStudent} className="w-full">
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
              <p className="text-muted-foreground">Chưa có học sinh nào. Nhấn "Thêm học sinh" để bắt đầu.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã học sinh</TableHead>
                  <TableHead>Họ và tên</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Ngày sinh</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.studentCode}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{new Date(student.dateOfBirth).toLocaleDateString("vi-VN")}</TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin học sinh</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Họ và tên</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-studentCode">Mã học sinh</Label>
              <Input
                id="edit-studentCode"
                value={formData.studentCode}
                onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
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
            <Button onClick={handleEditStudent} className="w-full">
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