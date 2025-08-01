/**
 * Evaluates the fitness of all individuals in a population by comparing their rendered images to a target image.
 * 
 * @param population - Array of individuals to evaluate
 * @param canvas - The HTML canvas element used for rendering
 * @param ctx - The 2D canvas rendering context
 * @param targetImageData - The target image data to compare against
 */
export function evaluatePopulation(population: Individual[], canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, targetImageData: ImageData): void {
  for (const individual of population) {
    // Clears the canvas to ensure a fresh rendering
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Renders the individual's shapes to the canvas
    renderIndividual(individual, ctx)
    // Captures the rendered image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    individual.fitness = calculateFitness(imageData, targetImageData)
  }
}

function calculateFitness(imageData: ImageData, targetImageData: ImageData): number {
  // Hybrid fitness: combine SSIM and pixel-wise
  const ssim = compareImagesSSIM(imageData, targetImageData)
  const pixel = compareImagesEuclidean(imageData, targetImageData)
  return 0.7 * ssim + 0.3 * pixel
}