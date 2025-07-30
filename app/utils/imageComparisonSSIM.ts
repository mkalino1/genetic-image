/**
 * Compares two images using a structural similarity (SSIM)-like metric.
 * Returns a fitness score between 0 and 1, where 1 is a perfect match.
 * @param {ImageData} evolvedImageData - The image data of the evolved image from canvas context.
 * @param {ImageData} targetImageData - The image data of the target image from canvas context.
 * @returns {number} SSIM-like fitness score (0-1)
 */
export function compareImagesSSIM(evolvedImageData: ImageData, targetImageData: ImageData): number {
  const targetData = targetImageData.data
  const evolvedData = evolvedImageData.data
  // Convert to grayscale for structural comparison
  const targetGray = toGrayscale(targetData)
  const evolvedGray = toGrayscale(evolvedData)
  // Calculate SSIM-like metric
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