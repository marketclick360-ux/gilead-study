'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { sm2, Sm2State } from '@/lib/sm2'

type Card = { id: string; question: string; answer: string; week_number: number; tags: string[]; difficulty: string }

type CardReviewState = Sm2State & {
  nextReviewAt: string
  lastReviewed: string
}

function getStoredStates(): Record<string, CardReviewState> {
  try {
    const stored = localStorage.getItem('gilead_sm2_states')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveStates(states: Record<string, CardReviewState>) {
  localStorage.setItem('gilead_sm2_states', JSON.stringify(states))
}

function updateProgress(weekNumber: number) {
  try {
    const stored = localStorage.getItem('gilead_review_progress')
    const progress = stored ? JSON.parse(stored) : {}
    progress[weekNumber] = (progress[weekNumber] || 0) + 1
    localStorage.setItem('gilead_review_progress', JSON.stringify(progress))
  } catch {}
}

function ReviewContent() {
  const params = useSearchParams()
  const weekFilter = params.get('week')
  const [cards, setCards] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionStats, setSessionStats] = useState({ again: 0, good: 0, easy: 0 })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      let query = supabase.from('gilead_flashcards').select('*').order('week_number')
      if (weekFilter) query = query.eq('week_number', Number(weekFilter))
      else query = query.limit(20)
      const { data } = await query
      
      // Shuffle cards for variety
      const shuffled = (data || []).sort(() => Math.random() - 0.5)
      setCards(shuffled)
      setLoading(false)
    }
    load()
  }, [weekFilter])

  const current = cards[index]

  const rate = useCallback((quality: 1 | 3 | 5) => {
    if (!current) return
    
    const states = getStoredStates()
    const existing = states[current.id] || { repetition: 0, interval: 1, easeFactor: 2.5 }
    const result = sm2(quality, existing)
    
    states[current.id] = {
      repetition: result.repetition,
      interval: result.interval,
      easeFactor: result.easeFactor,
      nextReviewAt: result.nextReviewAt,
      lastReviewed: new Date().toISOString()
    }
    saveStates(states)
    updateProgress(current.week_number)
    
    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      ...(quality === 1 ? { again: prev.again + 1 } : {}),
      ...(quality === 3 ? { good: prev.good + 1 } : {}),
      ...(quality === 5 ? { easy: prev.easy + 1 } : {})
    }))

    setShowAnswer(false)
    if (index + 1 < cards.length) setIndex(index + 1)
    else setDone(true)
  }, [current, index, cards.length])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading cards...</p>
      </div>
    </div>
  )

  if (cards.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p className="text-slate-400 mb-4">No cards found.</p>
      <Link href="/" className="text-emerald-400 underline">Back to dashboard</Link>
    </div>
  )

  if (done) {
    const total = sessionStats.again + sessionStats.good + sessionStats.easy
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-5xl mb-4">&#127881;</div>
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <p className="text-slate-400 mb-6">You reviewed {total} cards.</p>
          
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
              <p className="text-xl font-bold text-rose-400">{sessionStats.again}</p>
              <p className="text-xs text-slate-400">Again</p>
            </div>
            <div className="bg-sky-500/10 rounded-xl p-3 border border-sky-500/20">
              <p className="text-xl font-bold text-sky-400">{sessionStats.good}</p>
              <p className="text-xs text-slate-400">Good</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
              <p className="text-xl font-bold text-emerald-400">{sessionStats.easy}</p>
              <p className="text-xs text-slate-400">Easy</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/" className="flex-1 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 font-semibold text-center transition-colors">Dashboard</Link>
            <button onClick={() => { setIndex(0); setDone(false); setSessionStats({ again: 0, good: 0, easy: 0 }) }} className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition-colors">Review Again</button>
          </div>
        </div>
      </div>
    )
  }

  const progressPercent = Math.round(((index) / cards.length) * 100)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link href={weekFilter ? `/week/${weekFilter}` : '/'} className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
          ← Back
        </Link>
        <span className="text-sm text-slate-400">{index + 1} / {cards.length}</span>
        {weekFilter && <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Week {weekFilter}</span>}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-1 mb-8">
        <div className="bg-emerald-500 h-1 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-500">Week {current.week_number}</span>
            {current.tags && current.tags.length > 0 && (
              <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">{current.tags[0]}</span>
            )}
          </div>
          <h2 className="text-xl font-semibold leading-relaxed">{current.question}</h2>

          {showAnswer && (
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <p className="text-slate-300 leading-relaxed">{current.answer}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-lg transition-colors"
          >
            Show Answer
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => rate(1)} className="py-4 rounded-xl bg-rose-600 hover:bg-rose-700 font-semibold transition-colors">
              <span className="block text-lg">Again</span>
              <span className="block text-xs text-rose-200 mt-0.5">1 day</span>
            </button>
            <button onClick={() => rate(3)} className="py-4 rounded-xl bg-sky-600 hover:bg-sky-700 font-semibold transition-colors">
              <span className="block text-lg">Good</span>
              <span className="block text-xs text-sky-200 mt-0.5">6 days</span>
            </button>
            <button onClick={() => rate(5)} className="py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold transition-colors">
              <span className="block text-lg">Easy</span>
              <span className="block text-xs text-emerald-200 mt-0.5">15 days</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-slate-400">Loading...</p></div>}>
      <ReviewContent />
    </Suspense>
  )
}
