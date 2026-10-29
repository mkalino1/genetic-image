import { FITNESS_CONFIG } from './imageEvolutionConfig'

export const FITNESS_DELTA_E_SCALE = FITNESS_CONFIG.deltaEScale

export function fitnessFromAverageDeltaE(averageDeltaE: number): number {
  return 1 / (1 + averageDeltaE / FITNESS_DELTA_E_SCALE)
}

export function averageDeltaEFromFitness(fitness: number): number {
  if (fitness === 0) return Number.POSITIVE_INFINITY
  return FITNESS_DELTA_E_SCALE * (1 / fitness - 1)
}
