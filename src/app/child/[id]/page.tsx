"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Smile, Frown, Meh, Angry, Heart, Star, ArrowLeft, Sparkles } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import type { BeInfo } from "@/types/BeInfo"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
const emotions = [
  { icon: Smile, label: "Vui vẻ", color: "bg-yellow-400 hover:bg-yellow-500", emoji: "😊" },
  { icon: Heart, label: "Yêu thích", color: "bg-pink-400 hover:bg-pink-500", emoji: "😍" },
  { icon: Meh, label: "Bình thường", color: "bg-blue-400 hover:bg-blue-500", emoji: "😐" },
  { icon: Frown, label: "Buồn", color: "bg-purple-400 hover:bg-purple-500", emoji: "😢" },
  { icon: Angry, label: "Khó chịu", color: "bg-red-400 hover:bg-red-500", emoji: "😠" },
]

interface EmotionLog {
  id: number
  child_id: number
  child_name: string
  class_name: string
  emotion: string
  date: string // YYYY-MM-DD
  created_at: string // ISO
}

export default function ChildGreeting() {
  const router = useRouter()
  const params = useParams()
  const [selectedEmotion, setSelectedEmotion] = useState<number | null>(null)
  const [child, setChild] = useState<{ name: string; gender: string; lop: string; photo: string }>({
    name: "Bé yêu",
    gender: "",
    lop: "",
    photo: "/happy-preschool-child.jpg",
  })
  const [dailyEmotions, setDailyEmotions] = useState<{ [key: string]: number }>({}) // Tổng hợp vui/buồn hôm nay
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const emotionFeedback: {
    [key: string]: {
      message: string
      audio: string
      image: string // Thêm thuộc tính image
    }
  } = {
    "Vui vẻ": {
      message: "Con đang vui lắm đúng không?",
      audio: "/audio/happy.mp3",
      image: "/images/happy.png",
    },
    "Yêu thích": {
      message: "Con đang thích thú điều gì thế?",
      audio: "/audio/love.mp3",
      image: "/images/love.png",
    },
    "Bình thường": {
      message: "Con thấy bình thường thôi hả?",
      audio: "/audio/neutral.mp3",
      image: "/images/neutral.png",
    },
    "Buồn": {
      message: "Con đang buồn sao?",
      audio: "/audio/sad.mp3",
      image: "/images/sad.png",
    },
    "Khó chịu": {
      message: "Con đang khó chịu à?",
      audio: "/audio/angry.mp3",
      image: "/images/angry.png",
    },
  }
  // Load thông tin bé từ MySQL
  useEffect(() => {
    const loadChild = async () => {
      if (!params.id) return
      const id = params.id.toString()

      try {
        const response = await fetch(`/api/bes/${id}`, {
          headers: { "user-id": localStorage.getItem("user_id") || "1" },
        })
        if (response.ok) {
          const be: BeInfo = await response.json()
          if (be) {
            setChild({
              name: be.name,
              gender: be.gender,
              lop: be.lop,
              photo: be.qrBase64 ? be.qrBase64 : `/happy-${be.gender === "Nữ" ? "girl" : "boy"}-preschool.jpg`,
            })
            return
          }
        }
      } catch (error) {
        console.error("Lỗi load child từ API:", error)
      }

      // Fallback localStorage
      const saved = localStorage.getItem("beList")
      if (saved) {
        const parsed = JSON.parse(saved) as BeInfo[]
        const be = parsed.find((b) => b.stt.toString() === id)
        if (be) {
          setChild({
            name: be.name,
            gender: be.gender,
            lop: be.lop,
            photo: be.qrBase64 ? be.qrBase64 : `/happy-${be.gender === "Nữ" ? "girl" : "boy"}-preschool.jpg`,
          })
        } else {
          alert("Không tìm thấy bé! Quay lại upload danh sách.")
          router.push("/")
        }
      }
    }
    loadChild()
  }, [params.id, router])

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    }
  }, [audio])

  // Load tổng hợp cảm xúc hôm nay từ MySQL
  useEffect(() => {
    const loadDailyEmotions = async () => {
      if (!params.id) return
      const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
      try {
        const response = await fetch(`/api/emotion_logs?child_id=${params.id}&date=${today}`)
        if (response.ok) {
          const logs: EmotionLog[] = await response.json()
          const summary: { [key: string]: number } = {}
          logs.forEach((log) => {
            summary[log.emotion] = (summary[log.emotion] || 0) + 1
          })
          setDailyEmotions(summary)
          console.log("Daily emotions:", summary)
        }
      } catch (error) {
        console.error("Lỗi load emotions từ MySQL:", error)
      }
    }
    loadDailyEmotions()
  }, [params.id])

  // Lưu cảm xúc mới vào MySQL
  const handleEmotionSelect = async (index: number) => {
    setSelectedEmotion(index)
    const now = new Date()
    const emotionData = {
      child_id: Number(params.id),
      child_name: child.name,
      class_name: child.lop,
      emotion: emotions[index].label,
      date: now.toISOString().split("T")[0], // YYYY-MM-DD
    }

    try {
      const response = await fetch("/api/emotion_logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotions: [emotionData] }),
      })
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Reload summary
      const today = emotionData.date
      const responseReload = await fetch(`/api/emotions?child_id=${params.id}&date=${today}`)
      if (responseReload.ok) {
        const logs: EmotionLog[] = await responseReload.json()
        const summary: { [key: string]: number } = {}
        logs.forEach((log) => {
          summary[log.emotion] = (summary[log.emotion] || 0) + 1
        })
        setDailyEmotions(summary)
      }

      // Mở modal và phát âm thanh
      setIsModalOpen(true)
      const emotionLabel = emotions[index].label
      const audioFile = emotionFeedback[emotionLabel].audio
      const newAudio = new Audio(audioFile)
      setAudio(newAudio)
      newAudio.play().catch((error) => console.error("Lỗi phát âm thanh:", error))

      // alert(`Cảm ơn bé ${child.name} đã chia sẻ cảm xúc! ${emotions[index].emoji}`)
    } catch (error) {
      console.error("Lỗi lưu emotion:", error)
      alert("Lỗi lưu cảm xúc! Kiểm tra kết nối.")
    }
  }

  const handleBack = () => {
    router.push("/")
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-accent/30 via-background to-secondary/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-40 right-20 w-32 h-32 bg-secondary/20 rounded-full blur-2xl animate-pulse delay-300" />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-accent/20 rounded-full blur-xl animate-pulse delay-700" />
      </div>

      <Card className="relative max-w-2xl w-full p-4 md:p-12 shadow-2xl border-4 border-primary/20 bg-card/95 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Quay lại
        </Button>

        <div className="flex flex-col items-center gap-3 text-center mt-6">
          <div className="flex gap-3 animate-bounce">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <Sparkles className="w-5 h-5 text-secondary fill-secondary" />
            <Star className="w-4 h-4 text-accent fill-accent" />
          </div>

          <h1 className="text-3xl md:text-6xl font-bold text-primary leading-tight text-balance">
            Xin chào {child.name}!
          </h1>
          <p className="text-lg md:text-xl font-semibold text-secondary">Lớp: {child.lop}</p>

          <div className="relative w-32 h-32 md:w-64 md:h-64 my-2">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-2xl animate-pulse" />
            <img
              src={child.photo || "/placeholder.svg"}
              alt={child.name}
              className="relative w-full h-full object-cover rounded-full border-8 border-primary/30 shadow-2xl"
            />
          </div>

         
          <div className="space-y-1">
            <p className="text-xl md:text-3xl font-semibold text-secondary text-red-500 leading-relaxed">
              Hôm nay bé cảm thấy thế nào?
            </p>
            <p className="text-base md:text-xl text-muted-foreground">Chọn cảm xúc của bé nhé!</p>
          </div>

          <div className="flex flex-col items-center gap-2 w-full max-w-md mt-3">
            {emotions.map((emotion, index) => {
              const Icon = emotion.icon
              const isSelected = selectedEmotion === index
              return (
                <Button
                  key={index}
                  onClick={() => handleEmotionSelect(index)}
                  className={`
                    ${emotion.color} 
                    ${isSelected ? "ring-4 ring-ring scale-105" : ""}
                    w-full h-16 md:h-24 flex items-center justify-start gap-3 px-4
                    rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105
                    text-white font-bold border-4 border-white/30
                  `}
                >
                  <Icon className="w-10 h-10 md:w-14 md:h-14 flex-shrink-0" />
                  <span className="text-lg md:text-2xl">{emotion.label}</span>
                  <span className="text-2xl md:text-4xl ml-auto">{emotion.emoji}</span>
                </Button>
              )
            })}
          </div>

            {Object.keys(dailyEmotions).length > 0 && (
            <div className="bg-accent/20 p-3 rounded-lg w-full max-w-md mt-2">
              <p className="font-semibold mb-1 text-sm">Hôm nay bé cảm thấy:</p>
              <ul className="text-xs space-y-0.5">
                {Object.entries(dailyEmotions).map(([emotion, count]) => (
                  <li key={emotion}>
                    {emotion}: {count} lần
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedEmotion !== null && (
            <div className="mt-3 p-4 bg-primary/20 rounded-3xl border-4 border-primary/30 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-xl md:text-2xl font-bold text-primary">
                Bé đang cảm thấy {emotions[selectedEmotion].label.toLowerCase()}! {emotions[selectedEmotion].emoji}
              </p>
            </div>
          )}
        </div>

       <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border-4 border-primary/30 z-50">
              <Dialog.Close className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </Dialog.Close>
              <div className="flex flex-col items-center gap-4">
                {selectedEmotion !== null && (
                  <>
                    <img
                      src={emotionFeedback[emotions[selectedEmotion].label].image}
                      alt={emotions[selectedEmotion].label}
                      className="w-24 h-24 md:w-32 md:h-32 object-contain rounded-full border-4 border-primary/30 animate-bounce"
                    />
                    <p className="text-xl font-semibold text-primary text-center">
                      {emotionFeedback[emotions[selectedEmotion].label].message}
                    </p>
                  </>
                )}
                <Button
                  onClick={() => router.push("/")}
                  className="bg-primary text-white hover:bg-primary/90 px-6 py-2 rounded-full"
                >
                  Quay về trang chủ
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </Card>


      
    </main>
  )
}
