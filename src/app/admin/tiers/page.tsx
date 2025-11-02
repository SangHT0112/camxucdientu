"use client"

import { useEffect, useState } from "react"

interface Tier {
  id: number
  tier_name: string
  price: number
  max_tests: number
  max_questions: number
  created_at: string
}

export default function AdminTiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const res = await fetch("/api/tiers")
        const data = await res.json()
        setTiers(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Error loading tiers:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchTiers()
  }, [])

  if (loading) return <p className="p-6 text-gray-500">Loading tiers...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tier Management</h1>
      <table className="w-full border border-gray-300 text-sm rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Tier Name</th>
            <th className="border p-2">Price (VND)</th>
            <th className="border p-2">Max Tests</th>
            <th className="border p-2">Max Questions</th>
            <th className="border p-2">Created At</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map(t => (
            <tr key={t.id} className="hover:bg-gray-50 text-center">
              <td className="border p-2">{t.id}</td>
              <td className="border p-2 font-medium capitalize">{t.tier_name}</td>
              <td className="border p-2">{t.price.toLocaleString("vi-VN")}</td>
              <td className="border p-2">{t.max_tests}</td>
              <td className="border p-2">{t.max_questions}</td>
              <td className="border p-2">
                {new Date(t.created_at).toLocaleDateString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
