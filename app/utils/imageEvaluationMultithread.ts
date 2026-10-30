import type { FitnessProfilingMetrics } from '../workers/workerTypes'
import { cloneIndividual } from './populationCreation'
import { mutateOneShape } from './geneticOperations'

/**
 * Evaluates, renders, and scores the population in parallel using Web Workers.
 */
export async function evaluatePopulation(
  population: Individual[],
  targetImageData: ImageData,
  workerPool: Pick<WorkerPool, 'calculateFitnessBatches'>,
  onProfile?: (profile: FitnessProfilingMetrics) => void
): Promise<void> {
  const individualsToProcess = population.map((individual, individualId) => ({
    individualId,
    shapes: individual.shapes
  }))

  const fitnessResults = onProfile
    ? await workerPool.calculateFitnessBatches(individualsToProcess, targetImageData, onProfile)
    : await workerPool.calculateFitnessBatches(individualsToProcess, targetImageData)
  
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

export async function hillClimbIndividuals(
  individuals: Individual[],
  attempts: number,
  targetImageData: ImageData,
  workerPool: Pick<WorkerPool, 'calculateFitnessBatches'>
): Promise<Individual[]> {
  const improvedIndividuals = individuals.map(cloneIndividual)
  const candidatesByIndividual = improvedIndividuals.map(() => [] as Individual[])
  const attemptCount = Math.max(0, Math.floor(attempts))

  for (let attempt = 0; attempt < attemptCount; attempt++) {
    for (let index = 0; index < improvedIndividuals.length; index++) {
      const individual = improvedIndividuals[index]
      const candidates = candidatesByIndividual[index]
      if (!individual || !candidates) continue

      const candidate = cloneIndividual(individual)
      mutateOneShape(candidate)
      candidates.push(candidate)
    }
  }

  const allCandidates = candidatesByIndividual.flat()
  if (allCandidates.length > 0) {
    await evaluatePopulation(allCandidates, targetImageData, workerPool)

    for (let index = 0; index < improvedIndividuals.length; index++) {
      let best = improvedIndividuals[index]
      const candidates = candidatesByIndividual[index]
      if (!best || !candidates) continue

      for (const candidate of candidates) {
        if (candidate.fitness > best.fitness) {
          best = candidate
        }
      }
      improvedIndividuals[index] = best
    }
  }

  return improvedIndividuals
}