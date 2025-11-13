"use client"

import { useState, useEffect, FormEvent, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { QuestionFormData, InsertedQuestion, QuestionFormProps, Question, Class, Book } from "@/types/question" // Import all from types

// Define a simple Answer type to replace 'any'
interface Answer {
  id?: number;
  answer_text: string;
  is_correct: boolean;
}

export default function QuestionForm({ onSubmit, onCancel, initialData, classes = [], books = [] }: QuestionFormProps) {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.id || 1;

  // Cập nhật formData để match API
  const [formData, setFormData] = useState<Required<QuestionFormData>>({
    exercise_name: initialData?.exercise_name || "",
    type: initialData?.type || "multiple_choice",
    class_id: initialData?.class_id ? String(initialData.class_id) : "",
    book_id: initialData?.book_id ? String(initialData.book_id) : "",
    lesson_name: initialData?.lesson_name || initialData?.topic || "",
    num_questions: initialData?.num_questions || initialData?.quantity || 1,
    num_answers: initialData?.num_answers || initialData?.number_of_answers || 4,
    difficulty: initialData?.difficulty || "Medium",
    user_id: initialData?.user_id || userId,
    // Legacy fields set as empty/default
    topic: "",
    quantity: 0,
    number_of_answers: 0,
    description: "",
    question_text: "",
    emoji: "",
    question_type: "",
    answers: [],
    explanation: ""
  });

  // State cho books filtered by class
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

  // Effect: Filter books khi class_id thay đổi
 // Effect: Fetch filtered books từ API khi class_id thay đổi
  useEffect(() => {
      const fetchFilteredBooks = async () => {
        if (!formData.class_id) {
          setFilteredBooks([]);
          return;
        }
        // Lấy class name từ classes prop
        const selectedClass = classes.find(c => c.id === parseInt(formData.class_id || '0'));
        if (!selectedClass) {
          setFilteredBooks([]);
          return;
        }

        try {
          const res = await fetch(`/api/books?class_name=${encodeURIComponent(selectedClass.name)}`);
          if (res.ok) {
            const data: Book[] = await res.json();
            setFilteredBooks(data);
            // Reset book_id nếu không match (book_id is string)
            const bookIdNum = parseInt(formData.book_id || '0');
            if (formData.book_id && !data.some(b => b.id === bookIdNum)) {
              setFormData(prev => ({ ...prev, book_id: "" }));
            }
          } else {
            console.error("Error fetching filtered books");
            setFilteredBooks([]);
          }
        } catch (err) {
          console.error("Fetch error:", err);
          setFilteredBooks([]);
        }
      };

      fetchFilteredBooks();
    }, [formData.class_id, classes]);  // Depend on class_id (string) and classes

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [generatedPreview, setGeneratedPreview] = useState<InsertedQuestion[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    // Handle number fields
    const parsedValue = ['num_questions', 'num_answers'].includes(name) ? parseInt(value) || 0 : value;
    setFormData((prev) => ({ ...prev, [name]: parsedValue }))
  }

  const handleSelectChange = (name: string, value: string) => {
    // Handle number for class_id/book_id if needed, but keep as string for Select
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation cập nhật (class_id/book_id as string, but parse for check)
    if (!formData.exercise_name?.trim()) return setError("Vui lòng nhập tên bài tập")
    const classIdNum = parseInt(formData.class_id || '0');
    if (!formData.class_id || isNaN(classIdNum)) return setError("Vui lòng chọn lớp học")
    const bookIdNum = parseInt(formData.book_id || '0');
    if (!formData.book_id || isNaN(bookIdNum)) return setError("Vui lòng chọn bộ sách")
    if (!formData.lesson_name?.trim()) return setError("Vui lòng nhập tên bài học")
    if (!['multiple_choice', 'open_ended'].includes(formData.type || '')) return setError("Loại bài tập không hợp lệ")
    if ((formData.num_questions || 0) < 1 || (formData.num_questions || 0) > 50) return setError("Số câu hỏi phải từ 1 đến 50")
    if ((formData.type === 'multiple_choice') && ((formData.num_answers || 0) < 2 || (formData.num_answers || 0) > 5)) {
      return setError("Số đáp án phải từ 2 đến 5 (cho trắc nghiệm)")
    }

    setIsLoading(true)

    try {
      // Convert strings to numbers for API - No ternary needed, always parse (safe after validation)
      const submitData: Omit<QuestionFormData, 'class_id' | 'book_id'> & { class_id: number; book_id: number } = {
        ...formData,
        class_id: classIdNum,  // number from parseInt
        book_id: bookIdNum,    // number from parseInt
        num_questions: formData.num_questions,
        num_answers: formData.num_answers,
        user_id: userId,
      };
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Lỗi khi tạo câu hỏi")
      }

      const generatedData = await response.json()  // Full InsertedExercise { ..., questions: InsertedQuestion[] }
      setGeneratedPreview(generatedData.questions || [])  // Lấy questions array
      setShowPreview(true)
    } catch (err: unknown) {
      setError((err as Error).message || "Lỗi khi tạo câu hỏi. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  const confirmSave = () => {
    // Map InsertedQuestion[] to Question[] để match onSubmit type
    const mappedQuestions: Question[] = generatedPreview.map(q => ({
      id: q.id,
      question_text: q.question_text,
      emoji: q.emoji || '',
      question_type: q.type_name || 'Auto-generated',
      answers: q.answers || [],
      explanation: q.explanation || '',
    }));
    // Gọi onSubmit với array questions (đã persisted ở backend)
    onSubmit(mappedQuestions);  // handleAddQuestion sẽ handle array
    setGeneratedPreview([])
    setShowPreview(false)

    // Reset form
    setFormData({
      exercise_name: "",
      type: "multiple_choice",
      class_id: "",
      book_id: "",
      lesson_name: "",
      num_questions: 1,
      num_answers: 4,
      difficulty: "Medium",
      user_id: userId,
      // Reset legacy fields
      topic: "",
      quantity: 0,
      number_of_answers: 0,
      description: "",
      question_text: "",
      emoji: "",
      question_type: "",
      answers: [],
      explanation: ""
    })
  }

  const difficulties = ["Easy", "Medium", "Hard"]
  const questionTypes = ['multiple_choice', 'open_ended'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tên bài tập */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Tên Bài Tập <span className="text-red-500">*</span>
        </label>
        <Input
          name="exercise_name"
          placeholder="Ví dụ: Bài tập Toán vui lớp 1"
          value={formData.exercise_name || ''}
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </div>

      {/* Chọn lớp và bộ sách */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Lớp Học <span className="text-red-500">*</span>
          </label>
          <Select 
            value={typeof formData.class_id === 'number' ? formData.class_id : formData.class_id || ''} 
            onValueChange={(val) => handleSelectChange('class_id', val)} 
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn lớp" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Bộ Sách <span className="text-red-500">*</span>
          </label>
          <Select 
            value={typeof formData.book_id === 'number' ? formData.book_id : formData.book_id || ''} 
            onValueChange={(val) => handleSelectChange('book_id', val)} 
            disabled={isLoading || !formData.class_id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn bộ sách" />
            </SelectTrigger>
            <SelectContent>
              {filteredBooks.map((book) => (
                <SelectItem key={book.id} value={book.id.toString()}>{book.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tên bài học (topic) */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Tên Bài Học <span className="text-red-500">*</span>
          <HoverCard>
            <HoverCardTrigger><Info className="w-4 h-4 ml-1 inline" /></HoverCardTrigger>
            <HoverCardContent>Mô tả chi tiết bài học để AI generate phù hợp. Ví dụ: Cộng trừ trong phạm vi 10 cho Toán lớp 1.</HoverCardContent>
          </HoverCard>
        </label>
        <Textarea
          name="lesson_name"
          placeholder="Ví dụ: Bài 1: Giới thiệu số học..."
          value={formData.lesson_name || ''}
          onChange={handleInputChange}
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Loại bài tập */}
      <div>
        <p className="block text-sm font-medium mb-2">
          Loại Bài Tập <span className="text-red-500">*</span>
        </p>
        <Select value={formData.type || 'multiple_choice'} onValueChange={(val) => handleSelectChange('type', val)} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn loại" />
          </SelectTrigger>
          <SelectContent>
            {questionTypes.map((qt) => (
              <SelectItem key={qt} value={qt}>
                {qt.replace('_', ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Số lượng & độ khó */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Số Lượng Câu Hỏi <span className="text-red-500">*</span>
            <HoverCard>
              <HoverCardTrigger><Info className="w-4 h-4 ml-1 inline" /></HoverCardTrigger>
              <HoverCardContent>Từ 1-50 câu để tránh overload AI.</HoverCardContent>
            </HoverCard>
          </label>
          <Input
            type="number"
            name="num_questions"
            min={1}
            max={50}
            step={1}
            value={formData.num_questions || 1}
            onChange={handleInputChange}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Độ Khó <span className="text-red-500">*</span>
            <HoverCard>
              <HoverCardTrigger><Info className="w-4 h-4 ml-1 inline" /></HoverCardTrigger>
              <HoverCardContent>Easy: Đơn giản cho trẻ nhỏ; Hard: Phức tạp hơn.</HoverCardContent>
            </HoverCard>
          </label>
          <select
            name="difficulty"
            value={formData.difficulty || "Medium"}
            onChange={handleInputChange}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
            aria-label="Chọn độ khó"
          >
            {difficulties.map((diff) => (
              <option key={diff} value={diff}>{diff}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Số lượng đáp án (chỉ show nếu multiple_choice) */}
      {formData.type === 'multiple_choice' && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Số Lượng Đáp Án <span className="text-red-500">*</span>
            <HoverCard>
              <HoverCardTrigger><Info className="w-4 h-4 ml-1 inline" /></HoverCardTrigger>
              <HoverCardContent>2-5 options để cân bằng độ khó.</HoverCardContent>
            </HoverCard>
          </label>
          <Input
            type="number"
            name="num_answers"
            min={2}
            max={5}
            step={1}
            value={formData.num_answers || 4}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">Từ 2 đến 5 đáp án</p>
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

      {/* Nút */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Hủy</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang Tạo...</> : "Tạo Câu Hỏi"}
        </Button>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Câu Hỏi Đã Generate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {generatedPreview.length > 0 ? (
              generatedPreview.map((q, index) => (
                <div key={q.id || index} className="p-4 border rounded-lg">
                  <h4 className="font-bold">{q.question_text} {q.emoji}</h4>
                  {q.answers && q.answers.length > 0 && (
                    <ul className="list-disc ml-4 mt-2">
                      {q.answers.map((ans: Answer, i: number) => (
                        <li key={ans.id || i} className={ans.is_correct ? "text-green-600" : ""}>
                          {String.fromCharCode(65 + i)}. {ans.answer_text}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.model_answer && <p className="mt-2 italic text-sm">Đáp án mẫu: {q.model_answer}</p>}
                  <p className="mt-2 italic text-sm">{q.explanation}</p>
                  <p className="text-xs text-muted-foreground mt-1">Loại: {q.type_name || 'Tự động'}</p>
                </div>
              ))
            ) : (
              <p>Không có câu hỏi nào được generate.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>Hủy</Button>
            <Button onClick={confirmSave}>Lưu Vào DB</Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}