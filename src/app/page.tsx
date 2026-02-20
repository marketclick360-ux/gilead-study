'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Week = { id: string; week_number: number; theme: string; summary: string }
type CardCount = { week_number: number; count: number }

export default function Dashboard() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [cardCounts, setCardCounts] = useState<Record<number, number>>({})
  const [reviewedCounts, setReviewedCounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: weekData } = await supabase
        .from('gilead_curriculum_weeks')
        .select('*')
        .order('week_number')
      setWeeks(weekData || [])

      const { data: cards } = await supabase
        .from('gilead_flashcards')
        .select('week_number')
      
      if (cards) {
        const counts: Record<number, number> = {}
        cards.forEach((c: { week_number: number }) => {
          counts[c.week_number] = (counts[c.week_number] || 0) + 1
        })
        setCardCounts(counts)
      }

      // Load review progress from localStorage
      try {
        const stored = localStorage.getItem('gilead_review_progress')
        if (stored) {
          setReviewedCounts(JSON.parse(stored))
        }
      } catch {}

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
    }
  }, [])

  const totalCards = Object.values(cardCounts).reduce((a, b) => a + b, 0)
  const totalReviewed = Object.values(reviewedCounts).reduce((a, b) => a + b, 0)

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div><p className="text-slate-400">Loading...</p></div></div>

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold">Gilead Study</h1>
          <p className="text-slate-400 mt-1">Scripture study with spaced repetition</p>
        </div>
        <Link
          href="/review"
          className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Start Review
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <p className="text-2xl font-bold text-emerald-400">{weeks.length}</p>
          <p className="text-xs text-slate-400 mt-1">Weeks</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <p className="text-2xl font-bold text-sky-400">{totalCards}</p>
          <p className="text-xs text-slate-400 mt-1">Flashcards</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <p className="text-2xl font-bold text-amber-400">{totalReviewed}</p>
          <p className="text-xs text-slate-400 mt-1">Reviewed</p>
        </div>
      </div>

      {/* Week Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weeks.map((w) => {
          const cards = cardCounts[w.week_number] || 0
          const reviewed = reviewedCounts[w.week_number] || 0
          const progress = cards > 0 ? Math.min(100, Math.round((reviewed / cards) * 100)) : 0

          return (
            <Link
              key={w.id}
              href={`/week/${w.week_number}`}
              className="block bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 hover:border-emerald-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Week {w.week_number}</span>
                <span className="text-xs text-slate-500">{cards} cards</span>
              </div>
              <h2 className="text-lg font-semibold mb-2 group-hover:text-emerald-300 transition-colors">{w.theme}</h2>
              <p className="text-sm text-slate-400 line-clamp-2 mb-3">{w.summary}</p>
              
              {/* Progress bar */}
              <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-500">{progress}% reviewed</span>
                <span className="text-xs text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">Study →</span>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
