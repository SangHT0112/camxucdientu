"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, QrCode, Pencil, Trash2, Loader2, Folder } from "lucide-react"
import { QRCodeGenerator } from "@/components/qr-code-generator"
import { UploadExcelModal } from "@/components/UploadExcelModal"
import { DownloadQRButton } from "@/components/DownloadQRButton"
import { toast } from "sonner" // Giả sử dùng sonner cho toast, hoặc thay bằng alert nếu chưa có
import Image from "next/image"
import { BeInfo } from "@/types/BeInfo"
import JSZip from "jszip" // Thêm import JSZip (cài đặt: npm install jszip)

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

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isZipUploadOpen, setIsZipUploadOpen] = useState(false) // Thêm state cho modal upload zip
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showQRCode, setShowQRCode] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false) // Thêm state cho upload
  const [zipUploading, setZipUploading] = useState(false) // State cho upload zip
  const [zipProgress, setZipProgress] = useState(0) // Progress cho zip upload
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

  const [userId, setUserId] = useState<number | null>(null);

  // Redirect nếu không có userId
  // Di chuyển logic localStorage vào useEffect (chỉ chạy client-side)
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const id = user?.id;
    setUserId(id);

    // Redirect nếu không có userId
    if (!id) {
      window.location.href = '/login';
    }
  }, []); // Dependency rỗng vì chỉ chạy 1 lần

  // 🔥 Load students từ API MySQL (tương tự /api/bes)
  useEffect(() => {
    if (!userId) return;
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
          lop: be.lop || '',
          parent: be.parent || '',
          phone: be.phone || '',
          address: be.address,
          qrBase64: be.qrBase64,
          avatar: be.avatar,
          createdAt: be.created_at || new Date().toISOString(),
          studentCode: be.sbd.toString().padStart(3, '0'),  // Ví dụ: 001 cho sbd=1
          class: be.lop || '',
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

  // Early return nếu chưa có userId (tránh render khi loading)
  if (userId === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Đang kiểm tra...</span>
      </div>
    );
  }

  if (!userId) {
    return null; // Hoặc redirect ở useEffect đã handle
  }

  // Callback for upload success - map BeInfo to Student
  const handleUploadSuccess = (newBeList: BeInfo[]) => {
    const mappedStudents: Student[] = newBeList.map((be: BeInfo) => ({
      id: be.sbd.toString(),
      sbd: be.sbd,
      user_id: be.user_id,
      name: be.name,
      gender: be.gender,
      age: be.age,
      dob: be.dob,
      lop: be.lop || '',
      parent: be.parent || '',
      phone: be.phone || '',
      address: be.address,
      qrBase64: be.qrBase64,
      avatar: be.avatar,
      createdAt: be.created_at || new Date().toISOString(),
      studentCode: be.sbd.toString().padStart(3, '0'),
      class: be.lop || '',
      dateOfBirth: be.dob,
    }))
    setStudents(mappedStudents)
  }

  // Map students to BeInfo for components (ensure address is string)
  const beListForComponents = students.map((student: Student) => ({
    sbd: student.sbd,
    name: student.name,
    gender: student.gender,
    age: student.age,
    dob: student.dob,
    lop: student.lop,
    parent: student.parent,
    phone: student.phone,
    address: student.address || '',
    qrBase64: student.qrBase64 || null,
    avatar: student.avatar || null,
    user_id: student.user_id,
  } as BeInfo))

  const handleAddStudent = async () => {
    console.log('handleAddStudent called'); // Debug log
    if (!formData.name?.trim() || !formData.dateOfBirth || !formData.class?.trim()) {
      toast.error('Vui lòng điền họ tên, ngày sinh và lớp.')
      return
    }
    try {
      const newSbd = Math.max(...students.map(s => s.sbd), 0) + 1 // Tính sbd mới an toàn hơn
      const newStudentData = {
        sbd: newSbd,
        user_id: userId,
        name: formData.name.trim(),
        gender: formData.gender?.trim() || 'Nam',  // Default nếu trống
        age: formData.age || 0,
        dob: formData.dateOfBirth,
        lop: formData.class.trim(),
        parent: formData.parent?.trim() || 'Cha mẹ',
        phone: formData.phone?.trim() || '',
        address: formData.address?.trim() || null,
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
      console.log('Add response status:', response.status); // Debug log response status
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
              lop: be.lop || '',
              parent: be.parent || '',
              phone: be.phone || '',
              address: be.address,
              qrBase64: be.qrBase64,
              avatar: be.avatar,
              createdAt: be.created_at || new Date().toISOString(),
              studentCode: be.sbd.toString().padStart(3, '0'),
              class: be.lop || '',
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

  const handleUploadImage = async (file: File | Blob): Promise<string | null> => {
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
      toast.success('Upload ảnh thành công!') // Thêm toast xác nhận upload
      return data.secure_url  // ✅ link ảnh
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Lỗi upload ảnh: ' + (err as Error).message)
      return null
    } finally {
      setUploading(false)
    }
  }

  // Thêm hàm xử lý upload zip
  const handleZipUpload = async (zipFile: File) => {
    if (!zipFile) return
    setZipUploading(true)
    setZipProgress(0)
    try {
      const zip = new JSZip()
      const contents = await zip.loadAsync(zipFile)
      const files = Object.values(contents.files).filter(file => !file.dir && (file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')))
      
      if (files.length === 0) {
        toast.error('Không tìm thấy file hình ảnh (.png, .jpg, .jpeg) trong zip.')
        return
      }

      let processed = 0
      const updates: BeInfo[] = []

      for (const zipFileEntry of files) {
        // Extract tên file từ path (bỏ folder, ví dụ "fileanhbaby/001.jpg" → "001.jpg")
        const fullPath = zipFileEntry.name
        const fileName = fullPath.split('/').pop() || fullPath // Lấy phần cuối sau '/'
        // Extract SBD từ tên file: ví dụ "001.jpg" → "001" → 1
        const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.')
        const parsedSbd = parseInt(fileNameWithoutExt, 10)
        
        if (isNaN(parsedSbd)) {
          console.warn(`Bỏ qua file không hợp lệ: ${fullPath} (tên file: ${fileName}, parsed: ${fileNameWithoutExt})`)
          continue
        }

        // Tìm student tương ứng
        const student = students.find(s => s.sbd === parsedSbd)
        if (!student) {
          console.warn(`Không tìm thấy học sinh với SBD: ${parsedSbd}`)
          continue
        }

        // Lấy blob của file từ zip
        const imageBlob = await zipFileEntry.async('blob')
        
        // Upload image
        const avatarUrl = await handleUploadImage(imageBlob)
        if (!avatarUrl) {
          console.error(`Lỗi upload cho SBD ${parsedSbd}`)
          continue
        }

        // Chuẩn bị update data
        updates.push({
          sbd: parsedSbd,
          user_id: userId!,
          name: student.name,
          gender: student.gender,
          age: student.age,
          dob: student.dateOfBirth,
          lop: student.lop,
          parent: student.parent,
          phone: student.phone,
          address: student.address,
          avatar: avatarUrl,
          qrBase64: student.qrBase64,
        } as BeInfo)

        processed++
        setZipProgress((processed / files.length) * 100)
      }

      // Batch update qua API nếu có updates
      if (updates.length > 0) {
        const response = await fetch('/api/bes', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'user-id': userId!.toString(),
          },
          body: JSON.stringify({ bes: updates })
        })
        if (!response.ok) {
          throw new Error('Lỗi cập nhật avatar từ zip')
        }
        // Refetch students
        const res = await fetch('/api/bes', {
          headers: { 'user-id': userId!.toString() },
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
            lop: be.lop || '',
            parent: be.parent || '',
            phone: be.phone || '',
            address: be.address,
            qrBase64: be.qrBase64,
            avatar: be.avatar,
            createdAt: be.created_at || new Date().toISOString(),
            studentCode: be.sbd.toString().padStart(3, '0'),
            class: be.lop || '',
            dateOfBirth: be.dob,
          }))
          setStudents(mappedStudents)
        }
        toast.success(`Cập nhật thành công ${updates.length} ảnh đại diện từ zip!`)
      } else {
        toast.warning('Không có ảnh nào được xử lý thành công.')
      }
    } catch (err) {
      console.error('Zip upload error:', err)
      toast.error('Lỗi xử lý zip: ' + (err as Error).message)
    } finally {
      setZipUploading(false)
      setZipProgress(0)
      setIsZipUploadOpen(false)
    }
  }

  const handleEditStudent = async () => {
    console.log('handleEditStudent called'); // Debug log đầu hàm
    console.log('selectedStudent:', selectedStudent); // Debug selectedStudent
    console.log('formData:', formData); // Debug formData
    // Chỉ validate name và dateOfBirth cho edit (class có thể empty nếu không thay đổi)
    if (!selectedStudent || !formData.name?.trim() || !formData.dateOfBirth) {
      console.log('Validation failed'); // Debug validation
      toast.error('Vui lòng điền họ tên và ngày sinh.')
      return
    }
    try {
      const updatedData = {
        user_id: userId,
        sbd: selectedStudent.sbd,
        name: formData.name.trim(),
        gender: formData.gender?.trim() || selectedStudent.gender,  // Giữ cũ nếu trống
        age: formData.age !== undefined && formData.age !== null ? formData.age : selectedStudent.age,
        dob: formData.dateOfBirth,
        lop: formData.class?.trim() || selectedStudent.lop || selectedStudent.class || '', // Giữ cũ nếu empty
        parent: formData.parent?.trim() || selectedStudent.parent,
        phone: formData.phone?.trim() || selectedStudent.phone,
        address: formData.address?.trim() !== undefined ? (formData.address?.trim() || null) : selectedStudent.address,
        avatar: formData.avatar || selectedStudent.avatar || null,
      }
      console.log('Updating student data (avatar):', updatedData.avatar) // Debug: Log avatar cụ thể
      console.log('Full updatedData:', updatedData); // Debug full data
      const response = await fetch('/api/bes', {
        method: 'POST',  // Upsert via POST batch
        headers: { 
          'Content-Type': 'application/json',
          'user-id': userId.toString(), // Thêm header nếu cần
        },
        body: JSON.stringify({ bes: [updatedData] })
      })
      console.log('Edit response status:', response.status); // Debug log response status
      console.log('Edit response ok:', response.ok); // Debug response.ok
      if (!response.ok) {
        const errData = await response.json()
        console.log('Edit error data:', errData); // Debug error từ server
        throw new Error(errData.error || 'Lỗi cập nhật học sinh')
      }
      // Refetch thay vì reload
      const fetchStudents = async () => {
        try {
          console.log('Starting refetch...'); // Debug refetch
          const res = await fetch('/api/bes', {
            headers: { 'user-id': userId.toString() },
          })
          console.log('Refetch status:', res.status); // Debug refetch status
          if (res.ok) {
            const data = await res.json()
            console.log('Refetch data:', data); // Debug refetch data
            const mappedStudents: Student[] = data.map((be: BeInfo) => ({
              id: be.sbd.toString(),
              sbd: be.sbd,
              user_id: be.user_id,
              name: be.name,
              gender: be.gender,
              age: be.age,
              dob: be.dob,
             lop: be.lop || '',
              parent: be.parent || '',
              phone: be.phone || '',
              address: be.address,
              qrBase64: be.qrBase64,
              avatar: be.avatar,
              createdAt: be.created_at || new Date().toISOString(),
              studentCode: be.sbd.toString().padStart(3, '0'),
              class: be.lop || '',
              dateOfBirth: be.dob,
            }))
            setStudents(mappedStudents)
            console.log('Students updated after refetch'); // Debug setStudents
          }
        } catch (err) {
          console.error('Refetch error:', err)
        }
      }
      await fetchStudents()
      console.log('Closing edit dialog'); // Debug close dialog
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
      toast.success('Cập nhật học sinh thành công!') // Thêm toast xác nhận, bao gồm avatar nếu có
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
              lop: be.lop || '',
              parent: be.parent || '',
              phone: be.phone || '',
              address: be.address,
              qrBase64: be.qrBase64,
              avatar: be.avatar,
              createdAt: be.created_at || new Date().toISOString(),
              studentCode: be.sbd.toString().padStart(3, '0'),
              class: be.lop || '',
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
    console.log('openEditDialog called with student:', student); // Debug open dialog
    setSelectedStudent(student)
    setFormData({
      name: student.name || "",
      gender: student.gender || "",
      age: student.age || 0,
      dateOfBirth: student.dateOfBirth || "",
      class: student.class || student.lop || "", // Ưu tiên class, fallback lop
      parent: student.parent || "",
      phone: student.phone || "",
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
        <div className="flex items-center gap-2">
          {/* Thêm 2 nút mới */}
          <UploadExcelModal onUploadSuccess={handleUploadSuccess} beList={beListForComponents} />
          <DownloadQRButton beList={beListForComponents} />
          {/* Nút upload zip mới */}
          <Dialog open={isZipUploadOpen} onOpenChange={setIsZipUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Folder className="mr-2 h-4 w-4" />
                Upload Zip Ảnh
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload ảnh từ file ZIP</DialogTitle>
                <DialogDescription>
                  Chọn file ZIP chứa các ảnh với tên file là SBD.png hoặc SBD.jpg (ví dụ: 001.png cho SBD=1). Hỗ trợ ảnh trong thư mục con.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="zip-file">Chọn file ZIP</Label>
                  <Input
                    id="zip-file"
                    type="file"
                    accept=".zip"
                    disabled={zipUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleZipUpload(file)
                      }
                    }}
                  />
                </div>
                {zipUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Đang xử lý...</span>
                      <span>{Math.round(zipProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${zipProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                <Button
                  onClick={() => setIsZipUploadOpen(false)}
                  className="w-full"
                  disabled={zipUploading}
                  variant="outline"
                >
                  Đóng
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* Nút thêm học sinh */}
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
                <DialogDescription>
                  Điền thông tin học sinh mới.
                </DialogDescription>
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
                  {/* {formData.avatar && !uploading && (
                    <Image
                      src={formData.avatar}
                      alt="Preview"
                      width={96}
                      height={96}
                      className="mt-2 w-24 h-24 object-cover rounded-full border"
                    />
                  )} */}
                </div>
                <Button onClick={handleAddStudent} className="w-full" disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Thêm học sinh
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
                        <Image src={student.avatar} alt={student.name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
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
            <DialogDescription>
              Cập nhật thông tin học sinh. Các trường không bắt buộc có thể để trống để giữ nguyên.
            </DialogDescription>
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
                value={formData.age === null ? '' : formData.age}
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
                <Image
                  src={formData.avatar}
                  alt="Preview"
                  width={96}
                  height={96}
                  className="mt-2 w-24 h-24 object-cover rounded-full border"
                />
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