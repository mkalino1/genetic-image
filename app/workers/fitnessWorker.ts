import type { FitnessTask, FitnessResult } from './workerTypes'

// Worker message handler
self.onmessage = function(e: MessageEvent) {
  const { type, batch, targetImageData } = e.data
  
  if (type === 'batch_fitness_calculation') {
    try {
      const results: FitnessResult[] = []
      
      for (const task of batch as FitnessTask[]) {
        const { imageData, individualId } = task
        const fitness = calculateFitness(imageData, targetImageData)
        results.push({ individualId, fitness })
      } 
      self.postMessage({ type: 'batch_fitness_result', results, success: true })

    } catch (error) {
      console.error('Worker batch error:', error)
      self.postMessage({ type: 'batch_fitness_result', error: error instanceof Error ? error.message : 'Unknown error', success: false })
    }
  }
} 

function calculateFitness(imageData: ImageData, targetImageData: ImageData): number {
  // Use Delta_E perceptually-accurate color metric
  const deltaE = compareImagesDeltaE(imageData, targetImageData)
  // Use SSIM for structural similarity
  // const ssim = compareImagesSSIM(imageData, targetImageData)
  return deltaE //* 0.6 + ssim * 0.4 // Weighted combination of both metrics
}

/**
 * Compares two images using Delta E CIE76 color difference metric.
 * This measures perceived color difference the way human eyes see it.
 * Returns a fitness score between 0 and 1, where 1 is a perfect match.
 * @param {ImageData} evolvedImageData - The image data of the evolved image.
 * @param {ImageData} targetImageData - The image data of the target image.
 * @returns {number} Fitness score (0-1)
 */
function compareImagesDeltaE(evolvedImageData: ImageData, targetImageData: ImageData): number {
  const targetData = targetImageData.data
  const evolvedData = evolvedImageData.data

  let totalDeltaE = 0
  let pixelCount = 0

  // Compare each pixel using Delta E
  for (let i = 0; i < targetData.length; i += 4) {
    const targetR = targetData[i]
    const targetG = targetData[i + 1]
    const targetB = targetData[i + 2]
    const targetA = targetData[i + 3]
    const evolvedR = evolvedData[i]
    const evolvedG = evolvedData[i + 1]
    const evolvedB = evolvedData[i + 2]
    const evolvedA = evolvedData[i + 3]

    if (
      targetR === undefined || targetG === undefined || targetB === undefined || targetA === undefined ||
      evolvedR === undefined || evolvedG === undefined || evolvedB === undefined || evolvedA === undefined
    ) continue

    // Convert RGB to Lab and calculate Delta E
    const targetLab = rgbToLab(targetR, targetG, targetB)
    const evolvedLab = rgbToLab(evolvedR, evolvedG, evolvedB)

    const deltaE = Math.hypot(
      targetLab[0]! - evolvedLab[0]!,
      targetLab[1]! - evolvedLab[1]!,
      targetLab[2]! - evolvedLab[2]!
    )

    totalDeltaE += deltaE
    pixelCount++
  }

  const averageDeltaE = totalDeltaE / pixelCount
  // Scale to 0-1 fitness (lower Delta E = higher fitness)
  // A Delta E of 100 is roughly at the limit of human perception
  return Math.max(0, 1 - (averageDeltaE / 100))
}

/**
 * Convert RGB color to Lab color space.
 * Lab is device-independent and perceptually uniform.
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {number[]} [L, a, b] Lab color values
 */
function rgbToLab(r: number, g: number, b: number): number[] {
  // Step 1: Convert RGB to XYZ
  const xyz = rgbToXyz(r, g, b)
  // Step 2: Convert XYZ to Lab
  const lab = xyzToLab(xyz[0]!, xyz[1]!, xyz[2]!)
  return lab
}

/**
 * Convert RGB to XYZ color space.
 * Uses D65 illuminant (standard daylight).
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {number[]} [X, Y, Z] values
 */
function rgbToXyz(r: number, g: number, b: number): number[] {
  // Normalize RGB to 0-1
  let rLinear = r / 255
  let gLinear = g / 255
  let bLinear = b / 255

  // Apply gamma correction (sRGB)
  rLinear = rLinear > 0.04045 ? Math.pow((rLinear + 0.055) / 1.055, 2.4) : rLinear / 12.92
  gLinear = gLinear > 0.04045 ? Math.pow((gLinear + 0.055) / 1.055, 2.4) : gLinear / 12.92
  bLinear = bLinear > 0.04045 ? Math.pow((bLinear + 0.055) / 1.055, 2.4) : bLinear / 12.92

  // Transform to XYZ (using sRGB matrix with D65 illuminant)
  const x = rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805
  const y = rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722
  const z = rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505

  return [x, y, z]
}

/**
 * Convert XYZ to Lab color space.
 * Uses D65 illuminant reference white.
 * @param {number} x - X value
 * @param {number} y - Y value
 * @param {number} z - Z value
 * @returns {number[]} [L, a, b] Lab color values
 */
function xyzToLab(x: number, y: number, z: number): number[] {
  // D65 illuminant reference white point
  const refX = 0.95047
  const refY = 1.0
  const refZ = 1.08883

  // Normalize by reference white
  let xNorm = x / refX
  let yNorm = y / refY
  let zNorm = z / refZ

  // Apply nonlinear transformation
  const delta = 6 / 29
  xNorm = xNorm > Math.pow(delta, 3) ? Math.pow(xNorm, 1 / 3) : xNorm / (3 * delta * delta) + 4 / 29
  yNorm = yNorm > Math.pow(delta, 3) ? Math.pow(yNorm, 1 / 3) : yNorm / (3 * delta * delta) + 4 / 29
  zNorm = zNorm > Math.pow(delta, 3) ? Math.pow(zNorm, 1 / 3) : zNorm / (3 * delta * delta) + 4 / 29

  // Calculate Lab
  const l = 116 * yNorm - 16
  const a = 500 * (xNorm - yNorm)
  const lab_b = 200 * (yNorm - zNorm)

  return [l, a, lab_b]
}

/**
 * Compares two images using a structural similarity SSIM metric.
 * Returns a fitness score between 0 and 1, where 1 is a perfect match.
 * @param {ImageData} evolvedImageData - The image data of the evolved image from canvas context.
 * @param {ImageData} targetImageData - The image data of the target image from canvas context.
 * @returns {number} SSIM-like fitness score (0-1)
 */
function compareImagesSSIM(evolvedImageData: ImageData, targetImageData: ImageData): number {
  const targetData = targetImageData.data
  const evolvedData = evolvedImageData.data
  // Convert to grayscale for structural comparison
  const targetGray = toGrayscale(targetData)
  const evolvedGray = toGrayscale(evolvedData)
  const ssim = calculateSSIM(targetGray, evolvedGray)
  return ssim
}

function toGrayscale(imageData: Uint8ClampedArray): Float32Array {
  if (!imageData) return new Float32Array()
  const gray = new Float32Array(imageData.length / 4)
  for (let i = 0; i < imageData.length; i += 4) {
    const r = Number(imageData[i])
    const g = Number(imageData[i + 1])
    const b = Number(imageData[i + 2])
    // Convert to grayscale using luminance formula
    gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b
  }
  return gray
}

function calculateSSIM(targetGray: Float32Array, evolvedGray: Float32Array): number {
  if (!targetGray || !evolvedGray) return 0
  // Calculate means
  let targetMean = 0
  let evolvedMean = 0
  for (let i = 0; i < targetGray.length; i++) {
    targetMean += Number(targetGray[i])
    evolvedMean += Number(evolvedGray[i])
  }
  targetMean /= targetGray.length
  evolvedMean /= evolvedGray.length
  // Calculate variances and covariance
  let targetVar = 0
  let evolvedVar = 0
  let covariance = 0
  for (let i = 0; i < targetGray.length; i++) {
    const targetDiff = Number(targetGray[i]) - targetMean
    const evolvedDiff = Number(evolvedGray[i]) - evolvedMean
    targetVar += targetDiff * targetDiff
    evolvedVar += evolvedDiff * evolvedDiff
    covariance += targetDiff * evolvedDiff
  }
  targetVar /= targetGray.length
  evolvedVar /= evolvedGray.length
  covariance /= targetGray.length
  // SSIM constants
  const C1 = 0.01 * 255 * 255
  const C2 = 0.03 * 255 * 255
  // Calculate SSIM
  const numerator = (2 * targetMean * evolvedMean + C1) * (2 * covariance + C2)
  const denominator = (targetMean * targetMean + evolvedMean * evolvedMean + C1) * (targetVar + evolvedVar + C2)
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Compares two images using pixel-wise color difference.
 * Returns a fitness score between 0 and 1, where 1 is a perfect match.
 * @param {ImageData} evolvedImageData - The image data of the evolved image from canvas context.
 * @param {ImageData} targetImageData - The image data of the target image from canvas context.
 * @returns {number} Fitness score (0-1)
*/
function compareImagesEuclidean(evolvedImageData: ImageData, targetImageData: ImageData): number {
  const targetData = targetImageData.data
  const evolvedData = evolvedImageData.data

  let totalDifference = 0
  let pixelCount = 0
  // Compare each pixel
  for (let i = 0; i < targetData.length; i += 4) {
    const targetR = targetData[i]
    const targetG = targetData[i + 1]
    const targetB = targetData[i + 2]
    const targetA = targetData[i + 3]
    const evolvedR = evolvedData[i]
    const evolvedG = evolvedData[i + 1]
    const evolvedB = evolvedData[i + 2]
    const evolvedA = evolvedData[i + 3]
    if (
      targetR === undefined || targetG === undefined || targetB === undefined || targetA === undefined ||
      evolvedR === undefined || evolvedG === undefined || evolvedB === undefined || evolvedA === undefined
    ) continue
    // Calculate color difference using Euclidean distance
    totalDifference += Math.sqrt(
      Math.pow(targetR - evolvedR, 2) +
      Math.pow(targetG - evolvedG, 2) +
      Math.pow(targetB - evolvedB, 2)
    )
    pixelCount++
  }
  const averageDifference = totalDifference / pixelCount
  const maxPossibleDifference = Math.sqrt(255 * 255 * 3) // Maximum possible color difference
  return Math.max(0, 1 - (averageDifference / maxPossibleDifference))
}