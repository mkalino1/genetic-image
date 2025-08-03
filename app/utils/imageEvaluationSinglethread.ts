import { compareImagesSSIM } from './imageComparisonSSIM'
import { compareImagesEuclidean } from './imageComparisonEuclidean'
import { renderIndividual } from './rendering'

/**
 * Fallback fitness calculation function (without workers)
 */
export function calculateFitness(imageData: ImageData, targetImageData: ImageData): number {
  // Hybrid fitness: combine SSIM and pixel-wise
  const ssim = compareImagesSSIM(imageData, targetImageData)
  const pixel = compareImagesEuclidean(imageData, targetImageData)
  return 0.5 * ssim + 0.5 * pixel
}

/**
 * Fallback population evaluation without Web Workers
 */
export async function evaluatePopulationFallback(population: Individual[], canvas: HTMLCanvasElement, ctx: OffscreenCanvasRenderingContext2D, targetImageData: ImageData): Promise<void> {
  for (const individual of population) {
    // Renders the individual's shapes to the canvas
    renderIndividual(individual, ctx)
    // Captures the rendered image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    individual.fitness = calculateFitness(imageData, targetImageData)
  }
} 