"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, ArrowLeft, Sparkles } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import type { BeInfo } from "@/types/BeInfo"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { 
  FaMicrophone, 
  FaMusic, 
  FaShareAlt, 
  FaWind, 
  FaGamepad, 
  FaComments, 
  FaHeart, 
  FaHandsHelping, 
  FaHeadphones, 
  FaPaintBrush, 
  FaUsers, 
  FaHashtag, 
  FaCut, 
  FaRunning,
  FaMicrophoneAlt
} from 'react-icons/fa'
import { GiPartyPopper, GiLoveLetter, GiJumpingRope } from "react-icons/gi"
interface Emotion {
  id: number
  label: string
  message: string
  audio: string
  image: string
  color: string | null
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

interface Action {
  id: number;
  action_name: string;
  emotion_name: string;
  icon: string;
}

export default function ChildGreeting() {
  const router = useRouter()
  const params = useParams()
  const [selectedEmotion, setSelectedEmotion] = useState<number | null>(null)
  // Thay đổi state: Lưu actions theo từng emotion ID để preload
  const [actionsByEmotion, setActionsByEmotion] = useState<{ [emotionId: number]: Action[] }>({})
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
  const [actionsLoading, setActionsLoading] = useState<{ [emotionId: number]: boolean }>({}) // Optional: Track loading per emotion nếu cần
  const [userId, setUserId] = useState<number | null>(null)

  // Icon map để render dynamic icons từ FontAwesome

  const EmojiMap: { [key: string]: string } = {
    // Vui vẻ 😄
    FaMicrophone: "🎤",
    FaMusic: "🎵",
    FaShareAlt: "🤗",

    // Ngạc nhiên 😲
    FaWind: "💨",
    FaGamepad: "🎮",
    FaComments: "💬",

    // Xấu hổ 😳
    FaHeart: "💖",
    FaHandsHelping: "🤝",
    GiTeddyBear: "🧸",
    FaMicrophoneAlt: "🎶",

    // Buồn 😢
    FaHeadphones: "🎧",
    FaPaintBrush: "🎨",
    FaUsers: "👫",

    // Giận dữ 😠
    FaHashtag: "🔢",
    FaCut: "✂️",
    FaRunning: "🏃‍♂️",
  }
  
  const getActionIcon = (iconName: string) => {
    const emoji = EmojiMap[iconName]
    if (emoji) {
      return (
        <span className="text-3xl animate-bounce-fast drop-shadow-md">
          {emoji}
        </span>
      )
    }
    // fallback
    return <span className="text-3xl">⭐</span>
  }


  

  // Thay đổi: Load actions cho một emotion cụ thể (dùng từ cache)
  const loadActionsByEmotion = (emotionId: number): Action[] => {
    return actionsByEmotion[emotionId] || []
  }

  // New: Preload tất cả actions cho các emotions (gọi sau khi load emotions)
  const preloadAllActions = async (emotions: Emotion[]) => {
    const actionsMap: { [emotionId: number]: Action[] } = {}
    
    // Sử dụng Promise.all để fetch parallel (nhanh hơn serial)
    const fetchPromises = emotions.map(async (emotion) => {
      try {
        setActionsLoading(prev => ({ ...prev, [emotion.id]: true })) // Optional: Track loading
        const res = await fetch(`/api/actions?emotion_id=${emotion.id}`)
        if (res.ok) {
          const data: Action[] = await res.json()
          console.log(`Loaded actions for ${emotion.label}:`, data)
          actionsMap[emotion.id] = data
        } else {
          console.error(`Lỗi load actions cho emotion ${emotion.id}:`, res.status)
          actionsMap[emotion.id] = []
        }
      } catch (error) {
        console.error(`Lỗi load actions cho emotion ${emotion.id}:`, error)
        actionsMap[emotion.id] = []
      } finally {
        setActionsLoading(prev => ({ ...prev, [emotion.id]: false })) // Optional
      }
    })

    await Promise.all(fetchPromises)
    setActionsByEmotion(actionsMap)
    console.log("All actions preloaded:", actionsMap)
  }

  // Load user from localStorage on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      setUserId(user?.id || null);
    }
  }, [])

  // Load emotions từ database
  useEffect(() => {
    const loadEmotions = async () => {
      try {
        const response = await fetch("/api/emotions")
        if (response.ok) {
          const emotionsData: Emotion[] = await response.json()
          console.log("Loaded emotions:", emotionsData)
          setEmotions(emotionsData)
          
          // New: Preload actions ngay sau khi load emotions (chỉ nếu có emotions)
          if (emotionsData.length > 0) {
            preloadAllActions(emotionsData)
          }
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
          headers: { "user-id": String(userId || 1) },
        })
        if (response.ok) {
          const be: BeInfo = await response.json()
          if (be) {
            setChild({
              name: be.name || "Bé yêu",
              gender: be.gender || "",
              lop: be.lop || "",
              photo: be.avatar ? be.avatar : `/happy-${(be.gender || "Nam") === "Nữ" ? "girl" : "boy"}-preschool.jpg`,
            })
            return
          }
        }
      } catch (error) {
        console.error("Lỗi load child từ API:", error)
      }

      // Fallback localStorage - safe inside useEffect
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem("beList")
        if (saved) {
          const parsed = JSON.parse(saved) as BeInfo[]
          const be = parsed.find((b) => b.sbd.toString() === id)
          if (be) {
            setChild({
              name: be.name || "Bé yêu",
              gender: be.gender || "",
              lop: be.lop || "",
              photo: be.avatar ? be.avatar : `/happy-${be.gender === "Nữ" ? "girl" : "boy"}-preschool.jpg`,
            })
          } else {
            alert("Không tìm thấy bé! Quay lại upload danh sách.")
            router.push("/")
          }
        }
      }
    }
    loadChild()
  }, [params.id, router, userId])

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

      // Thay đổi: Lấy actions từ cache thay vì fetch lại (nhanh hơn)
      const emotionId = emotions[index].id
      const cachedActions = loadActionsByEmotion(emotionId)
      console.log("Using cached actions:", cachedActions)

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

  const handleActionSelect = (action: Action) => {
    console.log("Selected action:", action)
    // Có thể lưu action log vào DB nếu cần (tương tự emotion log)
    // Ví dụ: POST to /api/action_logs with { child_id, action_id, etc. }
    
    setIsModalOpen(false)
    // Chuyển đến quiz sau khi chọn action
    router.push(`/`)
  }

  const handleBack = () => {
    router.push("/")
  }

  // Chọn gradient dựa trên giới tính
  const getButtonGradient = () => {
    if (child.gender === "Nam") {
      return "bg-gradient-to-br from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl";
    } else {
      return "bg-gradient-to-br from-pink-200 to-purple-300 hover:from-pink-300 hover:to-purple-400 text-[#F3E8FF] shadow-md hover:shadow-lg";
    }
  };

  // Chọn style viền avatar dựa trên giới tính
  const getAvatarBorder = () => {
    if (child.gender === "Nam") {
      return {
        border: "border-blue-300",
        blurGradient: "from-blue-300/30 to-cyan-300/30",
      };
    } else {
      return {
        border: "border-pink-300",
        blurGradient: "from-pink-300/30 to-purple-300/30",
      };
    }
  }

  const buttonGradient = getButtonGradient();
  const avatarStyle = getAvatarBorder();

  // Helper: Lấy actions cho emotion hiện tại (dùng trong modal)
  const currentActions = selectedEmotion !== null ? loadActionsByEmotion(emotions[selectedEmotion]?.id || 0) : []

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300">
        <Card className="max-w-2xl w-full p-8 text-center bg-white/80 shadow-2xl border-4 border-yellow-300">
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="w-8 h-8 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-8 h-8 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-2xl font-bold text-purple-600">Đang tải vui vẻ cho bé...</p>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300 relative overflow-hidden">
      <Card className="relative max-w-2xl w-full p-4 md:p-12 shadow-2xl border-4 border-yellow-300 bg-white/80 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="absolute top-4 left-4 text-purple-600 hover:text-purple-800 bg-white/80 hover:bg-white/90 rounded-full shadow-lg"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Quay lại
        </Button>

        <div className="flex flex-col items-center gap-3 text-center mt-6">
          <div className="flex gap-3 animate-bounce">
            <Star className="w-4 h-4 text-pink-500 fill-pink-500" />
            <Sparkles className="w-5 h-5 text-purple-500 fill-purple-500" />
            <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
          </div>

          <h1 className="text-3xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent leading-tight text-balance">
            Xin chào {child.name}!
          </h1>

          <div className="relative w-32 h-32 md:w-64 md:h-64 my-2">
            <div className={`absolute inset-0 bg-gradient-to-br ${avatarStyle.blurGradient} rounded-full blur-2xl animate-pulse`} />
            <Image
              src={child.photo || "/placeholder.svg"}
              alt={child.name}
              width={256}
              height={256}
              className={`relative w-full h-full object-cover rounded-full border-8 ${avatarStyle.border} shadow-2xl`}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xl md:text-3xl font-semibold text-pink-500 leading-relaxed drop-shadow-md">
              Hôm nay bé cảm thấy thế nào? 🌼
            </p>
            <p className="text-base md:text-xl text-purple-600 font-semibold">Chọn cảm xúc của bé nhé! 💖</p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-3">
            {emotions.map((emotion, index) => (
              <Button
                key={emotion.id}
                onClick={() => handleEmotionSelect(index)}
                className={`
                  ${selectedEmotion === index ? "ring-4 ring-white scale-105 shadow-2xl" : ""}
                  w-full h-16 md:h-24 flex flex-col items-center justify-center gap-1 px-4
                  rounded-2xl transition-all hover:scale-105 duration-300
                  text-white font-bold border-4 border-white/50
                  relative overflow-hidden
                  ${buttonGradient}
                `}
              >
                {/* Ảnh cảm xúc */}
                <div className="w-8 h-8 md:w-12 md:h-12 relative flex-shrink-0 z-10">
                 <Image
                    src={emotion.image || "/placeholder.svg"}
                    alt={emotion.label}
                    width={48}
                    height={48}
                    className="w-full h-full object-contain filter drop-shadow-md animate-bounce-fast mix-blend-multiply"
                  />
                </div>

                {/* Nhãn cảm xúc */}
                <span className="text-xs md:text-sm font-bold text-center text-gray-700 drop-shadow-md z-10 relative">{emotion.label}</span>

                {/* Hiệu ứng nền */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              </Button>
            ))}
          </div>

          {/* {Object.keys(dailyEmotions).length > 0 && (
            <div className="bg-pink-200/50 p-3 rounded-lg w-full max-w-md mt-2 border-2 border-pink-300">
              <p className="font-semibold mb-1 text-sm text-pink-700">Hôm nay bé cảm thấy:</p>
              <ul className="text-xs space-y-0.5 text-pink-600">
                {Object.entries(dailyEmotions).map(([emotion, sessions]) => (
                  <li key={emotion}>
                    {emotion}: {sessions.morning > 0 ? `${sessions.morning} lần (sáng)` : ""}
                    {sessions.morning > 0 && sessions.afternoon > 0 ? ", " : ""}
                    {sessions.afternoon > 0 ? `${sessions.afternoon} lần (chiều)` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )} */}

          {selectedEmotion !== null && emotions[selectedEmotion] && (
            <div className="mt-3 p-4 bg-gradient-to-r from-pink-200 to-purple-200 rounded-3xl border-4 border-purple-300 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Bé đang cảm thấy {emotions[selectedEmotion].label.toLowerCase()}!
              </p>
            </div>
          )}
        </div>

        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border-4 border-yellow-300 z-50">
              <Dialog.Title className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Cảm xúc hôm nay
              </Dialog.Title>

              <Dialog.Close className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </Dialog.Close>

              <div className="flex flex-col items-center gap-4">
                {selectedEmotion !== null && emotions[selectedEmotion] && (
                  <>
                    <Image
                      src={emotions[selectedEmotion].image || "/placeholder.svg"}
                      alt={emotions[selectedEmotion].label}
                      width={128}
                      height={128}
                      className="w-24 h-24 md:w-32 md:h-32 object-contain rounded-full border-4 border-pink-300 animate-bounce"
                    />
                    <p className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent text-center">
                      {emotions[selectedEmotion].message}
                    </p>
                  </>
                )}

                {/* Hiển thị các hành động để chọn tiếp (dùng currentActions) */}
               {currentActions.length > 0 ? (
                  <>
                    <p className="text-lg font-semibold text-purple-600 text-center mb-3">
                      Bé muốn làm gì tiếp theo? ✨
                    </p>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center w-full">
                      {currentActions.map((action) => (
                        <div
                          key={action.id}
                          onClick={() => handleActionSelect(action)}
                          className={`${buttonGradient} w-16 h-16 rounded-full border-2 border-white 
                                      hover:scale-110 transition-all flex flex-col items-center 
                                      justify-center cursor-pointer shadow-md`}
                        >
                          <span className="text-3xl">{getActionIcon(action.icon)}</span>
                        </div>
                      ))}
                    </div>

                     <Button
                      onClick={() => router.push("/")}
                      className={`${buttonGradient} text-white px-6 py-2 text-gray-700  rounded-full`}
                    >
                      Quay về trang chủ
                    </Button>
                  </>
                ) : (
                  <p className="text-center text-purple-600">Đang tải gợi ý...</p>
                )}

                {/* Fallback buttons nếu không có actions */}
                {currentActions.length === 0 && (
                  <>
                    <Button
                      onClick={() => router.push("/")}
                      className={`${buttonGradient} text-white px-6 py-2 text-gray-700  rounded-full`}
                    >
                      Quay về trang chủ
                    </Button>
                  </>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </Card>
    </main>
  )
}