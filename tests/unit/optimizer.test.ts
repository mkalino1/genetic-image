/// <reference types="vitest/globals" />

import type { FitnessTask } from '../../app/web-workers/workerTypes'
import { createOptimizer } from '../../app/engine/evolution/optimizer/optimizerFactory'
import { GeneticOptimizer } from '../../app/engine/evolution/optimizer/geneticOptimizer'
import { MemeticOptimizer } from '../../app/engine/evolution/optimizer/memeticOptimizer'
import type { OptimizerContext } from '../../app/engine/evolution/optimizer/optimizerFactory'
import type { Individual } from '../../app/engine/evolution/populationCreation'

function createContext(
  calculateFitnessBatches: (individuals: FitnessTask[]) => Promise<Map<number, number>>,
  eliteSize = 1
): OptimizerContext {
  return {
    targetImageData: {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray(4)
    } as ImageData,
    shapeTargetImageData: {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray(4)
    },
    workerPool: { calculateFitnessBatches },
    fitnessMetric: 'deltaE',
    populationSize: 1,
    eliteSize,
    shapesPerIndividual: 0,
    mutationRate: 0,
    crossoverStrategy: 'uniform',
    bestFitness: 0,
    shapeMode: 'fixed'
  }
}

describe('optimizer selection', () => {
  it('creates the selected algorithm optimizer', () => {
    expect(createOptimizer('genetic')).toBeInstanceOf(GeneticOptimizer)
    expect(createOptimizer('memetic')).toBeInstanceOf(MemeticOptimizer)
  })

  it('keeps the genetic population unchanged during local refinement', async () => {
    const optimizer = new GeneticOptimizer()
    const population: Individual[] = [{ shapes: [], fitness: 0.5 }]

    await expect(optimizer.refinePopulation(
      population,
      createContext(async () => new Map())
    )).resolves.toBe(population)
  })

  it('refines elites in the memetic optimizer and preserves the genetic generation step', async () => {
    const optimizer = new MemeticOptimizer()
    const population: Individual[] = [{ shapes: [], fitness: 0.5 }]
    const context = createContext(async (individuals) =>
      new Map(individuals.map(({ individualId }) => [individualId, 0.9]))
    )

    const refined = await optimizer.refinePopulation(population, context)
    const nextGeneration = optimizer.createNextGeneration(refined, context)

    expect(refined[0]?.fitness).toBe(0.9)
    expect(refined[0]).not.toBe(population[0])
    expect(nextGeneration).toHaveLength(1)
  })
})
