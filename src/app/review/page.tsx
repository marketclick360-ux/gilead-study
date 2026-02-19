'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { sm2, Sm2State } from '@/lib/sm2'

type Card = { id: string; question: string; answer: string; week_number: number; tags: string[]; difficulty: string }

export default function ReviewPage() {
  const params = useSearchParams()
  const weekFilter = params.get('week')
  const [cards, setCards] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      let query = supabase.from('gilead_flashcards').select('*').order('week_number')
      if (weekFilter) query = query.eq('week_number', Number(weekFilter))
      else query = query.limit(20)
      const { data } = await query
      setCards(data || [])
      setLoading(false)
    }
    load()
  }, [weekFilter])

  const current = cards[index]

  const rate = (quality: 1 | 3 | 5) => {
    setShowAnswer(false)
    if (index + 1 < cards.length) setIndex(index + 1)
    else setDone(true)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>Loading cards...</p></div>
  if (cards.length === 0) return <div className="flex flex-col items-center justify-center min-h-screen"><p>No cards found.</p><Link href="/" className="mt-4 text-emerald-400 underline">Back to dashboard</Link></div>
  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Session complete!</h2>
      <p className="text-slate-400 mb-6">You reviewed {cards.length} cards.</p>
      <Link href="/" className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-semibold">Back to Dashboard</Link>
    </div>
  )

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link href="/" className="text-slate-400 hover:text-white">Back</Link>
        <span className="text-slate-500 text-sm">{index + 1} / {cards.length}</span>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[200px] flex flex-col justify-center">
        <p className="text-lg font-semibold text-center mb-4">{current.question}</p>
        {showAnswer && <p className="text-slate-300 text-center whitespace-pre-wrap border-t border-slate-700 pt-4">{current.answer}</p>}
      </div>
      {!showAnswer ? (
        <button onClick={() => setShowAnswer(true)} className="mt-6 w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold">Show Answer</button>
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <button onClick={() => rate(1)} className="py-3 rounded-lg bg-rose-600 hover:bg-rose-700 font-semibold">Again</button>
          <button onClick={() => rate(3)} className="py-3 rounded-lg bg-sky-600 hover:bg-sky-700 font-semibold">Good</button>
          <button onClick={() => rate(5)} className="py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold">Easy</button>
        </div>
      )}
    </main>
  )
}
