/// <reference types="vitest/globals" />

import { calculatePixelWeights } from '../../app/utils/pixelWeights'

describe('calculatePixelWeights', () => {
  it('assigns the base weight to pixels in a uniform image', () => {
    const targetLab = new Float64Array(4 * 3 * 3).fill(50)

    expect(calculatePixelWeights(targetLab, 4, 3)).toEqual(new Float32Array(12).fill(1))
  })

  it('gives higher weights to luminance and color edges, bounded at two', () => {
    const width = 5
    const height = 3
    const targetLab = new Float64Array(width * height * 3)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 3
        targetLab[offset] = x < 2 ? 0 : 100
        targetLab[offset + 1] = x < 2 ? 0 : 100
      }
    }

    const weights = calculatePixelWeights(targetLab, width, height)

    expect(weights[1]).toBeGreaterThan(1)
    expect(weights[2]).toBeGreaterThan(1)
    expect(Math.max(...weights)).toBe(2)
    expect(weights[0]).toBe(1)
    expect(weights[4]).toBe(1)
  })

  it('rejects target data whose dimensions do not match', () => {
    expect(() => calculatePixelWeights(new Float64Array(3), 2, 2)).toThrow(RangeError)
  })
})
