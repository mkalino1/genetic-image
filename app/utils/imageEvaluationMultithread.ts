import type { FitnessTask } from '../workers/workerTypes'

/**
 * Evaluates the fitness of all individuals in a population using Web Workers for parallel processing.
 * 
 * @param population - Array of individuals to evaluate
 * @param canvas - The HTML canvas element used for rendering
 * @param ctx - The 2D canvas rendering context
 * @param targetImageData - The target image data to compare against
 * @param workerPool - The worker pool instance to use for fitness calculations
 */
export async function evaluatePopulation(population: Individual[], canvas: HTMLCanvasElement, ctx: OffscreenCanvasRenderingContext2D, targetImageData: ImageData, workerPool: WorkerPool): Promise<void> {
  // Prepare individuals for batch processing
  const individualsToProcess: FitnessTask[] = []
  
  for (let i = 0; i < population.length; i++) {
    const individual = population[i]
    if (!individual) continue
    // Renders the individual's shapes to the canvas
    renderIndividual(individual, ctx)
    // Captures the rendered image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    individualsToProcess.push({
      imageData,
      individualId: i
    })
  }

  // Calculate fitness for all individuals in parallel using workers
  const fitnessResults = await workerPool.calculateFitnessBatch(individualsToProcess, targetImageData)
  
  // Assign fitness results back to individuals
  for (let i = 0; i < population.length; i++) {
    const individual = population[i]
    if (individual) {
      individual.fitness = fitnessResults.get(i) || 0
    }
  }
}