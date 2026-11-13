import { calculateEdgeDetectionWeights } from './edgeDetectionWeights'
import { convertImageToLab } from './metrics/deltaE'
import { calculateBackgroundColor, compositeImageData } from '../image/backgroundColor'
import type { RgbColor } from '../image/backgroundColor'

export interface FitnessTarget {
  width: number
  height: number
  background: RgbColor
  backgroundCss: string
  rgb: Uint8ClampedArray<ArrayBuffer>
  lab: Float64Array
  weights: Float32Array
  totalWeight: number
}

export function prepareFitnessTarget(imageData: ImageData): FitnessTarget {
  const { width, height } = imageData
  if (width <= 0 || height <= 0 || imageData.data.length !== width * height * 4) {
    throw new RangeError('Target image dimensions do not match its pixel data')
  }

  const background = calculateBackgroundColor(imageData)
  const rgb = compositeImageData(imageData, background)
  const lab = convertImageToLab({ data: rgb })
  const weights = calculateEdgeDetectionWeights(lab, width, height)
  let totalWeight = 0
  for (const weight of weights) totalWeight += weight

  return {
    width,
    height,
    background,
    backgroundCss: `rgb(${background.r}, ${background.g}, ${background.b})`,
    rgb,
    lab,
    weights,
    totalWeight
  }
}
