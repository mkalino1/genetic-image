import type { Individual, RankedIndividual } from './populationCreation'
import type { GenerationProfilingSummary } from '../../web-workers/workerTypes'

export interface EvolutionSnapshot {
  readonly bestIndividual: Individual | null
  readonly populationSamples: readonly RankedIndividual[]
  readonly bestErrorMap: Float32Array | null
  readonly generation: number
  readonly bestFitness: number
  readonly fitnessVariance: number
  readonly profiling: GenerationProfilingSummary | null
}
