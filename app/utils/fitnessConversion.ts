import { FITNESS_CONFIG } from './imageEvolutionConfig'

export const FITNESS_DELTA_E_SCALE = FITNESS_CONFIG.deltaEScale

export const FITNESS_DELTA_E_POWER = FITNESS_CONFIG.deltaEPower

export function weightedPowerMeanDeltaE(
  totalWeightedPoweredDeltaE: number,
  totalWeight: number
): number {
  return totalWeight > 0
    ? Math.pow(totalWeightedPoweredDeltaE / totalWeight, 1 / FITNESS_DELTA_E_POWER)
    : 0
}

export function fitnessFromWeightedDeltaE(weightedDeltaE: number): number {
  return 1 / (1 + weightedDeltaE / FITNESS_DELTA_E_SCALE)
}

export function weightedDeltaEFromFitness(fitness: number): number {
  if (fitness === 0) return Number.POSITIVE_INFINITY
  return FITNESS_DELTA_E_SCALE * (1 / fitness - 1)
}
