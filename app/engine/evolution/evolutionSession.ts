import type { EvolutionParams } from '../config'
import type { EvolutionSnapshot } from './evolutionSnapshot'
import type { GenerationProfilingSummary } from '../../web-workers/workerTypes'
import { EvolutionEngine } from './evolutionEngine'
import { HillClimbingSession } from './hillclimbing/hillClimbingSession'

export interface EvolutionSession {
  readonly backgroundColor: string
  readonly latestSnapshot: EvolutionSnapshot | null
  evolve(): Promise<void>
  getAverageProfilingMetrics(): GenerationProfilingSummary | null
  cleanup(): void
}

export function createEvolutionSession(
  targetImageData: ImageData,
  params: EvolutionParams
): EvolutionSession {
  if (params.optimizer === 'hillclimbing') {
    return new HillClimbingSession(targetImageData, params)
  }
  return new EvolutionEngine(targetImageData, params)
}
