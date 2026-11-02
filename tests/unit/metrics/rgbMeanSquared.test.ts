/// <reference types="vitest/globals" />

import { calculateRgbMeanSquaredFitness } from '../../../app/engine/fitness/metrics/rgbMeanSquared'

describe('mean squared RGB fitness metric', () => {
  it('uses pixel weights when calculating fitness from RGB channel errors', () => {
    const evolved = new Uint8ClampedArray([
      10, 20, 30, 255,
      200, 100, 50, 255
    ])
    const target = new Uint8ClampedArray([
      0, 0, 0, 255,
      100, 100, 100, 255
    ])

    const fitness = calculateRgbMeanSquaredFitness(
      evolved,
      target,
      new Float32Array([1, 3]),
      2
    )

    const weightedMeanSquaredError = (1_400 + 3 * 12_500) / (3 * 4)
    expect(fitness).toBeCloseTo(1 / (1 + weightedMeanSquaredError / 10_000))
  })

  it('returns maximum fitness for a perfect match', () => {
    const pixels = new Uint8ClampedArray([40, 120, 200, 255])

    expect(calculateRgbMeanSquaredFitness(
      pixels,
      pixels,
      new Float32Array([1]),
      1
    )).toBe(1)
  })
})
