// components/form/exercise-list.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, BookOpen, FileText, Brain } from "lucide-react"
import { Exercise, InsertedExercise,InsertedQuestion  } from "@/types/exercise"  // Assume types include InsertedQuestion, GeneratedQuestion

interface ExerciseListProps {
  exercises: InsertedExercise[];
  onEdit: (exercise: InsertedExercise) => void;
  onDelete: (id: number) => void;
}

interface QuestionProps {
  question: InsertedQuestion;  // From InsertedExercise.questions
  index: number;
}

function QuestionItem({ question, index }: QuestionProps) {
  const isMultiple = question.answers && question.answers.length > 0;

  return (
    <div key={question.id} className="border-l-4 border-primary/20 pl-4 py-2 bg-muted/50 rounded">
      <div className="flex items-start space-x-2">
        <span className="font-bold text-sm">{index + 1}.</span>
        <div className="flex-1">
          <p className="font-medium">{question.question_text} {question.emoji}</p>
          {isMultiple ? (
            <div className="mt-1 space-y-1">
              {question.answers?.map((ans, i) => (
                <div key={i} className={`text-xs ${ans.is_correct ? 'text-green-600 font-semibold' : 'text-muted-foreground'}`}>
                  {String.fromCharCode(65 + i)}. {ans.answer_text}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">
              <strong>Đáp án mẫu:</strong> {question.model_answer}
            </div>
          )}
          {question.explanation && (
            <p className="text-xs italic text-muted-foreground mt-1">Giải thích: {question.explanation}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExerciseList({ exercises, onEdit, onDelete }: ExerciseListProps) {
  return (
    <div className="space-y-6">
      {exercises.map((exercise) => (
        <Card key={exercise.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {exercise.name}
                <Badge variant={exercise.type === "multiple_choice" ? "default" : "secondary"}>
                  {exercise.type === "multiple_choice" ? "Trắc Nghiệm" : "Tự Luận"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {exercise.difficulty}
                </Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span>Lớp: {exercise.class_id} | Sách: {exercise.book_id} | Bài: {exercise.lesson_name}</span>
                <span className="text-muted-foreground">Số câu: {exercise.num_questions}</span>
                {exercise.type === "multiple_choice" && <span>Đáp án: {exercise.num_answers}</span>}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(exercise)}>
                <Edit className="w-4 h-4 mr-1" />
                Sửa
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(exercise.id)}>
                <Trash2 className="w-4 h-4 mr-1" />
                Xóa
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {exercise.questions && exercise.questions.length > 0 ? (
                exercise.questions.map((q, i) => <QuestionItem key={q.id} question={q} index={i} />)
              ) : (
                <p className="text-muted-foreground text-sm">Chưa có câu hỏi. Tạo bài tập để sinh câu hỏi bằng AI.</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                Chia sẻ / In PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}