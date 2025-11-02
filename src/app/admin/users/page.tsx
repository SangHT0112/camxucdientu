"use client"

import { useEffect, useState } from "react"

interface User {
  id: number
  username: string
  email: string
  role: string
  tier_name?: string
  is_active: number
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users")
        const data = await res.json()
        console.log("API data:", data)

        setUsers(data)
      } catch (err) {
        console.error("Error loading users:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  if (loading) return <p className="p-6 text-gray-500">Loading users...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>

      <table className="w-full border border-gray-300 text-sm rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Username</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Role</th>
            <th className="border p-2">Tier</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Created At</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="hover:bg-gray-50 text-center">
              <td className="border p-2">{u.id}</td>
              <td className="border p-2 font-medium">{u.username}</td>
              <td className="border p-2">{u.email}</td>
              <td className="border p-2 capitalize">{u.role}</td>
              <td className="border p-2">{u.tier_name || "Free"}</td>
              <td className="border p-2">
                {u.is_active ? (
                  <span className="text-green-600 font-semibold">✅ Active</span>
                ) : (
                  <span className="text-red-600 font-semibold">⛔ Locked</span>
                )}
              </td>
              <td className="border p-2">
                {new Date(u.created_at).toLocaleDateString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
