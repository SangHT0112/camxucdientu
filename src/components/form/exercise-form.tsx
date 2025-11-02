// components/form/exercise-form.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Exercise, Class, Book, QuestionType } from "@/types/exercise"  // Assume types defined
import { Loader2 } from "lucide-react"

interface ExerciseFormProps {
  onSubmit: (data: {
    exercise_name: string;
    type: 'multiple_choice' | 'open_ended';
    class_id: number;
    book_id: number;
    lesson_name: string;
    num_questions: number;
    num_answers?: number;
    difficulty: string;
  }) => void;
  onCancel: () => void;
  initialData?: Exercise | null;
  classes: Class[];
  books: Book[];
  onClassChange?: (classId: number | null) => void;
  questionTypes: QuestionType[];
}

export default function ExerciseForm({
  onSubmit,
  onCancel,
  initialData,
  classes,
  books,
  onClassChange,
  questionTypes,
}: ExerciseFormProps) {
  const [formData, setFormData] = useState({
    exercise_name: initialData?.name || "",
    type: (initialData?.type as 'multiple_choice' | 'open_ended') || "multiple_choice",
    class_id: initialData?.class_id || 0,
    book_id: initialData?.book_id || 0,
    lesson_name: initialData?.lesson_name || "",
    num_questions: initialData?.num_questions || 10,
    num_answers: initialData?.num_answers || 4,
    difficulty: initialData?.difficulty || "Medium",
  });
  const [loading, setLoading] = useState(false);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>(books);

  useEffect(() => {
    // Filter books by selected class
    const filtered = books.filter(b => b.class_id === formData.class_id);
    setFilteredBooks(filtered);
    if (onClassChange) onClassChange(formData.class_id || null);
  }, [formData.class_id, books, onClassChange]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        exercise_name: initialData.name,
        type: initialData.type,
        class_id: initialData.class_id,
        book_id: initialData.book_id,
        lesson_name: initialData.lesson_name,
        num_questions: initialData.num_questions,
        num_answers: initialData.num_answers || 4,
        difficulty: initialData.difficulty || "Medium",
      });
      // Re-filter books based on initial class
      const initialFiltered = books.filter(b => b.class_id === initialData.class_id);
      setFilteredBooks(initialFiltered);
    }
  }, [initialData, books]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.exercise_name.trim() || !formData.lesson_name.trim() || formData.class_id === 0 || formData.book_id === 0) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }
    setLoading(true);
    onSubmit(formData);
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumChange = (name: string, value: number) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isMultipleChoice = formData.type === "multiple_choice";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Thông Tin Bài Tập</CardTitle>
          <CardDescription>Tạo hoặc chỉnh sửa bài tập với câu hỏi được sinh bởi AI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tên bài tập */}
          <div className="space-y-2">
            <Label htmlFor="exercise_name">Tên bài tập</Label>
            <Input
              id="exercise_name"
              name="exercise_name"
              value={formData.exercise_name}
              onChange={handleInputChange}
              placeholder="Ví dụ: Bài tập cộng số cơ bản"
              required
            />
          </div>

          {/* Loại bài tập */}
          <div className="space-y-2">
            <Label htmlFor="type">Loại bài tập</Label>
            <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                <SelectItem value="open_ended">Tự luận</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lớp học */}
          <div className="space-y-2">
            <Label htmlFor="class_id">Lớp học</Label>
            <Select value={formData.class_id.toString()} onValueChange={(value) => handleSelectChange("class_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn lớp..." />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bộ sách (filtered) */}
          <div className="space-y-2">
            <Label htmlFor="book_id">Bộ sách</Label>
            <Select value={formData.book_id.toString()} onValueChange={(value) => handleSelectChange("book_id", value)} disabled={formData.class_id === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn lớp trước..." />
              </SelectTrigger>
              <SelectContent>
                {filteredBooks.map((book) => (
                  <SelectItem key={book.id} value={book.id.toString()}>
                    {book.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tên bài học */}
          <div className="space-y-2">
            <Label htmlFor="lesson_name">Tên bài học</Label>
            <Input
              id="lesson_name"
              name="lesson_name"
              value={formData.lesson_name}
              onChange={handleInputChange}
              placeholder="Ví dụ: Cộng 2 số dưới 100"
              required
            />
          </div>

          {/* Số câu hỏi */}
          <div className="space-y-2">
            <Label htmlFor="num_questions">Số câu hỏi</Label>
            <Input
              id="num_questions"
              name="num_questions"
              type="number"
              min={1}
              max={50}
              value={formData.num_questions}
              onChange={(e) => handleNumChange("num_questions", parseInt(e.target.value) || 1)}
              required
            />
          </div>

          {/* Số đáp án (only for multiple_choice) */}
          {isMultipleChoice && (
            <div className="space-y-2">
              <Label htmlFor="num_answers">Số đáp án mỗi câu</Label>
              <Input
                id="num_answers"
                name="num_answers"
                type="number"
                min={2}
                max={5}
                value={formData.num_answers}
                onChange={(e) => handleNumChange("num_answers", parseInt(e.target.value) || 2)}
              />
            </div>
          )}

          {/* Độ khó */}
          <div className="space-y-2">
            <Label htmlFor="difficulty">Độ khó</Label>
            <Select value={formData.difficulty} onValueChange={(value) => handleSelectChange("difficulty", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn độ khó..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Dễ</SelectItem>
                <SelectItem value="Medium">Trung bình</SelectItem>
                <SelectItem value="Hard">Khó</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {loading ? "Đang tạo..." : initialData ? "Cập nhật" : "Tạo Bài Tập"}
        </Button>
      </div>
    </form>
  );
}