"use client"

import { useEffect, useState } from "react"

interface Book {
  id: number
  name: string
  applicable_for: string
  publisher: string
  created_at: string
}

export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await fetch("/api/books")
        const data = await res.json()
        setBooks(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Error loading books:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchBooks()
  }, [])

  if (loading) return <p className="p-6 text-gray-500">Loading books...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Book Management</h1>
      <table className="w-full border border-gray-300 text-sm rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Book Name</th>
            <th className="border p-2">Applicable For</th>
            <th className="border p-2">Publisher</th>
            <th className="border p-2">Created At</th>
          </tr>
        </thead>
        <tbody>
          {books.map(b => (
            <tr key={b.id} className="hover:bg-gray-50 text-center">
              <td className="border p-2">{b.id}</td>
              <td className="border p-2 font-medium">{b.name}</td>
              <td className="border p-2">{b.applicable_for}</td>
              <td className="border p-2">{b.publisher}</td>
              <td className="border p-2">
                {new Date(b.created_at).toLocaleDateString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
