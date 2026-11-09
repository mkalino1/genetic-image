import type { FitnessProfilingMetrics } from '../../web-workers/workerTypes'
import { CANVAS_CONFIG, EVOLUTION_CONFIG } from '../config'
import type { FitnessMetric } from '../config'
import { cloneIndividual } from '../evolution/populationCreation'
import { createErrorWeightedShapeSampler, mutateOneShape } from '../evolution/geneticOperations'
import type { FitnessWorkerPool } from './fitnessWorkerPool'

/**
 * Evaluates, renders, and scores the population in parallel using Web Workers.
 */
export async function evaluatePopulation(
  population: Individual[],
  targetImageData: ImageData,
  workerPool: Pick<FitnessWorkerPool, 'calculateFitnessBatches'>,
  metric: FitnessMetric = EVOLUTION_CONFIG.defaults.fitnessMetric,
  onProfile?: (profile: FitnessProfilingMetrics) => void
): Promise<void> {
  const individualsToProcess = population.map((individual, individualId) => ({
    individualId,
    shapes: individual.shapes
  }))

  const fitnessResults = onProfile
    ? await workerPool.calculateFitnessBatches(individualsToProcess, targetImageData, metric, onProfile)
    : await workerPool.calculateFitnessBatches(individualsToProcess, targetImageData, metric)
  
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
  workerPool: Pick<FitnessWorkerPool, 'calculateFitnessBatches'>,
  metric: FitnessMetric = EVOLUTION_CONFIG.defaults.fitnessMetric,
  errorMap?: Float32Array
): Promise<Individual[]> {
  const improvedIndividuals = individuals.map(cloneIndividual)
  const candidatesByIndividual = improvedIndividuals.map(() => [] as Individual[])
  const attemptCount = Math.max(0, Math.floor(attempts))
  const shapeIndexSamplers = improvedIndividuals.map(individual => {
    return errorMap && individual.shapes.length > 0
      ? createErrorWeightedShapeSampler(
          errorMap,
          individual.shapes,
          CANVAS_CONFIG.worldSize,
          CANVAS_CONFIG.worldSize
        )
      : undefined
  })

  for (let attempt = 0; attempt < attemptCount; attempt++) {
    for (let index = 0; index < improvedIndividuals.length; index++) {
      const individual = improvedIndividuals[index]
      const candidates = candidatesByIndividual[index]
      if (!individual || !candidates) continue

      const candidate = cloneIndividual(individual)
      mutateOneShape(candidate, shapeIndexSamplers[index])
      candidates.push(candidate)
    }
  }

  const allCandidates = candidatesByIndividual.flat()
  if (allCandidates.length > 0) {
    await evaluatePopulation(allCandidates, targetImageData, workerPool, metric)

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