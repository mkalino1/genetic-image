/// <reference types="vitest/globals" />

import {
  averageDeltaEFromFitness,
  fitnessFromAverageDeltaE
} from '../../app/utils/fitnessConversion'

describe('fitnessFromAverageDeltaE', () => {
  it('returns the maximum fitness for a perfect match', () => {
    expect(fitnessFromAverageDeltaE(0)).toBe(1)
  })

  it('decreases smoothly without reaching zero for finite errors', () => {
    const scores = [0, 50, 100, 200].map(fitnessFromAverageDeltaE)

    expect(scores[0]).toBeGreaterThan(scores[1]!)
    expect(scores[1]).toBeGreaterThan(scores[2]!)
    expect(scores[2]).toBeGreaterThan(scores[3]!)
    expect(scores[2]).toBe(0.5)
    expect(scores[3]).toBeGreaterThan(0)
  })

  it('converts fitness back to the corresponding average Delta E', () => {
    for (const averageDeltaE of [0, 3, 8, 50, 100, 200]) {
      expect(averageDeltaEFromFitness(fitnessFromAverageDeltaE(averageDeltaE)))
        .toBeCloseTo(averageDeltaE)
    }
  })

  it('treats a zero baseline fitness as unbounded error', () => {
    expect(averageDeltaEFromFitness(0)).toBe(Number.POSITIVE_INFINITY)
  })
})
