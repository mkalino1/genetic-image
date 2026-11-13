import type { FitnessMetric } from '../../config'
import type { FitnessTarget } from '../fitnessTarget'
import { calculateDeltaEPixelError } from './deltaE'
import { calculateRgbMeanSquaredPixelError } from './rgbMeanSquared'

export type PixelErrorFn = (r: number, g: number, b: number, pixel: number) => number

export function createPixelErrorFunction(metric: FitnessMetric, target: FitnessTarget): PixelErrorFn {
  if (metric === 'rgbMeanSquared') {
    return (r, g, b, pixel) => {
      const offset = pixel * 4
      return calculateRgbMeanSquaredPixelError(
        r,
        g,
        b,
        target.rgb[offset]!,
        target.rgb[offset + 1]!,
        target.rgb[offset + 2]!,
        target.weights[pixel]!
      )
    }
  }

  return (r, g, b, pixel) => {
    const offset = pixel * 3
    return calculateDeltaEPixelError(
      r,
      g,
      b,
      target.lab[offset]!,
      target.lab[offset + 1]!,
      target.lab[offset + 2]!,
      target.weights[pixel]!
    )
  }
}
