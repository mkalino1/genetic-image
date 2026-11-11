import { EVOLUTION_CONFIG } from '../../config'
import { hillClimbIndividuals } from '../../fitness/populationEvaluation'
import type { Individual } from '../populationCreation'
import type { Optimizer, OptimizerContext } from './optimizerFactory'
import { GeneticOptimizer } from './geneticOptimizer'

export class MemeticOptimizer extends GeneticOptimizer implements Optimizer {
  override async refinePopulation(population: Individual[], context: OptimizerContext): Promise<Individual[]> {
    const attempts = EVOLUTION_CONFIG.hillClimbing.attemptsPerElite
    const eliteCount = Math.min(context.eliteSize, population.length)
    if (eliteCount === 0 || attempts <= 0) return population

    const refinedElites = await hillClimbIndividuals(
      population.slice(0, eliteCount),
      attempts,
      context.targetImageData,
      context.workerPool,
      context.fitnessMetric,
      context.errorMap
    )
    const optimizedPopulation = [...population]
    for (let index = 0; index < refinedElites.length; index++) {
      const refinedElite = refinedElites[index]
      if (refinedElite) optimizedPopulation[index] = refinedElite
    }

    return optimizedPopulation.sort((a, b) => b.fitness - a.fitness)
  }
}
