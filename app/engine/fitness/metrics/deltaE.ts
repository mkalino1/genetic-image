import {
  fitnessFromError
} from '../fitnessScoreConversion'

const LAB_DELTA = 6 / 29
const LAB_DELTA_CUBE = Math.pow(LAB_DELTA, 3)
const LAB_LINEAR_SCALE = 3 * LAB_DELTA * LAB_DELTA
const LINEAR_RGB_LUT = Float64Array.from({ length: 256 }, (_, value) => {
  const normalized = value / 255
  return normalized > 0.04045
    ? Math.pow((normalized + 0.055) / 1.055, 2.4)
    : normalized / 12.92
})
const LAB_CACHE_SIZE = 1 << 14
const labCacheKeys = new Uint32Array(LAB_CACHE_SIZE)
const labCacheL = new Float64Array(LAB_CACHE_SIZE)
const labCacheA = new Float64Array(LAB_CACHE_SIZE)
const labCacheB = new Float64Array(LAB_CACHE_SIZE)

export function convertImageToLab(imageData: Pick<ImageData, 'data'>): Float64Array {
  const data = imageData.data
  const labData = new Float64Array(data.length / 4 * 3)

  for (let pixel = 0, rgbaOffset = 0; rgbaOffset < data.length; pixel++, rgbaOffset += 4) {
    const r = data[rgbaOffset]
    const g = data[rgbaOffset + 1]
    const b = data[rgbaOffset + 2]
    if (r === undefined || g === undefined || b === undefined) continue

    const rLinear = toLinearRgb(r)
    const gLinear = toLinearRgb(g)
    const bLinear = toLinearRgb(b)
    const x = rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805
    const y = rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722
    const z = rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505
    const xNorm = x / 0.95047
    const yNorm = y
    const zNorm = z / 1.08883
    const fx = xNorm > LAB_DELTA_CUBE ? Math.pow(xNorm, 1 / 3) : xNorm / LAB_LINEAR_SCALE + 4 / 29
    const fy = yNorm > LAB_DELTA_CUBE ? Math.pow(yNorm, 1 / 3) : yNorm / LAB_LINEAR_SCALE + 4 / 29
    const fz = zNorm > LAB_DELTA_CUBE ? Math.pow(zNorm, 1 / 3) : zNorm / LAB_LINEAR_SCALE + 4 / 29
    const labOffset = pixel * 3
    labData[labOffset] = 116 * fy - 16
    labData[labOffset + 1] = 500 * (fx - fy)
    labData[labOffset + 2] = 200 * (fy - fz)
  }

  return labData
}

export function calculateDeltaEFitness(
  evolvedData: Uint8ClampedArray,
  targetLab: Float64Array,
  pixelWeights: Float32Array,
  pixelCount: number,
  errorMap?: Float32Array
): number {
  let totalWeightedDeltaESquared = 0
  let totalWeight = 0

  for (let pixel = 0, rgbaOffset = 0; pixel < pixelCount; pixel++, rgbaOffset += 4) {
    const evolvedR = evolvedData[rgbaOffset]
    const evolvedG = evolvedData[rgbaOffset + 1]
    const evolvedB = evolvedData[rgbaOffset + 2]
    const evolvedA = evolvedData[rgbaOffset + 3]
    const targetL = targetLab[pixel * 3]
    const targetA = targetLab[pixel * 3 + 1]
    const targetB = targetLab[pixel * 3 + 2]

    if (
      evolvedR === undefined || evolvedG === undefined || evolvedB === undefined || evolvedA === undefined ||
      targetL === undefined || targetA === undefined || targetB === undefined
    ) continue

    const rgbKey = (evolvedR << 16) | (evolvedG << 8) | evolvedB
    const cacheIndex = Math.imul(rgbKey, 0x9e3779b1) >>> 18
    const cacheKey = rgbKey + 1
    let evolvedL: number
    let evolvedLabA: number
    let evolvedLabB: number

    if (labCacheKeys[cacheIndex] === cacheKey) {
      evolvedL = labCacheL[cacheIndex]!
      evolvedLabA = labCacheA[cacheIndex]!
      evolvedLabB = labCacheB[cacheIndex]!
    } else {
      const rLinear = toLinearRgb(evolvedR)
      const gLinear = toLinearRgb(evolvedG)
      const bLinear = toLinearRgb(evolvedB)
      const x = rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805
      const y = rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722
      const z = rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505
      const xNorm = x / 0.95047
      const yNorm = y
      const zNorm = z / 1.08883
      const fx = xNorm > LAB_DELTA_CUBE ? Math.pow(xNorm, 1 / 3) : xNorm / LAB_LINEAR_SCALE + 4 / 29
      const fy = yNorm > LAB_DELTA_CUBE ? Math.pow(yNorm, 1 / 3) : yNorm / LAB_LINEAR_SCALE + 4 / 29
      const fz = zNorm > LAB_DELTA_CUBE ? Math.pow(zNorm, 1 / 3) : zNorm / LAB_LINEAR_SCALE + 4 / 29
      evolvedL = 116 * fy - 16
      evolvedLabA = 500 * (fx - fy)
      evolvedLabB = 200 * (fy - fz)
      labCacheKeys[cacheIndex] = cacheKey
      labCacheL[cacheIndex] = evolvedL
      labCacheA[cacheIndex] = evolvedLabA
      labCacheB[cacheIndex] = evolvedLabB
    }

    const deltaL = targetL - evolvedL
    const deltaA = targetA - evolvedLabA
    const deltaB = targetB - evolvedLabB
    const pixelWeight = pixelWeights[pixel]
    if (pixelWeight === undefined) continue
    const deltaESquared = deltaL * deltaL + deltaA * deltaA + deltaB * deltaB
    const weightedError = deltaESquared * pixelWeight
    if (errorMap) errorMap[pixel] = weightedError
    totalWeightedDeltaESquared += weightedError
    totalWeight += pixelWeight
  }

  const meanWeightedDeltaESquared = totalWeight > 0
    ? totalWeightedDeltaESquared / totalWeight
    : 0
  return fitnessFromError(meanWeightedDeltaESquared)
}

function toLinearRgb(value: number): number {
  return LINEAR_RGB_LUT[value]!
}
