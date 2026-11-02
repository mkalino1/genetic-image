/// <reference types="vitest/globals" />

import {
  fitnessFromError,
  weightedErrorFromFitness
} from '../../app/engine/fitness/fitnessScoreConversion'

describe('fitness conversion', () => {
  it('returns the maximum fitness for a perfect match', () => {
    expect(fitnessFromError(0)).toBe(1)
  })

  it('uses the same scale for both metrics', () => {
    expect(fitnessFromError(10_000)).toBe(0.5)
  })

  it('decreases smoothly without reaching zero for finite errors', () => {
    const scores = [0, 2500, 10_000, 40_000].map(fitnessFromError)

    expect(scores[0]).toBeGreaterThan(scores[1]!)
    expect(scores[1]).toBeGreaterThan(scores[2]!)
    expect(scores[2]).toBeGreaterThan(scores[3]!)
    expect(scores[2]).toBe(0.5)
    expect(scores[3]).toBeGreaterThan(0)
  })

  it('converts fitness back to the corresponding weighted squared error', () => {
    for (const error of [0, 3, 8, 2500, 10_000, 40_000]) {
      expect(weightedErrorFromFitness(fitnessFromError(error)))
        .toBeCloseTo(error)
    }
  })

  it('treats a zero baseline fitness as unbounded error', () => {
    expect(weightedErrorFromFitness(0)).toBe(Number.POSITIVE_INFINITY)
  })
})
