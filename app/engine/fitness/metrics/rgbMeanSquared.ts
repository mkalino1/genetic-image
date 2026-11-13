import { fitnessFromError } from '../fitnessScoreConversion'

export function calculateRgbMeanSquaredFitness(
  evolvedData: Uint8ClampedArray,
  targetData: Uint8ClampedArray,
  pixelWeights: Float32Array,
  pixelCount: number,
  errorMap?: Float32Array
): number {
  let totalWeightedError = 0
  let totalWeight = 0

  for (let pixel = 0, rgbaOffset = 0; pixel < pixelCount; pixel++, rgbaOffset += 4) {
    const evolvedR = evolvedData[rgbaOffset]
    const evolvedG = evolvedData[rgbaOffset + 1]
    const evolvedB = evolvedData[rgbaOffset + 2]
    const targetR = targetData[rgbaOffset]
    const targetG = targetData[rgbaOffset + 1]
    const targetB = targetData[rgbaOffset + 2]
    const pixelWeight = pixelWeights[pixel]

    if (
      evolvedR === undefined || evolvedG === undefined || evolvedB === undefined ||
      targetR === undefined || targetG === undefined || targetB === undefined ||
      pixelWeight === undefined
    ) continue

    const weightedError = calculateRgbMeanSquaredPixelError(
      evolvedR,
      evolvedG,
      evolvedB,
      targetR,
      targetG,
      targetB,
      pixelWeight
    )

    if (errorMap) errorMap[pixel] = weightedError
    totalWeightedError += weightedError
    totalWeight += pixelWeight
  }

  const meanSquaredError = totalWeight > 0 ? totalWeightedError / totalWeight : 0
  return fitnessFromError(meanSquaredError)
}

export function calculateRgbMeanSquaredPixelError(
  r: number,
  g: number,
  b: number,
  targetR: number,
  targetG: number,
  targetB: number,
  weight: number
): number {
  const deltaR = r - targetR
  const deltaG = g - targetG
  const deltaB = b - targetB
  return ((deltaR * deltaR + deltaG * deltaG + deltaB * deltaB) / 3) * weight
}
