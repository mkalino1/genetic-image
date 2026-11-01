/// <reference types="vitest/globals" />

import { calculateDeltaEFitness, convertImageToLab } from '../../../app/utils/metrics/deltaE'

describe('Delta E fitness metric', () => {
  it('returns maximum fitness when the images match', () => {
    const targetImageData = {
      data: new Uint8ClampedArray([40, 120, 200, 255]),
      width: 1,
      height: 1
    } as ImageData
    const targetLab = convertImageToLab(targetImageData)

    expect(calculateDeltaEFitness(
      targetImageData.data,
      targetLab,
      new Float32Array([1]),
      1
    )).toBe(1)
  })

  it('reduces fitness when the RGB pixels differ', () => {
    const targetImageData = {
      data: new Uint8ClampedArray([40, 120, 200, 255]),
      width: 1,
      height: 1
    } as ImageData
    const targetLab = convertImageToLab(targetImageData)

    expect(calculateDeltaEFitness(
      new Uint8ClampedArray([60, 120, 200, 255]),
      targetLab,
      new Float32Array([1]),
      1
    )).toBeLessThan(1)
  })
})
