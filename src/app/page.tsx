'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Week = { id: string; week_number: number; theme: string; summary: string }

export default function Dashboard() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('gilead_curriculum_weeks')
      .select('*')
      .order('week_number')
      .then(({ data }) => {
        setWeeks(data || [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
    }
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gilead Study</h1>
          <p className="text-slate-400 mt-1">Scripture study with spaced repetition</p>
        </div>
        <Link
          href="/review"
          className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-semibold"
        >
          Start Review
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {weeks.map((w) => (
          <Link
            key={w.id}
            href={`/review?week=${w.week_number}`}
            className="block p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-emerald-600 transition-colors"
          >
            <div className="text-emerald-400 text-sm font-medium mb-1">Week {w.week_number}</div>
            <h2 className="text-lg font-semibold mb-2">{w.theme}</h2>
            <p className="text-slate-400 text-sm line-clamp-2">{w.summary}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
