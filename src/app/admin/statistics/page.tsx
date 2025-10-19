"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip,
  LineChart, Line, Legend, ResponsiveContainer
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as XLSX from "xlsx"

// Interfaces
interface BeInfo {
  id: number       // ID của bé, dùng để liên kết với emotion_logs.child_id
  sbd: number      // số thứ tự hiển thị
  name: string
  gender: string
  age: number
  dob: string
  lop: string
  parent: string
  phone: string
  address: string
  teacher_id: number  // user_id của giáo viên
}


interface EmotionLog {
  child_id: number
  child_name: string
  class_name: string
  emotion_label: string
  date: string
  session: string
  created_at: string
}

// Component
export default function StatisticsPage() {
  const [bes, setBes] = useState<BeInfo[]>([])
  const [logs, setLogs] = useState<EmotionLog[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  // const [todayData, setTodayData] = useState<{ name: string; session: string; count: number }[]>([])
  const [weeklyData, setWeeklyData] = useState<{ day: string; morning: number; afternoon: number }[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; positiveMorning: number; positiveAfternoon: number; negativeMorning: number; negativeAfternoon: number }[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1️⃣ Lấy danh sách bé
        const resBes = await fetch("/api/bes")
        const besData: BeInfo[] = await resBes.json()
        console.log("📥 [fetchData] Dữ liệu bes:", besData)
        setBes(besData) // Không deduplicate, vì dữ liệu đã đúng

        // 2️⃣ Lấy logs hôm nay
        const resLogs = await fetch(`/api/emotion_logs?date=${selectedDate}`)
        const logsData: EmotionLog[] = await resLogs.json()
        console.log("📥 [fetchData] Dữ liệu emotion_logs:", logsData)
        setLogs(logsData)

        // 3️⃣ Tổng hợp PieChart (theo buổi)
        // Lấy trực tiếp từ logs đã fetch
        const todayStats = logs.map(log => ({
          emotion_label: log.emotion_label,
          session: log.session
        }))
        console.log("📥 [fetchData] Dữ liệu todayStats:", todayStats)
        
        // const processedTodayData = todayStats.reduce((acc: any[], stat) => {
        //   const key = `${stat.emotion_label} (${stat.session === "morning" ? "Sáng" : "Chiều"})`
        //   const existing = acc.find(item => item.name === key)
        //   if (existing) {
        //     existing.count++
        //   } else {
        //     acc.push({ name: key, session: stat.session, count: 1 })
        //   }
        //   return acc
        // }, [])
        
        // setTodayData(processedTodayData)

        // 4️⃣ Thống kê tuần
        const weekLogs: EmotionLog[] = await fetch(`/api/emotion_logs?lastDays=7`).then(r => r.json())
        console.log("📥 [fetchData] Dữ liệu weekLogs:", weekLogs)
        const days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - i)
          return date.toLocaleDateString("vi-VN", { weekday: "short" })
        }).reverse()
        const weekSummary = days.map(day => {
          const currentDayLogs = weekLogs.filter(log => {
            const logDate = new Date(log.date)
            return logDate.toLocaleDateString("vi-VN", { weekday: "short" }) === day
          })
          const morningCount = currentDayLogs.filter(log => log.session === "morning").length
          const afternoonCount = currentDayLogs.filter(log => log.session === "afternoon").length
          return { day, morning: morningCount, afternoon: afternoonCount }
        })
        console.log("📥 [fetchData] Dữ liệu weekSummary:", weekSummary)
        setWeeklyData(weekSummary)

        // 5️⃣ Thống kê tháng
        const monthLogs: EmotionLog[] = await fetch(`/api/emotion_logs?lastMonths=6`).then(r => r.json())
        console.log("📥 [fetchData] Dữ liệu monthLogs:", monthLogs)
        const months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          return date.toLocaleDateString("vi-VN", { month: "numeric" })
        }).reverse()
        const monthSummary = months.map(month => {
          const positiveMorning = monthLogs.filter(log => 
            new Date(log.date).toLocaleDateString("vi-VN", { month: "numeric" }) === month &&
            ["Vui vẻ", "Bình thường", "Yêu thích"].includes(log.emotion_label) &&
            log.session === "morning"
          ).length
          const positiveAfternoon = monthLogs.filter(log => 
            new Date(log.date).toLocaleDateString("vi-VN", { month: "numeric" }) === month &&
            ["Vui vẻ", "Bình thường", "Yêu thích"].includes(log.emotion_label) &&
            log.session === "afternoon"
          ).length
          const negativeMorning = monthLogs.filter(log => 
            new Date(log.date).toLocaleDateString("vi-VN", { month: "numeric" }) === month &&
            !["Vui vẻ", "Bình thường", "Yêu thích"].includes(log.emotion_label) &&
            log.session === "morning"
          ).length
          const negativeAfternoon = monthLogs.filter(log => 
            new Date(log.date).toLocaleDateString("vi-VN", { month: "numeric" }) === month &&
            !["Vui vẻ", "Bình thường", "Yêu thích"].includes(log.emotion_label) &&
            log.session === "afternoon"
          ).length
          return { month, positiveMorning, positiveAfternoon, negativeMorning, negativeAfternoon }
        })
        console.log("📥 [fetchData] Dữ liệu monthSummary:", monthSummary)
        setMonthlyTrend(monthSummary)

      } catch (error) {
        console.error("❌ Lỗi fetchData:", error)
      }
    }

    fetchData()
  }, [selectedDate])

  // Xuất Excel
  const exportExcel = () => {
    const wsData = bes.map(be => {
      const morningEmotion = logs.find(log => log.child_id === be.sbd && log.session === "morning")?.emotion_label || "Chưa có"
      const afternoonEmotion = logs.find(log => log.child_id === be.sbd && log.session === "afternoon")?.emotion_label || "Chưa có"
      return {
        "Mã bé": be.sbd,
        "Tên bé": be.name,
        "Lớp": be.lop,
        "Giới tính": be.gender,
        "Tuổi": be.age,
        "Ngày sinh": be.dob,
        "Phụ huynh": be.parent,
        "SĐT": be.phone,
        "Địa chỉ": be.address,
        "Cảm xúc buổi sáng": morningEmotion,
        "Cảm xúc buổi chiều": afternoonEmotion,
      }
    })
    console.log("📥 [exportExcel] Dữ liệu xuất Excel:", wsData)
    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Thống kê")
    XLSX.writeFile(wb, `EmotionStats_${selectedDate}.xlsx`)
  }

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-bold">Thống kê cảm xúc bé</h2>

      {/* Chọn ngày */}
      <div className="mb-4">
        <label htmlFor="date" className="mr-2 font-medium">Chọn ngày:</label>
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border p-1 rounded"
        />
        <Button onClick={exportExcel} className="ml-4 bg-blue-500 text-white">Xuất Excel</Button>
      </div>

      {/* Danh sách bé + trạng thái cảm xúc */}
      <table className="w-full table-auto border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Mã bé</th>
            <th className="border p-2">Tên bé</th>
            {/* <th className="border p-2">Lớp</th>
            <th className="border p-2">Giới tính</th>
            <th className="border p-2">Tuổi</th> */}
            <th className="border p-2">Cảm xúc buổi sáng</th>
            <th className="border p-2">Cảm xúc buổi chiều</th>
          </tr>
        </thead>
        <tbody>
          {bes.map(be => {
            const morningEmotion = logs.find(log => log.child_id === be.sbd && log.session === "morning")?.emotion_label || "Chưa có"
            const afternoonEmotion = logs.find(log => log.child_id === be.sbd && log.session === "afternoon")?.emotion_label || "Chưa có"
            return (
              <tr key={be.sbd}>
                <td className="border p-2">{be.sbd}</td> {/* Hiển thị ID bé thay vì user_id */}
                <td className="border p-2">{be.name}</td>
                {/* <td className="border p-2">{be.lop}</td>
                <td className="border p-2">{be.gender}</td>
                <td className="border p-2">{be.age}</td> */}
                <td className="border p-2">{morningEmotion}</td>
                <td className="border p-2">{afternoonEmotion}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Tabs thống kê */}
      <Tabs defaultValue="today" className="mt-6">
        <TabsList>
          <TabsTrigger value="today">Hôm nay</TabsTrigger>
          <TabsTrigger value="week">Tuần</TabsTrigger>
          <TabsTrigger value="month">Tháng</TabsTrigger>
        </TabsList>

        {/* <TabsContent value="today">
          <h3 className="text-lg font-semibold mb-2">Tỉ lệ cảm xúc hôm nay</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={todayData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {todayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={emotionColors[entry.name.split(" ")[0]] || "#888"} />
                ))}
              </Pie>
              <PieTooltip />
            </PieChart>
          </ResponsiveContainer>
        </TabsContent> */}

        <TabsContent value="week">
          <h3 className="text-lg font-semibold mb-2">Số lần cảm xúc trong tuần</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <BarTooltip />
              <Bar dataKey="morning" fill="#22c55e" name="Buổi sáng" />
              <Bar dataKey="afternoon" fill="#f472b6" name="Buổi chiều" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="month">
          <h3 className="text-lg font-semibold mb-2">Xu hướng cảm xúc theo tháng</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Line type="monotone" dataKey="positiveMorning" stroke="#22c55e" name="Tích cực (Sáng)" />
              <Line type="monotone" dataKey="positiveAfternoon" stroke="#f472b6" name="Tích cực (Chiều)" />
              <Line type="monotone" dataKey="negativeMorning" stroke="#ef4444" name="Tiêu cực (Sáng)" />
              <Line type="monotone" dataKey="negativeAfternoon" stroke="#f59e0b" name="Tiêu cực (Chiều)" />
              <Legend />
              <BarTooltip />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </div>
  )
}