import { fitnessFromError } from '../fitnessConversion'

export function calculateRgbMeanSquaredFitness(
  evolvedData: Uint8ClampedArray,
  targetData: Uint8ClampedArray,
  pixelWeights: Float32Array,
  pixelCount: number
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

    const deltaR = evolvedR - targetR
    const deltaG = evolvedG - targetG
    const deltaB = evolvedB - targetB
    const pixelError = (deltaR * deltaR + deltaG * deltaG + deltaB * deltaB) / 3

    totalWeightedError += pixelError * pixelWeight
    totalWeight += pixelWeight
  }

  const meanSquaredError = totalWeight > 0 ? totalWeightedError / totalWeight : 0
  return fitnessFromError(meanSquaredError, 'rgbMeanSquared')
}
