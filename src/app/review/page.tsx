'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
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
  const [cardAnim, setCardAnim] = useState<string>('card-enter')
  const [isFlipped, setIsFlipped] = useState(false)

  // Swipe state
  const [swipeX, setSwipeX] = useState(0)
  const [swipeY, setSwipeY] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const SWIPE_THRESHOLD = 80

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      let query = supabase.from('gilead_flashcards').select('*').order('week_number')
      if (weekFilter) query = query.eq('week_number', Number(weekFilter))
      else query = query.limit(20)
      const { data } = await query

      const shuffled = (data || []).sort(() => Math.random() - 0.5)
      setCards(shuffled)
      setLoading(false)
    }
    load()
  }, [weekFilter])

  const current = cards[index]

  const advanceCard = useCallback((animClass: string) => {
    setCardAnim(animClass)
    setTimeout(() => {
      setShowAnswer(false)
      setIsFlipped(false)
      if (index + 1 < cards.length) {
        setIndex(index + 1)
        setCardAnim('card-enter')
      } else {
        setDone(true)
      }
    }, 350)
  }, [index, cards.length])

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

    setSessionStats(prev => ({
      ...prev,
      ...(quality === 1 ? { again: prev.again + 1 } : {}),
      ...(quality === 3 ? { good: prev.good + 1 } : {}),
      ...(quality === 5 ? { easy: prev.easy + 1 } : {})
    }))

    const animMap = { 1: 'card-swipe-left', 3: 'card-swipe-up', 5: 'card-swipe-right' }
    advanceCard(animMap[quality])
  }, [current, advanceCard])

  const handleFlip = useCallback(() => {
    if (!showAnswer) {
      setIsFlipped(true)
      setTimeout(() => setShowAnswer(true), 300)
    }
  }, [showAnswer])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (done || loading || cards.length === 0) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!showAnswer) handleFlip()
      }
      if (showAnswer) {
        if (e.key === '1') rate(1)
        if (e.key === '2') rate(3)
        if (e.key === '3') rate(5)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [done, loading, cards.length, showAnswer, handleFlip, rate])

  // Touch handlers for swipe
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!showAnswer) return
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    setIsSwiping(true)
  }, [showAnswer])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !showAnswer) return
    const touch = e.touches[0]
    setSwipeX(touch.clientX - touchStart.current.x)
    setSwipeY(touch.clientY - touchStart.current.y)
  }, [showAnswer])

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !showAnswer) return
    setIsSwiping(false)

    if (swipeX < -SWIPE_THRESHOLD) {
      rate(1) // Swipe left = Again
    } else if (swipeX > SWIPE_THRESHOLD) {
      rate(5) // Swipe right = Easy
    } else if (swipeY < -SWIPE_THRESHOLD) {
      rate(3) // Swipe up = Good
    }

    setSwipeX(0)
    setSwipeY(0)
    touchStart.current = null
  }, [showAnswer, swipeX, swipeY, rate])

  // Derive swipe indicator opacity from drag distance
  const swipeIndicatorOpacity = (direction: 'left' | 'right' | 'up') => {
    const t = SWIPE_THRESHOLD
    if (direction === 'left') return Math.min(Math.max(-swipeX / t, 0), 1)
    if (direction === 'right') return Math.min(Math.max(swipeX / t, 0), 1)
    if (direction === 'up') return Math.min(Math.max(-swipeY / t, 0), 1)
    return 0
  }

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
          <div className="text-5xl mb-4">🎉</div>
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
            <button onClick={() => { setIndex(0); setDone(false); setSessionStats({ again: 0, good: 0, easy: 0 }); setCardAnim('card-enter') }} className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition-colors">Review Again</button>
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
      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-8">
        <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col justify-center">
        <div
          className={`card-container ${cardAnim} ${isSwiping ? 'swiping' : ''} relative`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={isSwiping ? {
            transform: `translateX(${swipeX}px) translateY(${Math.min(swipeY, 0)}px) rotate(${swipeX * 0.05}deg)`,
          } : {}}
        >
          {/* Swipe indicators */}
          {showAnswer && (
            <>
              <div className="swipe-indicator left" style={{ opacity: swipeIndicatorOpacity('left') }}>Again</div>
              <div className="swipe-indicator right" style={{ opacity: swipeIndicatorOpacity('right') }}>Easy</div>
              <div className="swipe-indicator up" style={{ opacity: swipeIndicatorOpacity('up') }}>Good</div>
            </>
          )}

          {/* Flip card */}
          <div className="flip-card" onClick={!showAnswer ? handleFlip : undefined}>
            <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
              {/* Front - Question only */}
              <div className="flip-card-front bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 cursor-pointer">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-500">Week {current.week_number}</span>
                  {current.tags && current.tags.length > 0 && (
                    <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">{current.tags[0]}</span>
                  )}
                </div>
                <h2 className="text-xl font-semibold leading-relaxed">{current.question}</h2>
                {!showAnswer && (
                  <p className="text-xs text-slate-500 mt-6 text-center">Tap card or press Space to reveal</p>
                )}
              </div>

              {/* Back - Question + Answer */}
              <div className="flip-card-back bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-500">Week {current.week_number}</span>
                  {current.tags && current.tags.length > 0 && (
                    <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">{current.tags[0]}</span>
                  )}
                </div>
                <h2 className="text-xl font-semibold leading-relaxed">{current.question}</h2>
                <div className="mt-6 pt-6 border-t border-slate-700/50">
                  <p className="text-slate-300 leading-relaxed">{current.answer}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6">
          {!showAnswer ? (
            <button
              onClick={handleFlip}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-lg transition-colors"
            >
              Show Answer <span className="kbd-hint ml-2">Space</span>
            </button>
          ) : (
            <>
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
              <div className="flex justify-center gap-4 mt-3">
                <span className="text-xs text-slate-500"><span className="kbd-hint">1</span> Again</span>
                <span className="text-xs text-slate-500"><span className="kbd-hint">2</span> Good</span>
                <span className="text-xs text-slate-500"><span className="kbd-hint">3</span> Easy</span>
              </div>
              <p className="text-xs text-slate-600 text-center mt-2">or swipe: left = Again, up = Good, right = Easy</p>
            </>
          )}
        </div>
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
