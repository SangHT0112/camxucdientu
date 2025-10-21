"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import QuestionForm from "@/components/form/question-form"
import QuestionList from "@/components/form/question-list"
import { Question, QuestionFormData } from "@/types/question"

interface QuestionType {
  id: number;
  type_name: string;
  icon?: string;
}

interface RawQuestion {
  id: number;
  question_text?: string;
  question?: string;
  emoji?: string;
  question_type?: string;
  type_name?: string;
  answers: RawAnswer[];
  explanation?: string;
  correctAnswer?: number;
}

interface RawAnswer {
  id: number;
  answer_text?: string;
  text?: string;
  is_correct?: boolean;
}

interface User {
  id: number;
  [key: string]: unknown;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])  // Dynamic từ API
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [filterType, setFilterType] = useState("All")

  // Định nghĩa userId ở đầu component để scope rõ ràng
  const userStr = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
  let user: User | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (e: unknown) {
      console.error("Invalid user data in localStorage:", e);
    }
  }
  const userId = user?.id || 1;  // Fallback nếu không có

  // Fetch questions và questionTypes từ API khi mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch questions
        const questionsRes = await fetch("/api/questions");
        if (!questionsRes.ok) throw new Error("Lỗi tải câu hỏi từ server");
        const apiQuestions: RawQuestion[] = await questionsRes.json();  // Raw from API
        console.log("Loaded raw questions from API:", apiQuestions);  // Debug log

        // Map API data to Question (nếu API trả correctAnswer index, map sang is_correct; fallback to a.is_correct)
        const mappedQuestions: Question[] = apiQuestions.map((q: RawQuestion) => ({
          id: q.id,
          question_text: q.question || q.question_text || '',  // Flexible mapping
          emoji: q.emoji || '',
          question_type: q.question_type || q.type_name || '',  // Flexible
          answers: q.answers.map((a: RawAnswer, index: number) => ({
            id: a.id,
            answer_text: a.text || a.answer_text || '',
            is_correct: q.correctAnswer !== undefined ? (index === q.correctAnswer) : (a.is_correct || false),
          })),
          explanation: q.explanation || '',
        }));
        setQuestions(mappedQuestions);
        console.log("Mapped questions:", mappedQuestions);  // Debug

        // Fetch questionTypes
        const typesRes = await fetch("/api/question-types");
        if (!typesRes.ok) throw new Error("Lỗi tải loại câu hỏi từ server");
        const typesData: QuestionType[] = await typesRes.json();
        setQuestionTypes(typesData);
        console.log("Loaded question types:", typesData);  // Debug
      } catch (err: unknown) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Cập nhật onSubmit để nhận Question[] (từ generation) hoặc QuestionFormData (từ edit manual)
  const handleAddQuestion = async (data: QuestionFormData | Question | Question[]) => {
    try {
      if (Array.isArray(data)) {
        // Từ generation: Thêm nhiều questions (assume already persisted or persist here if needed)
        setQuestions(prev => [...prev, ...data]);
        // Optional: Bulk POST if not persisted in form
        // await fetch('/api/questions/bulk', { method: 'POST', body: JSON.stringify(data) });
      } else if ('id' in data && (data as Question).question_text) {
        // Từ full Question object (e.g., if form returns it for edit)
        const questionId = (data as Question).id;
        // Update via API for persistence
        const res = await fetch(`/api/questions/${questionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Lỗi cập nhật câu hỏi');
        setQuestions(prev => prev.map(q => q.id === questionId ? data : q));
        setEditingQuestion(null);
      } else {
        // Từ form data (QuestionFormData for new or edit)
        const formData = data as QuestionFormData;
        const questionData = {
          question_text: formData.topic || formData.question_text || '',
          question_type: formData.question_type || '',
          answers: formData.answers?.map((a: { id?: number | string; answer_text?: string; text?: string; is_correct?: boolean }, idx: number) => ({
            id: (typeof a.id === 'number' ? a.id : (editingQuestion ? editingQuestion.answers.length + idx + 1 : Date.now() + idx)),
            answer_text: a.answer_text || a.text || '',
            is_correct: !!a.is_correct,
          })) || [],
          explanation: formData.explanation || '',
          emoji: formData.emoji || '',
          user_id: userId,
        };
        let newQuestion: Question;
        if (editingQuestion) {
          // Edit: PUT to API
          const res = await fetch(`/api/questions/${editingQuestion.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData),
          });
          if (!res.ok) throw new Error('Lỗi cập nhật câu hỏi');
          newQuestion = {
            ...editingQuestion,
            question_text: questionData.question_text,
            question_type: questionData.question_type,
            answers: questionData.answers,
            explanation: questionData.explanation,
            emoji: questionData.emoji,
          };
          setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? newQuestion : q));
          setEditingQuestion(null);
        } else {
          // New: POST to API, get id from response
          const res = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData),
          });
          if (!res.ok) throw new Error('Lỗi tạo câu hỏi mới');
          newQuestion = await res.json();
          setQuestions(prev => [...prev, newQuestion]);
        }
      }
    } catch (err: unknown) {
      console.error('Error handling question add:', err);
      setError(err instanceof Error ? err.message : 'Lỗi xử lý câu hỏi');
    }

    setIsFormOpen(false);
  }

  const handleDeleteQuestion = async (id: number) => {
    try {
      // Delete via API for persistence
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Lỗi xóa câu hỏi');
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err: unknown) {
      console.error('Error deleting question:', err);
      setError(err instanceof Error ? err.message : 'Lỗi xóa câu hỏi');
    }
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setIsFormOpen(true)
  }

  const filteredQuestions =
    filterType === "All" ? questions : questions.filter((q) => q.question_type === filterType)

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </Card>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="p-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Thử lại</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-foreground">Quản Lý Câu Hỏi</h1>
            <Button
              onClick={() => {
                setEditingQuestion(null)
                setIsFormOpen(true)
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Thêm Câu Hỏi
            </Button>
          </div>
          <p className="text-muted-foreground">Quản lý và tổ chức bộ câu hỏi của bạn ({questions.length} câu hỏi)</p>
        </div>

        {/* Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {editingQuestion ? "Chỉnh Sửa Câu Hỏi" : "Thêm Câu Hỏi Mới"}
                </h2>
                <QuestionForm
                  onSubmit={handleAddQuestion}
                  onCancel={() => {
                    setIsFormOpen(false)
                    setEditingQuestion(null)
                  }}
                  initialData={
                    editingQuestion
                      ? {
                          // Map Question to QuestionFormData for edit (reuse topic for question_text)
                          topic: editingQuestion.question_text,
                          question_type: editingQuestion.question_type,
                          answers: editingQuestion.answers,
                          explanation: editingQuestion.explanation,
                          emoji: editingQuestion.emoji,
                          user_id: userId,  // Set user_id
                        }
                      : {
                          user_id: userId,  // Default for new
                        }
                  }
                />
              </div>
            </Card>
          </div>
        )}

        {/* Filter Tabs - Dynamic từ API */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterType("All")}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterType === "All"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {questionTypes.map((type) => (
            <button
              key={type.id}  // Dùng type.id thay vì type_name để unique
              onClick={() => setFilterType(type.type_name)}  // Filter bằng type_name
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterType === type.type_name
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {type.icon} {type.type_name}
            </button>
          ))}
        </div>

        {/* Questions Grid */}
        <div className="grid gap-4">
          {filteredQuestions.length > 0 ? (
            <QuestionList
              questions={filteredQuestions}
              onEdit={handleEditQuestion}
              onDelete={handleDeleteQuestion}
            />
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground text-lg">Không có câu hỏi nào</p>
              <Button onClick={() => setIsFormOpen(true)} variant="outline" className="mt-4">
                Tạo câu hỏi đầu tiên
              </Button>
            </Card>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="p-4">
            <p className="text-muted-foreground text-sm">Tổng Câu Hỏi</p>
            <p className="text-3xl font-bold text-primary">{questions.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-muted-foreground text-sm">Loại Câu Hỏi</p>
            <p className="text-3xl font-bold text-primary">
              {new Set(questions.map((q) => q.question_type)).size}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-muted-foreground text-sm">Đang Hiển Thị</p>
            <p className="text-3xl font-bold text-primary">{filteredQuestions.length}</p>
          </Card>
        </div>
      </div>
    </main>
  )
}