import type { OptimizerType } from '../../config'
import type { CrossoverStrategy, FitnessMetric, ShapeMode } from '../../config'
import type { Individual } from '../populationCreation'
import type { FitnessWorkerPool } from '../../fitness/fitnessWorkerPool'
import type { TargetImageData } from '../shapeCreation'
import { GeneticOptimizer } from './geneticOptimizer'
import { MemeticOptimizer } from './memeticOptimizer'

export interface OptimizerContext {
  targetImageData: ImageData
  shapeTargetImageData: TargetImageData
  workerPool: Pick<FitnessWorkerPool, 'calculateFitnessBatches'>
  fitnessMetric: FitnessMetric
  populationSize: number
  eliteSize: number
  shapesPerIndividual: number
  mutationRate: number
  crossoverStrategy: CrossoverStrategy
  bestFitness: number
  shapeMode: ShapeMode
  errorMap?: Float32Array
}

export interface Optimizer {
  refinePopulation(population: Individual[], context: OptimizerContext): Promise<Individual[]>
  createNextGeneration(population: Individual[], context: OptimizerContext): Individual[]
}

export function createOptimizer(type: OptimizerType): Optimizer {
  switch (type) {
    case 'genetic':
      return new GeneticOptimizer()
    case 'memetic':
      return new MemeticOptimizer()
    case 'hillclimbing':
      throw new Error('Hill climbing runs as a dedicated session, not a population optimizer')
  }
}
