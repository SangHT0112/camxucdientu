"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { BarChart3, LayoutDashboard, Users, Activity, HelpCircle } from "lucide-react"

export default function AdminPage() {
  const cards = [
    { title: "Dashboard", desc: "Xem thống kê nhanh", href: "/admin/dashboard", icon: LayoutDashboard, btnText: "Xem ngay" },
    { title: "Cảm xúc", desc: "Theo dõi cảm xúc học sinh", href: "/admin/emotions", icon: Activity, btnText: "Quản lý" },
    { title: "Thống kê", desc: "Phân tích dữ liệu", href: "/admin/statistics", icon: BarChart3, btnText: "Xem thống kê" },
    { title: "Học sinh", desc: "Quản lý thông tin học sinh", href: "/admin/students", icon: Users, btnText: "Quản lý học sinh" },
    { title: "Câu hỏi bé ngoan", desc: "Quản lý câu hỏi và đáp án", href: "/admin/questions", icon: HelpCircle, btnText: "Quản lý câu hỏi" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Chào mừng đến Admin Panel</h1>
        <p className="text-muted-foreground">Chọn một mục từ sidebar để quản lý.</p>
      </div>

      {/* Grid cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {cards.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="hover:shadow-lg transition-shadow flex flex-col justify-between">
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex flex-col justify-between flex-1">
                <div className="text-xl font-bold">{item.title}</div>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href={item.href}>{item.btnText}</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
