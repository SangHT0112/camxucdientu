"use client"

import { useState, FormEvent, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { QuestionFormData } from "@/types/question" // interface gửi lên API
import type { InsertedQuestion, QuestionFormProps } from "@/types/question"
// Interface cho câu hỏi trả về từ backend


export default function QuestionForm({ onSubmit, onCancel, initialData }: QuestionFormProps) {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.id || 1;

  const [formData, setFormData] = useState<QuestionFormData>({
    topic: initialData?.topic || "",
    quantity: initialData?.quantity || 1,
    difficulty: initialData?.difficulty || "Medium",
    number_of_answers: initialData?.number_of_answers || 4,
    description: initialData?.description || "",
    user_id: initialData?.user_id || userId,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [generatedPreview, setGeneratedPreview] = useState<InsertedQuestion[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.topic.trim()) return setError("Vui lòng mô tả chủ đề chi tiết")
    if (formData.quantity < 1 || formData.quantity > 10)
      return setError("Số lượng câu hỏi phải từ 1 đến 10")
    if (formData.number_of_answers < 2 || formData.number_of_answers > 6)
      return setError("Số lượng đáp án phải từ 2 đến 6")

    setIsLoading(true)

    try {
      const submitData = { ...formData, user_id: userId }
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Lỗi khi tạo câu hỏi")
      }

      const generatedQuestions: InsertedQuestion[] = await response.json()
      setGeneratedPreview(generatedQuestions)
      setShowPreview(true)
    } catch (err: unknown) {
      setError((err as Error).message || "Lỗi khi tạo câu hỏi. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  const confirmSave = () => {
    generatedPreview.forEach((q: InsertedQuestion) =>   onSubmit({
      ...q,
      question_type: q.type_name || "Auto", // ✅ thêm field để TS hợp lệ
    })
  );
    setGeneratedPreview([])
    setShowPreview(false)

    // Reset form
    setFormData({
      topic: "",
      quantity: 1,
      difficulty: "Medium",
      number_of_answers: 4,
      description: "",
      user_id: userId,
    })
  }

  const difficulties = ["Easy", "Medium", "Hard"]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mô tả chủ đề */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Mô Tả Chủ Đề Chi Tiết <span className="text-red-500">*</span>
          <HoverCard>
            <HoverCardTrigger><Info className="w-4 h-4 ml-1 inline" /></HoverCardTrigger>
            <HoverCardContent>Mô tả càng chi tiết, AI càng generate tốt. Ví dụ: Câu hỏi vui về động vật châu Phi cho trẻ 5 tuổi, tập trung màu sắc và âm thanh. AI sẽ tự chọn loại câu hỏi phù hợp (nếu chưa có sẽ tạo mới).</HoverCardContent>
          </HoverCard>
        </label>
        <Textarea
          name="topic"
          placeholder="Ví dụ: Câu hỏi về động vật, cây cối, phương tiện..."
          value={formData.topic}
          onChange={handleInputChange}
          rows={4}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">AI sẽ phân tích để chọn loại câu hỏi (e.g., Animal) hoặc tạo mới nếu cần.</p>
      </div>

      {/* Số lượng & độ khó */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Số Lượng Câu Hỏi <span className="text-red-500">*</span>
            <HoverCard>
              <HoverCardTrigger><Info className="w-4 h-4 ml-1 inline" /></HoverCardTrigger>
              <HoverCardContent>Từ 1-10 câu để tránh overload AI.</HoverCardContent>
            </HoverCard>
          </label>
          <Input
            type="number"
            name="quantity"
            min={1}
            max={10}
            step={1}
            value={formData.quantity}
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
            value={formData.difficulty}
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

      {/* Số lượng đáp án */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Số Lượng Đáp Án
          <HoverCard>
            <HoverCardTrigger><Info className="w-4 h-4 ml-1 inline" /></HoverCardTrigger>
            <HoverCardContent>2-6 options để cân bằng độ khó.</HoverCardContent>
          </HoverCard>
        </label>
        <Input
          type="number"
          name="number_of_answers"
          min={2}
          max={6}
          step={1}
          value={formData.number_of_answers}
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">Từ 2 đến 6 đáp án</p>
      </div>

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
                <ul className="list-disc ml-4 mt-2">
                  {q.answers.map((ans: string | { answer_text: string; is_correct: boolean }, i: number) => {
                    const text =
                      typeof ans === "string" ? ans.replace("(correct)", "").trim() : ans.answer_text
                    const isCorrect =
                      typeof ans === "string"
                        ? ans.toLowerCase().includes("(correct)")
                        : ans.is_correct

                    return (
                      <li key={i} className={isCorrect ? "text-green-600" : ""}>
                        {String.fromCharCode(65 + i)}. {text}
                      </li>
                    )
                  })}
                </ul>



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
