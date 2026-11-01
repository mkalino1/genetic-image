import { FITNESS_CONFIG } from './imageEvolutionConfig'
import type { FitnessMetric } from './imageEvolutionConfig'

export const FITNESS_DELTA_E_SCALE = FITNESS_CONFIG.deltaEScale

export const FITNESS_DELTA_E_POWER = FITNESS_CONFIG.deltaEPower

const FITNESS_METRIC_SCALES: Record<FitnessMetric, number> = {
  deltaE: FITNESS_CONFIG.deltaEScale,
  rgbMeanSquared: FITNESS_CONFIG.rgbMeanSquaredScale
}

export function fitnessErrorScale(metric: FitnessMetric): number {
  return FITNESS_METRIC_SCALES[metric]
}

export function weightedPowerMeanDeltaE(
  totalWeightedPoweredDeltaE: number,
  totalWeight: number
): number {
  return totalWeight > 0
    ? Math.pow(totalWeightedPoweredDeltaE / totalWeight, 1 / FITNESS_DELTA_E_POWER)
    : 0
}

export function fitnessFromWeightedDeltaE(weightedDeltaE: number): number {
  return fitnessFromError(weightedDeltaE, 'deltaE')
}

export function weightedDeltaEFromFitness(fitness: number): number {
  return weightedErrorFromFitness(fitness, 'deltaE')
}

export function fitnessFromError(error: number, metric: FitnessMetric): number {
  return 1 / (1 + error / FITNESS_METRIC_SCALES[metric])
}

export function weightedErrorFromFitness(fitness: number, metric: FitnessMetric): number {
  if (fitness === 0) return Number.POSITIVE_INFINITY
  return FITNESS_METRIC_SCALES[metric] * (1 / fitness - 1)
}
