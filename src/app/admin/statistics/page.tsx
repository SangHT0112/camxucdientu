"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip,
  LineChart, Line, Legend, ResponsiveContainer
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as XLSX from "xlsx"

// Interfaces
interface BeInfo {
  id: number
  sbd: number
  name: string
  gender: string
  age: number
  dob: string
  lop: string
  parent: string
  phone: string
  address: string
  teacher_id: number
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
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date().toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0]
  })
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filteredBes, setFilteredBes] = useState<BeInfo[]>([])
  const [weeklyData, setWeeklyData] = useState<{ day: string; morning: number; afternoon: number }[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; positiveMorning: number; positiveAfternoon: number; negativeMorning: number; negativeAfternoon: number }[]>([])

  // Lọc danh sách bé theo từ khóa tìm kiếm
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBes(bes)
    } else {
      const filtered = bes.filter(be =>
        be.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        be.lop.toLowerCase().includes(searchTerm.toLowerCase()) ||
        be.sbd.toString().includes(searchTerm)
      )
      setFilteredBes(filtered)
    }
  }, [searchTerm, bes])

  // Fetch data khi selectedDate hoặc dateRange thay đổi
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1️⃣ Lấy danh sách bé
        const resBes = await fetch("/api/bes")
        const besData: BeInfo[] = await resBes.json()
        console.log("📥 [fetchData] Dữ liệu bes:", besData)
        setBes(besData)
        setFilteredBes(besData)

        // 2️⃣ Lấy logs theo ngày được chọn
        const resLogs = await fetch(`/api/emotion_logs?date=${selectedDate}`)
        const logsData: EmotionLog[] = await resLogs.json()
        console.log("📥 [fetchData] Dữ liệu emotion_logs:", logsData)
        setLogs(logsData)

        // 3️⃣ Thống kê tuần
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

        // 4️⃣ Thống kê tháng
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

  // Fetch logs theo khoảng thời gian
  const fetchLogsByDateRange = async () => {
    try {
      const res = await fetch(`/api/emotion_logs?from=${dateRange.from}&to=${dateRange.to}`)
      const logsData: EmotionLog[] = await res.json()
      console.log("📥 [fetchLogsByDateRange] Dữ liệu logs theo khoảng:", logsData)
      setLogs(logsData)
    } catch (error) {
      console.error("❌ Lỗi fetchLogsByDateRange:", error)
    }
  }

  // Xuất Excel với khoảng thời gian
  const exportExcel = () => {
    const wsData = filteredBes.map(be => {
      // Lọc logs theo bé và khoảng thời gian
      const childLogs = logs.filter(log => log.child_id === be.sbd)
      
      const morningEmotion = childLogs
        .filter(log => log.session === "morning")
        .map(log => `${log.emotion_label} (${new Date(log.date).toLocaleDateString('vi-VN')})`)
        .join(', ') || "Chưa có"
        
      const afternoonEmotion = childLogs
        .filter(log => log.session === "afternoon")
        .map(log => `${log.emotion_label} (${new Date(log.date).toLocaleDateString('vi-VN')})`)
        .join(', ') || "Chưa có"

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
    
    const fileName = dateRange.from === dateRange.to 
      ? `EmotionStats_${selectedDate}.xlsx`
      : `EmotionStats_${dateRange.from}_to_${dateRange.to}.xlsx`
      
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-bold">Thống kê cảm xúc bé</h2>

      {/* Thanh tìm kiếm */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Tìm kiếm theo tên bé, lớp hoặc mã bé..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md mb-4"
        />
      </div>

      {/* Chọn ngày và khoảng thời gian */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Chọn ngày cụ thể */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-1">Chọn ngày cụ thể:</label>
          <Input
            type="date"
            id="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border p-1 rounded"
          />
        </div>

        {/* Chọn khoảng thời gian */}
        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium mb-1">Từ ngày:</label>
          <Input
            type="date"
            id="dateFrom"
            value={dateRange.from}
            onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="border p-1 rounded"
          />
        </div>

        <div>
          <label htmlFor="dateTo" className="block text-sm font-medium mb-1">Đến ngày:</label>
          <Input
            type="date"
            id="dateTo"
            value={dateRange.to}
            onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="border p-1 rounded"
          />
        </div>
      </div>

      {/* Nút hành động */}
      <div className="flex gap-4 mb-4">
        <Button 
          onClick={fetchLogsByDateRange} 
          className="bg-green-500 text-white"
          disabled={!dateRange.from || !dateRange.to}
        >
          Lọc theo khoảng thời gian
        </Button>
        <Button onClick={exportExcel} className="bg-blue-500 text-white">
          Xuất Excel
        </Button>
      </div>

      {/* Thông tin về bộ lọc hiện tại */}
      <div className="bg-blue-50 p-3 rounded-md">
        <p className="text-sm text-blue-800">
          Đang hiển thị: {dateRange.from === dateRange.to 
            ? `dữ liệu ngày ${selectedDate}` 
            : `dữ liệu từ ${dateRange.from} đến ${dateRange.to}`
          } | 
          Số bé: {filteredBes.length} | 
          Tổng số bản ghi cảm xúc: {logs.length}
        </p>
      </div>

      {/* Danh sách bé + trạng thái cảm xúc */}
      <table className="w-full table-auto border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Mã bé</th>
            <th className="border p-2">Tên bé</th>
            <th className="border p-2">Lớp</th>
            <th className="border p-2">Cảm xúc buổi sáng</th>
            <th className="border p-2">Cảm xúc buổi chiều</th>
          </tr>
        </thead>
        <tbody>
          {filteredBes.length > 0 ? (
            filteredBes.map(be => {
              // Lọc logs cho bé cụ thể
              const childLogs = logs.filter(log => log.child_id === be.sbd)
              
              const morningEmotions = childLogs
                .filter(log => log.session === "morning")
                .map(log => `${log.emotion_label} (${new Date(log.date).toLocaleDateString('vi-VN')})`)
              
              const afternoonEmotions = childLogs
                .filter(log => log.session === "afternoon")
                .map(log => `${log.emotion_label} (${new Date(log.date).toLocaleDateString('vi-VN')})`)

              return (
                <tr key={be.sbd}>
                  <td className="border p-2">{be.sbd}</td>
                  <td className="border p-2">{be.name}</td>
                  <td className="border p-2">{be.lop}</td>
                  <td className="border p-2">
                    {morningEmotions.length > 0 ? (
                      <ul className="list-disc list-inside text-sm">
                        {morningEmotions.map((emotion, index) => (
                          <li key={index}>{emotion}</li>
                        ))}
                      </ul>
                    ) : "Chưa có"}
                  </td>
                  <td className="border p-2">
                    {afternoonEmotions.length > 0 ? (
                      <ul className="list-disc list-inside text-sm">
                        {afternoonEmotions.map((emotion, index) => (
                          <li key={index}>{emotion}</li>
                        ))}
                      </ul>
                    ) : "Chưa có"}
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={5} className="border p-4 text-center text-gray-500">
                Không tìm thấy bé nào phù hợp
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Tabs thống kê */}
      <Tabs defaultValue="week" className="mt-6">
        <TabsList>
          <TabsTrigger value="week">Tuần</TabsTrigger>
          <TabsTrigger value="month">Tháng</TabsTrigger>
        </TabsList>

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