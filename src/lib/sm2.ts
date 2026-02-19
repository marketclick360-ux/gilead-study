export type Sm2State = {
  repetition: number
  interval: number
  easeFactor: number
}

export type Sm2Result = Sm2State & {
  nextReviewAt: string
}

export function sm2(
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  state: Sm2State
): Sm2Result {
  let { repetition, interval, easeFactor } = state

  if (quality < 3) {
    repetition = 0
    interval = 1
  } else {
    if (repetition === 0) interval = 1
    else if (repetition === 1) interval = 6
    else interval = Math.ceil(interval * easeFactor)
    repetition += 1
    easeFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    if (easeFactor < 1.3) easeFactor = 1.3
  }

  const next = new Date()
  next.setDate(next.getDate() + interval)

  return { repetition, interval, easeFactor, nextReviewAt: next.toISOString() }
}
