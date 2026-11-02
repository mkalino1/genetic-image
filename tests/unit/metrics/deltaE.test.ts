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
    const evolvedImageData = {
      data: new Uint8ClampedArray([60, 120, 200, 255]),
      width: 1,
      height: 1
    } as ImageData
    const targetLab = convertImageToLab(targetImageData)
    const evolvedLab = convertImageToLab(evolvedImageData)
    const deltaL = targetLab[0]! - evolvedLab[0]!
    const deltaA = targetLab[1]! - evolvedLab[1]!
    const deltaB = targetLab[2]! - evolvedLab[2]!
    const deltaESquared = deltaL ** 2 + deltaA ** 2 + deltaB ** 2

    expect(calculateDeltaEFitness(
      evolvedImageData.data,
      targetLab,
      new Float32Array([1]),
      1
    )).toBeCloseTo(1 / (1 + deltaESquared / 10_000))
  })
})
