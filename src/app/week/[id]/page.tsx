'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Week = {
  id: string
  week_number: number
  theme: string
  summary: string
}

type Card = {
  id: string
  question: string
  answer: string
  week_number: number
  tags: string[]
  difficulty: string
}

export default function WeekDetailPage() {
  const params = useParams()
  const weekNumber = Number(params.id)
  const [week, setWeek] = useState<Week | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: weekData } = await supabase
        .from('gilead_curriculum_weeks')
        .select('*')
        .eq('week_number', weekNumber)
        .single()
      setWeek(weekData)

      const { data: cardData } = await supabase
        .from('gilead_flashcards')
        .select('*')
        .eq('week_number', weekNumber)
        .order('created_at')
      setCards(cardData || [])
      setLoading(false)
    }
    load()
  }, [weekNumber])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading week {weekNumber}...</p>
      </div>
    </div>
  )

  if (!week) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p className="text-slate-400 mb-4">Week not found.</p>
      <Link href="/" className="text-emerald-400 underline">Back to dashboard</Link>
    </div>
  )

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-emerald-500/20 text-emerald-400'
      case 'medium': return 'bg-amber-500/20 text-amber-400'
      case 'hard': return 'bg-rose-500/20 text-rose-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Week {week.week_number}</span>
            <h1 className="text-2xl font-bold mt-1">{week.theme}</h1>
            <p className="text-slate-400 mt-2">{week.summary}</p>
          </div>
          <Link
            href={`/review?week=${week.week_number}`}
            className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap ml-4"
          >
            Study Cards
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <p className="text-2xl font-bold text-sky-400">{cards.length}</p>
          <p className="text-xs text-slate-400 mt-1">Total Cards</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <p className="text-2xl font-bold text-emerald-400">{cards.filter(c => c.difficulty === 'easy').length}</p>
          <p className="text-xs text-slate-400 mt-1">Easy</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <p className="text-2xl font-bold text-rose-400">{cards.filter(c => c.difficulty === 'hard').length}</p>
          <p className="text-xs text-slate-400 mt-1">Hard</p>
        </div>
      </div>

      {/* Flashcards List */}
      <h2 className="text-lg font-semibold mb-4">Flashcards ({cards.length})</h2>
      <div className="space-y-3">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden transition-all"
          >
            <button
              onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
              className="w-full text-left p-4 hover:bg-slate-800/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs text-slate-500 mr-2">#{i + 1}</span>
                  <span className="text-sm font-medium">{card.question}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColor(card.difficulty)}`}>
                    {card.difficulty}
                  </span>
                  <span className="text-slate-500 text-sm">{expandedCard === card.id ? '▲' : '▼'}</span>
                </div>
              </div>
            </button>
            {expandedCard === card.id && (
              <div className="px-4 pb-4 border-t border-slate-700/50">
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">{card.answer}</p>
                {card.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {card.tags.map((tag, j) => (
                      <span key={j} className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {cards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No flashcards yet for this week.</p>
        </div>
      )}
    </main>
  )
}
