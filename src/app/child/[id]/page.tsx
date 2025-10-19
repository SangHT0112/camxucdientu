"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Smile, Frown, Meh, Angry, Heart, Star, ArrowLeft, Sparkles } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import type { BeInfo } from "@/types/BeInfo"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"

// Icon mapping để ánh xạ từ label sang icon
const iconMap = {
  "Vui vẻ": Smile,
  "Yêu thích": Heart,
  "Bình thường": Meh,
  "Buồn": Frown,
  "Khó chịu": Angry,
}

// Color mapping cho các emotion
const colorMap = {
  "Vui vẻ": "bg-yellow-400 hover:bg-yellow-500",
  "Yêu thích": "bg-pink-400 hover:bg-pink-500", 
  "Bình thường": "bg-blue-400 hover:bg-blue-500",
  "Buồn": "bg-purple-400 hover:bg-purple-500",
  "Khó chịu": "bg-red-400 hover:bg-red-500",
}

// Emoji mapping
const emojiMap = {
  "Vui vẻ": "😊",
  "Yêu thích": "😍",
  "Bình thường": "😐",
  "Buồn": "😢",
  "Khó chịu": "😠",
}

interface Emotion {
  id: number
  label: string
  message: string
  audio: string
  image: string
  created_at: string
  updated_at: string
}

interface EmotionLog {
  id: number
  child_id: number
  child_name: string
  class_name: string
  emotion: string
  date: string // YYYY-MM-DD
  session: "morning" | "afternoon"
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
  const [emotions, setEmotions] = useState<Emotion[]>([])
  const [dailyEmotions, setDailyEmotions] = useState<{ [key: string]: { morning: number; afternoon: number } }>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [loading, setLoading] = useState(true)
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.id;

  // Load emotions từ database
  useEffect(() => {
    const loadEmotions = async () => {
      try {
        const response = await fetch("/api/emotions")
        if (response.ok) {
          const emotionsData: Emotion[] = await response.json()
          console.log("Loaded emotions:", emotionsData)
          setEmotions(emotionsData)
        } else {
          console.error("Lỗi load emotions từ API")
        }
      } catch (error) {
        console.error("Lỗi load emotions:", error)
      } finally {
        setLoading(false)
      }
    }
    loadEmotions()
  }, [])

  // Load thông tin bé từ MySQL
  useEffect(() => {
    const loadChild = async () => {
      if (!params.id) return
      const id = params.id.toString()

      try {
        const response = await fetch(`/api/bes/${id}`, {
          headers: { "user-id": userId || "1" },
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
        const be = parsed.find((b) => b.sbd.toString() === id)
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
          const summary: { [key: string]: { morning: number; afternoon: number } } = {}
          logs.forEach((log) => {
            if (!summary[log.emotion]) {
              summary[log.emotion] = { morning: 0, afternoon: 0 }
            }
            summary[log.emotion][log.session] = (summary[log.emotion][log.session] || 0) + 1
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
    console.log("handleEmotionSelect called with index:", index)
    if (loading || !emotions[index]) {
      console.log("Cannot select emotion, loading:", loading, "emotion exists:", !!emotions[index])
      return
    }

    setSelectedEmotion(index)
    setIsModalOpen(true)
    console.log("Setting isModalOpen to true")

    const now = new Date()
    const emotionData = {
      child_id: Number(params.id),
      child_name: child.name,
      class_name: child.lop,
      emotion: emotions[index].label,
      date: now.toISOString().split("T")[0],
    }
    console.log("Sending emotionData:", emotionData)

    try {
      const response = await fetch("/api/emotion_logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotions: [emotionData] }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }
      console.log("Emotion saved successfully")

      // Reload summary
      const today = emotionData.date
      const responseReload = await fetch(`/api/emotion_logs?child_id=${params.id}&date=${today}`)
      if (responseReload.ok) {
        const logs: EmotionLog[] = await responseReload.json()
        const summary: { [key: string]: { morning: number; afternoon: number } } = {}
        logs.forEach((log) => {
          if (!summary[log.emotion]) {
            summary[log.emotion] = { morning: 0, afternoon: 0 }
          }
          summary[log.emotion][log.session] = (summary[log.emotion][log.session] || 0) + 1
        })
        setDailyEmotions(summary)
        console.log("Daily emotions updated:", summary)
      }

      // Phát âm thanh
      const audioFile = emotions[index].audio
      const newAudio = new Audio(audioFile)
      setAudio(newAudio)
      newAudio.play().catch((error) => console.error("Lỗi phát âm thanh:", error))
    } catch (error) {
      console.error("Lỗi lưu emotion:", error)
      alert(`Lỗi lưu cảm xúc:`)
    }
  }

  const handleBack = () => {
    router.push("/")
  }

  // Hàm helper để lấy icon, color và emoji dựa trên label
  const getEmotionDisplayProps = (label: string) => {
    const IconComponent = iconMap[label as keyof typeof iconMap] || Meh
    const color = colorMap[label as keyof typeof colorMap] || "bg-gray-400 hover:bg-gray-500"
    const emoji = emojiMap[label as keyof typeof emojiMap] || "😶"
    
    return { IconComponent, color, emoji }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-accent/30 via-background to-secondary/20">
        <Card className="max-w-2xl w-full p-8 text-center">
          <p className="text-xl">Đang tải...</p>
        </Card>
      </main>
    )
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
            <Image
              src={child.photo || "/placeholder.svg"}
              alt={child.name}
              width={256}
              height={256}
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
              const { IconComponent, color, emoji } = getEmotionDisplayProps(emotion.label)
              const isSelected = selectedEmotion === index
              
              return (
                <Button
                  key={emotion.id}
                  onClick={() => handleEmotionSelect(index)}
                  className={`
                    ${color} 
                    ${isSelected ? "ring-4 ring-ring scale-105" : ""}
                    w-full h-16 md:h-24 flex items-center justify-start gap-3 px-4
                    rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105
                    text-white font-bold border-4 border-white/30
                  `}
                >
                  <IconComponent className="w-10 h-10 md:w-14 md:h-14 flex-shrink-0" />
                  <span className="text-lg md:text-2xl">{emotion.label}</span>
                  <span className="text-2xl md:text-4xl ml-auto">{emoji}</span>
                </Button>
              )
            })}
          </div>

          {Object.keys(dailyEmotions).length > 0 && (
            <div className="bg-accent/20 p-3 rounded-lg w-full max-w-md mt-2">
              <p className="font-semibold mb-1 text-sm">Hôm nay bé cảm thấy:</p>
              <ul className="text-xs space-y-0.5">
                {Object.entries(dailyEmotions).map(([emotion, sessions]) => (
                  <li key={emotion}>
                    {emotion}: {sessions.morning > 0 ? `${sessions.morning} lần (sáng)` : ""}{sessions.morning > 0 && sessions.afternoon > 0 ? ", " : ""}{sessions.afternoon > 0 ? `${sessions.afternoon} lần (chiều)` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedEmotion !== null && emotions[selectedEmotion] && (
            <div className="mt-3 p-4 bg-primary/20 rounded-3xl border-4 border-primary/30 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-xl md:text-2xl font-bold text-primary">
                Bé đang cảm thấy {emotions[selectedEmotion].label.toLowerCase()}! {getEmotionDisplayProps(emotions[selectedEmotion].label).emoji}
              </p>
            </div>
          )}
        </div>

        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border-4 border-primary/30 z-50">
              <Dialog.Title className="text-xl font-bold text-primary mb-4">
                Cảm xúc hôm nay
              </Dialog.Title>

              <Dialog.Close className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </Dialog.Close>

              <div className="flex flex-col items-center gap-4">
                {selectedEmotion !== null && emotions[selectedEmotion] && (
                  <>
                    <Image
                      src={emotions[selectedEmotion].image}
                      alt={emotions[selectedEmotion].label}
                      width={128}
                      height={128}
                      className="w-24 h-24 md:w-32 md:h-32 object-contain rounded-full border-4 border-primary/30 animate-bounce"
                    />
                    <p className="text-xl font-semibold text-primary text-center">
                      {emotions[selectedEmotion].message}
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