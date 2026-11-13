import type { ShapeRenderData } from '../engine/evolution/shape'
import type { FitnessMetric } from '../engine/config'
import type { HillClimbingParams } from '../engine/evolution/hillclimbing/hillClimber'

export interface FitnessTask {
  individualId: number
  shapes: ShapeRenderData[]
}

export interface PackedFitnessTask {
  individualId: number
  shapeOffset: number
  shapeCount: number
}

export interface PackedFitnessBatch {
  individuals: PackedFitnessTask[]
  shapes: ArrayBuffer
}

export interface FitnessResult {
  individualId: number
  fitness: number
  errorMap?: Float32Array
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
  | { type: 'batch_fitness_calculation'; batch: PackedFitnessBatch; metric: FitnessMetric; profile?: boolean; includeErrorMap?: boolean }

export type FitnessWorkerResponse =
  | { type: 'target_initialized'; success: true }
  | { type: 'batch_fitness_result'; results: FitnessResult[]; profile?: FitnessWorkerProfilingMetrics; success: true }
  | { type: 'worker_error'; error: string; success: false }

export type HillClimbingRequest =
  | { type: 'init'; targetImageData: ImageData; metric: FitnessMetric; params: HillClimbingParams }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'set_params'; params: HillClimbingParams }

export type HillClimbingResponse =
  | {
      type: 'snapshot'
      batch: PackedFitnessBatch
      fitness: number
      steps: number
      accepted: number
      shapeCount: number
      stepsPerSecond: number
      errorMap?: Float32Array
    }
  | { type: 'worker_error'; error: string }