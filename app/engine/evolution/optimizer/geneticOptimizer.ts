import { createNewGeneration } from '../geneticOperations'
import type { Individual } from '../populationCreation'
import type { Optimizer, OptimizerContext } from './optimizerFactory'

export class GeneticOptimizer implements Optimizer {
  async refinePopulation(population: Individual[], _context: OptimizerContext): Promise<Individual[]> {
    return population
  }

  createNextGeneration(population: Individual[], context: OptimizerContext): Individual[] {
    return createNewGeneration(
      population,
      context.populationSize,
      context.eliteSize,
      context.shapesPerIndividual,
      context.mutationRate,
      context.crossoverStrategy,
      context.bestFitness,
      context.shapeMode,
      context.errorMap,
      context.targetImageData
    )
  }
}
