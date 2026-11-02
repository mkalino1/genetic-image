export const FITNESS_ERROR_SCALE = 10_000

export function fitnessFromError(error: number): number {
  return 1 / (1 + error / FITNESS_ERROR_SCALE)
}

export function weightedErrorFromFitness(fitness: number): number {
  if (fitness === 0) return Number.POSITIVE_INFINITY
  return FITNESS_ERROR_SCALE * (1 / fitness - 1)
}
