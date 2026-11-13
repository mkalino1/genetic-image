/// <reference types="vitest/globals" />

import { calculateDeltaEFitness } from '../../../app/engine/fitness/metrics/deltaE'
import { calculateRgbMeanSquaredFitness } from '../../../app/engine/fitness/metrics/rgbMeanSquared'
import { createPixelErrorFunction } from '../../../app/engine/fitness/metrics/errorFunctionFactory'
import { prepareFitnessTarget } from '../../../app/engine/fitness/fitnessTarget'

describe('incremental pixel errors', () => {
  const imageData = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([
      20, 40, 60, 255,
      80, 120, 160, 255
    ])
  } as ImageData
  const target = prepareFitnessTarget(imageData)
  const evolved = new Uint8ClampedArray([
    70, 30, 10, 255,
    40, 140, 180, 255
  ])

  it.each(['deltaE', 'rgbMeanSquared'] as const)('matches the full %s fitness error map', metric => {
    const errorMap = new Float32Array(2)
    if (metric === 'deltaE') {
      calculateDeltaEFitness(evolved, target.lab, target.weights, 2, errorMap)
    } else {
      calculateRgbMeanSquaredFitness(evolved, target.rgb, target.weights, 2, errorMap)
    }

    const pixelError = createPixelErrorFunction(metric, target)
    for (let pixel = 0; pixel < 2; pixel++) {
      const offset = pixel * 4
      expect(pixelError(
        evolved[offset]!,
        evolved[offset + 1]!,
        evolved[offset + 2]!,
        pixel
      )).toBeCloseTo(errorMap[pixel]!, 3)
    }
  })
})
