/**
 * Compares two images using pixel-wise color difference.
 * Returns a fitness score between 0 and 1, where 1 is a perfect match.
 * @param {ImageData} evolvedImageData - The image data of the evolved image from canvas context.
 * @param {ImageData} targetImageData - The image data of the target image from canvas context.
 * @returns {number} Fitness score (0-1)
*/
export function compareImagesEuclidean(evolvedImageData: ImageData, targetImageData: ImageData): number {
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