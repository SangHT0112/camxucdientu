// app/admin/layout.tsx
"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Activity, BarChart3, Users } from "lucide-react"
import type { ReactNode } from "react"

const sidebarItems = [
  { href: "/admin/emotions", label: "Quản lý cảm xúc", icon: Activity },
  { href: "/admin/statistics", label: "Thống kê", icon: BarChart3 },
  { href: "/admin/students", label: "Quản lý học sinh", icon: Users },
]

export default function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navigation */}
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Admin Panel</h2>
        </div>
        <nav className="flex flex-row overflow-x-auto pb-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "secondary" : "ghost"}
                className="flex-1 min-w-[120px] max-w-xs justify-center mx-1 rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary hover:border-primary/50 data-[state=active]:bg-secondary/50"
              >
                <Link href={item.href} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs md:text-sm whitespace-nowrap">{item.label}</span>
                </Link>
              </Button>
            )
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}