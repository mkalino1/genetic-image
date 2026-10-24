import type { ShapeRenderData } from '../utils/shape'

export interface FitnessTask {
  individualId: number
  shapes: ShapeRenderData[]
}

export interface FitnessResult {
  individualId: number
  fitness: number
} 

export interface FitnessWorkerProfilingMetrics {
  evaluatedIndividuals: number
  sortingMs: number
  renderingMs: number
  getImageDataMs: number
  fitnessMs: number
}

export interface FitnessProfilingMetrics extends FitnessWorkerProfilingMetrics {
  workerEvaluationWallMs: number
}

export interface GenerationProfilingMetrics extends FitnessProfilingMetrics {
  generationMs: number
}

export interface GenerationProfilingSummary {
  metrics: GenerationProfilingMetrics
  sampleCount: number
  totalGenerationMs: number
}

export type FitnessWorkerRequest =
  | { type: 'initialize_target'; targetImageData: ImageData }
  | { type: 'batch_fitness_calculation'; batch: FitnessTask[]; profile?: boolean }

export type FitnessWorkerResponse =
  | { type: 'target_initialized'; success: true }
  | { type: 'batch_fitness_result'; results: FitnessResult[]; profile?: FitnessWorkerProfilingMetrics; success: true }
  | { type: 'worker_error'; error: string; success: false }