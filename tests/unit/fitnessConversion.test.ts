/// <reference types="vitest/globals" />

import {
  fitnessFromWeightedDeltaE,
  weightedDeltaEFromFitness,
  weightedPowerMeanDeltaE
} from '../../app/utils/fitnessConversion'

describe('weightedPowerMeanDeltaE', () => {
  it('mildly penalizes large pixel errors compared with the same average error', () => {
    const evenErrorMean = weightedPowerMeanDeltaE(2 * 10 ** 1.25, 2)
    const outlierErrorMean = weightedPowerMeanDeltaE(20 ** 1.25, 2)

    expect(evenErrorMean).toBeCloseTo(10)
    expect(outlierErrorMean).toBeGreaterThan(10)
    expect(outlierErrorMean).toBeLessThan(Math.sqrt(200))
    expect(fitnessFromWeightedDeltaE(outlierErrorMean))
      .toBeLessThan(fitnessFromWeightedDeltaE(evenErrorMean))
  })

  it('returns zero when there is no pixel weight', () => {
    expect(weightedPowerMeanDeltaE(0, 0)).toBe(0)
  })
})

describe('fitnessFromWeightedDeltaE', () => {
  it('returns the maximum fitness for a perfect match', () => {
    expect(fitnessFromWeightedDeltaE(0)).toBe(1)
  })

  it('decreases smoothly without reaching zero for finite errors', () => {
    const scores = [0, 50, 100, 200].map(fitnessFromWeightedDeltaE)

    expect(scores[0]).toBeGreaterThan(scores[1]!)
    expect(scores[1]).toBeGreaterThan(scores[2]!)
    expect(scores[2]).toBeGreaterThan(scores[3]!)
    expect(scores[2]).toBe(0.5)
    expect(scores[3]).toBeGreaterThan(0)
  })

  it('converts fitness back to the corresponding weighted Delta E', () => {
    for (const weightedDeltaE of [0, 3, 8, 50, 100, 200]) {
      expect(weightedDeltaEFromFitness(fitnessFromWeightedDeltaE(weightedDeltaE)))
        .toBeCloseTo(weightedDeltaE)
    }
  })

  it('treats a zero baseline fitness as unbounded error', () => {
    expect(weightedDeltaEFromFitness(0)).toBe(Number.POSITIVE_INFINITY)
  })
})
