"use client"

import { Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useState } from "react"
import type { Question } from "@/types/question"

// --- Định nghĩa kiểu dữ liệu ---


interface QuestionListProps {
  questions: Question[]
  onEdit: (question: Question) => void
  onDelete: (id: number) => void
}

export default function QuestionList({ questions, onEdit, onDelete }: QuestionListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {questions.map((question) => (
        <Card key={question.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-4">
            {/* Tiêu đề câu hỏi */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <button
                  onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
                  className="flex items-start gap-3 w-full text-left hover:opacity-70 transition-opacity"
                >
                  <span className="text-2xl mt-1">{question.emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg">{question.question_text}</h3>
                    <div className="flex gap-2 mt-2">
                      <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded font-medium">
                        {question.question_type}
                      </span>
                      <span className="inline-block px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                        {question.answers.length} đáp án
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Nút thao tác */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(question)}
                  className="text-primary hover:bg-primary/10"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(question.id)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Nội dung mở rộng */}
            {expandedId === question.id && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Các Đáp Án:</p>
                  <div className="space-y-2">
                    {question.answers.map((answer) => (
                      <div key={answer.id} className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            answer.is_correct ? "bg-green-500 border-green-500" : "border-border"
                          }`}
                        >
                          {answer.is_correct && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className="text-sm">{answer.answer_text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {question.explanation && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Giải Thích:</p>
                    <p className="text-sm text-foreground bg-muted/50 p-2 rounded">{question.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
