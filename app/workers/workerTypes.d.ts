import type { ShapeRenderData } from '../utils/shape'

export interface FitnessTask {
  individualId: number
  shapes: ShapeRenderData[]
}

export interface FitnessResult {
  individualId: number
  fitness: number
} 

export type FitnessWorkerRequest =
  | { type: 'initialize_target'; targetImageData: ImageData }
  | { type: 'batch_fitness_calculation'; batch: FitnessTask[] }

export type FitnessWorkerResponse =
  | { type: 'target_initialized'; success: true }
  | { type: 'batch_fitness_result'; results: FitnessResult[]; success: true }
  | { type: 'worker_error'; error: string; success: false }