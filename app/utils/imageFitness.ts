export function calculateFitness(imageData: ImageData, targetImageData: ImageData): number {
  // Hybrid fitness: combine SSIM and pixel-wise
  const ssim = compareImagesSSIM(imageData, targetImageData)
  const pixel = compareImagesEuclidean(imageData, targetImageData)
  return 0.7 * ssim + 0.3 * pixel
}