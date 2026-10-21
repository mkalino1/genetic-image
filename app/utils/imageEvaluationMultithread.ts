/**
 * Evaluates, renders, and scores the population in parallel using Web Workers.
 */
export async function evaluatePopulation(
  population: Individual[],
  targetImageData: ImageData,
  workerPool: Pick<WorkerPool, 'calculateFitnessBatches'>
): Promise<void> {
  const individualsToProcess = population.map((individual, individualId) => ({
    individualId,
    shapes: individual.shapes
  }))

  const fitnessResults = await workerPool.calculateFitnessBatches(
    individualsToProcess,
    targetImageData
  )
  
  for (let i = 0; i < population.length; i++) {
    const individual = population[i]
    if (individual) {
      const fitness = fitnessResults.get(i)
      if (fitness === undefined) {
        throw new Error(`Fitness result missing for individual ${i}`)
      }
      individual.fitness = fitness
    }
  }
}