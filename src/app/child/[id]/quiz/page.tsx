"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RotateCcw, Volume2, AlertCircle } from "lucide-react"

interface Answer {
  id: number
  text: string
}

interface Question {
  id: number
  question: string
  emoji: string
  answers: Answer[]
  correctAnswer: number
  explanation: string
}

export default function QuizPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string || searchParams.get('id') // Fallback từ query param ?id=2
  const [childId, setChildId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [quizComplete, setQuizComplete] = useState(false)

  // Helper function để fetch với error handling tốt hơn (tránh parse JSON error)
  const safeFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options)
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`
      try {
        const data = await res.json()
        errorMsg += ` - ${data.error || 'Unknown error'}`
      } catch {
        try {
          const text = await res.text()
          errorMsg += ` - Response: ${text.substring(0, 200)}...`
        } catch {
          // Ignore further errors
        }
      }
      throw new Error(errorMsg)
    }
    return res
  }

  // Fetch child_id từ id (sbd) và questions từ API khi component mount
  useEffect(() => {
    async function init() {
      try {
        if (!id) {
          // Fallback: Lấy id từ localStorage nếu có (từ beList)
          const saved = localStorage.getItem("beList")
          if (saved) {
            const parsed = JSON.parse(saved)
            const defaultBe = parsed[0] // Lấy bé đầu tiên nếu không có id
            if (defaultBe) {
              const fallbackId = defaultBe.sbd.toString()
              console.log(`Sử dụng id fallback: ${fallbackId}`)
              // Tiếp tục với fallbackId
              const childRes = await safeFetch(`/api/bes/${fallbackId}`)
              const childData = await childRes.json()
              setChildId(childData.id)
            } else {
              throw new Error('Thiếu thông tin id. Vui lòng truy cập từ trang chào bé (/child/[id])')
            }
          } else {
            throw new Error('Thiếu thông tin id. Vui lòng truy cập từ trang chào bé (/child/[id])')
          }
          // Fetch questions sau fallback
          const qRes = await safeFetch('/api/questions')
          const data: Question[] = await qRes.json()
          setQuestions(data)
          return
        }

        // Lấy child_id từ id (sbd) qua /api/bes/[id]
        const childRes = await safeFetch(`/api/bes/${id}`)
        const childData = await childRes.json()
        setChildId(childData.id)

        // Lấy questions
        const qRes = await safeFetch('/api/questions')
        const data: Question[] = await qRes.json()
        setQuestions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300">
        <Card className="p-8 text-center">
          <div className="text-4xl animate-spin">⏳</div>
          <p className="mt-4">Đang tải câu hỏi...</p>
        </Card>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300">
        <Card className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4 font-semibold">{error}</p>
          <p className="text-gray-600 mb-4">Để chơi quiz, vui lòng truy cập từ trang chào bé: <code>/child/[id]</code> (ví dụ: /child/2)</p>
          <Button onClick={() => window.location.href = '/'} variant="outline">Về trang chủ</Button>
        </Card>
      </main>
    )
  }

  if (!childId || questions.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300">
        <Card className="p-8 text-center">
          <p>Không có câu hỏi nào hoặc không tìm thấy bé. Vui lòng kiểm tra!</p>
        </Card>
      </main>
    )
  }

  const question = questions[currentQuestion]

  const saveAnswer = async (answerIndex: number, isCorrect: boolean) => {
    try {
      const answerId = question.answers[answerIndex].id
      const res = await safeFetch('/api/child_answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          question_id: question.id,
          answer_id: answerId,
          is_correct: isCorrect
        })
      })
      console.log('Đáp án đã lưu thành công')
    } catch (err) {
      console.error('Lỗi lưu đáp án:', err)
    }
  }

  const handleAnswerClick = async (answerIndex: number) => {
    setSelectedAnswer(answerIndex)
    setShowResult(true)

    const isCorrect = answerIndex === question.correctAnswer
    if (isCorrect) {
      setScore(score + 1)
    }

    // Lưu đáp án vào DB ngay lập tức
    await saveAnswer(answerIndex, isCorrect)
  }

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      setQuizComplete(true)

      // Lưu kết quả tổng vào DB khi hoàn thành
      try {
        const res = await safeFetch('/api/quiz_results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: childId,
            total_questions: questions.length,
            correct_answers: score,
            score: Math.round((score / questions.length) * 100) // Điểm phần trăm
          })
        })
        console.log('Kết quả quiz đã lưu thành công')
      } catch (err) {
        console.error('Lỗi lưu kết quả:', err)
      }
    }
  }

  const handleRestart = () => {
    setCurrentQuestion(0)
    setScore(0)
    setShowResult(false)
    setSelectedAnswer(null)
    setQuizComplete(false)
  }

  const handleSpeak = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "vi-VN"
      window.speechSynthesis.speak(utterance)
    }
  }

  if (quizComplete) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300/40 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-40 right-20 w-32 h-32 bg-pink-400/30 rounded-full blur-3xl animate-pulse delay-300" />
          <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-blue-300/40 rounded-full blur-2xl animate-pulse delay-700" />
        </div>

        <Card className="relative max-w-2xl w-full p-8 md:p-12 shadow-2xl border-4 border-yellow-300 bg-white/95 backdrop-blur">
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="text-8xl animate-bounce">🎉</div>
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
              Tuyệt vời quá!
            </h1>
            <p className="text-2xl md:text-3xl font-bold text-purple-600">
              Bé trả lời đúng {score}/{questions.length} câu hỏi! 🌟
            </p>

            <div className="text-6xl">
              {score === questions.length && "🏆"}
              {score >= questions.length - 1 && score < questions.length && "🥇"}
              {score >= Math.floor(questions.length / 2) && score < questions.length - 1 && "🥈"}
              {score < Math.floor(questions.length / 2) && "🎈"}
            </div>

            <p className="text-xl md:text-2xl text-gray-700">
              {score === questions.length && "Bé là thiên tài! Giỏi lắm! 👏👏👏"}
              {score >= questions.length - 1 && score < questions.length && "Bé rất giỏi! Tiếp tục cố gắng! 💪"}
              {score >= Math.floor(questions.length / 2) &&
                score < questions.length - 1 &&
                "Bé làm tốt lắm! Cố gắng thêm nữa! 🌈"}
              {score < Math.floor(questions.length / 2) && "Bé cố gắng lên! Chơi lại nào! 🎮"}
            </p>

            <Button
              onClick={handleRestart}
              size="lg"
              className="text-2xl px-8 py-6 h-auto rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <RotateCcw className="w-8 h-8 mr-3" />
              Chơi lại
            </Button>
          </div>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300/40 rounded-full blur-2xl animate-pulse" />
        <div className="absolute top-40 right-20 w-32 h-32 bg-pink-400/30 rounded-full blur-3xl animate-pulse delay-300" />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-blue-300/40 rounded-full blur-2xl animate-pulse delay-700" />
      </div>

      <Card className="relative max-w-2xl w-full p-8 md:p-12 shadow-2xl border-4 border-yellow-300 bg-white/95 backdrop-blur">
        <div className="flex flex-col items-center gap-8">
          {/* Progress bar */}
          <div className="w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-purple-600">
                Câu {currentQuestion + 1}/{questions.length}
              </span>
              <span className="text-sm font-bold text-pink-600">Đúng: {score}</span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-purple-300">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question emoji */}
          <div className="text-8xl animate-bounce">{question.emoji}</div>

          {/* Question text */}
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-4">
              {question.question}
            </h2>
            <Button
              onClick={() => handleSpeak(question.question)}
              variant="outline"
              size="sm"
              className="border-2 border-purple-300 text-purple-600 hover:bg-purple-100"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Nghe lại
            </Button>
          </div>

          {/* Answer buttons */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.answers.map((answer, index) => (
              <button
                key={answer.id}
                onClick={() => !showResult && handleAnswerClick(index)}
                disabled={showResult}
                className={`p-6 rounded-2xl font-bold text-lg md:text-xl transition-all transform hover:scale-105 border-4 ${
                  selectedAnswer === index
                    ? index === question.correctAnswer
                      ? "bg-green-400 border-green-600 text-white shadow-lg scale-105"
                      : "bg-red-400 border-red-600 text-white shadow-lg scale-105"
                    : showResult && index === question.correctAnswer
                      ? "bg-green-400 border-green-600 text-white shadow-lg"
                      : "bg-gradient-to-br from-blue-300 to-cyan-300 border-blue-500 text-gray-800 hover:shadow-lg"
                }`}
              >
                {answer.text}
              </button>
            ))}
          </div>

          {/* Result message */}
          {showResult && (
            <div
              className={`w-full p-6 rounded-2xl text-center border-4 ${
                selectedAnswer === question.correctAnswer
                  ? "bg-green-100 border-green-500"
                  : "bg-red-100 border-red-500"
              }`}
            >
              <p className="text-2xl font-bold mb-2">
                {selectedAnswer === question.correctAnswer ? "✅ Đúng rồi!" : "❌ Sai rồi!"}
              </p>
              <p className="text-lg text-gray-800">{question.explanation}</p>
            </div>
          )}

          {/* Next button */}
          {showResult && (
            <Button
              onClick={handleNext}
              size="lg"
              className="text-2xl px-8 py-6 h-auto rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              {currentQuestion === questions.length - 1 ? "Xem kết quả" : "Câu tiếp theo"} →
            </Button>
          )}
        </div>
      </Card>
    </main>
  )
}